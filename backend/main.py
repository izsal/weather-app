import asyncio
import json
import logging
import os

import httpx
import redis.asyncio as redis
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

load_dotenv()

app = FastAPI(title="Weather API Pro")
logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CACHE_TTL = 600  # Cache 10 menit
WEATHERAPI_KEY = os.getenv("WEATHERAPI_KEY", "").strip()
redis_client = redis.from_url(REDIS_URL, decode_responses=True)


def require_weatherapi_key():
    if not WEATHERAPI_KEY:
        raise HTTPException(
            status_code=503,
            detail="WEATHERAPI_KEY belum dikonfigurasi di file .env atau environment hosting.",
        )


async def fetch_json(client, url, params, service_name, expected_type=dict):
    for attempt in range(2):
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            break
        except httpx.HTTPStatusError as exc:
            if attempt == 0 and exc.response.status_code in {408, 500, 502, 503, 504}:
                logger.warning(
                    "Layanan %s mengembalikan HTTP %s; mencoba ulang.",
                    service_name,
                    exc.response.status_code,
                )
                await asyncio.sleep(0.3)
                continue
            raise HTTPException(
                status_code=502,
                detail=f"Layanan {service_name} mengembalikan HTTP {exc.response.status_code}.",
            ) from exc
        except (httpx.RequestError, ValueError) as exc:
            if attempt == 0:
                logger.warning(
                    "Respons dari layanan %s gagal dibaca (%s); mencoba ulang.",
                    service_name,
                    type(exc).__name__,
                )
                await asyncio.sleep(0.3)
                continue
            logger.error(
                "Respons dari layanan %s tetap gagal dibaca setelah dicoba ulang (%s).",
                service_name,
                type(exc).__name__,
            )
            raise HTTPException(
                status_code=502,
                detail=f"Tidak dapat membaca respons dari layanan {service_name}.",
            ) from exc

    if not isinstance(data, expected_type):
        raise HTTPException(
            status_code=502,
            detail=f"Respons dari layanan {service_name} tidak valid.",
        )
    return data


async def search_weatherapi_cities(query):
    require_weatherapi_key()
    async with httpx.AsyncClient(timeout=10.0) as client:
        locations = await fetch_json(
            client,
            "https://api.weatherapi.com/v1/search.json",
            {"key": WEATHERAPI_KEY, "q": query},
            "pencarian kota",
            expected_type=list,
        )
    return [
        {
            "id": item.get("id"),
            "name": item.get("name"),
            "admin1": item.get("region", ""),
            "country": item.get("country", ""),
            "latitude": item.get("lat"),
            "longitude": item.get("lon"),
        }
        for item in locations
    ]


async def fetch_weatherapi_forecast(lat, lon, city_name, country_name):
    require_weatherapi_key()
    async with httpx.AsyncClient(timeout=10.0) as client:
        data = await fetch_json(
            client,
            "https://api.weatherapi.com/v1/forecast.json",
            {
                "key": WEATHERAPI_KEY,
                "q": f"{lat},{lon}",
                "days": 3,
                "lang": "id",
                "aqi": "no",
                "alerts": "yes",
            },
            "prakiraan cuaca",
        )

    location = data.get("location") or {}
    current = data.get("current") or {}
    forecast_days = (data.get("forecast") or {}).get("forecastday") or []
    if not forecast_days:
        raise HTTPException(
            status_code=502,
            detail="Respons WeatherAPI tidak berisi prakiraan cuaca.",
        )

    current_condition = current.get("condition") or {}
    astronomy = (forecast_days[0].get("astro") or {})
    alerts = (data.get("alerts") or {}).get("alert") or []
    hourly_data = [
        hour
        for forecast_day in forecast_days
        for hour in forecast_day.get("hour", [])
    ]
    current_time = location.get("localtime", "")[:13]
    start_index = next(
        (
            i for i, hour in enumerate(hourly_data)
            if hour.get("time", "")[:13] >= current_time
        ),
        0,
    )
    hourly_forecast = [
        {
            "time": hour.get("time"),
            "temperature": hour.get("temp_c"),
            "precipitation_probability": hour.get("chance_of_rain"),
            "condition": (hour.get("condition") or {}).get("text", "Tidak diketahui"),
        }
        for hour in hourly_data[start_index:start_index + 24]
    ]
    daily_forecast = [
        {
            "date": day.get("date"),
            "condition": (day.get("day", {}).get("condition") or {}).get(
                "text", "Tidak diketahui"
            ),
            "temp_max": day.get("day", {}).get("maxtemp_c"),
            "temp_min": day.get("day", {}).get("mintemp_c"),
        }
        for day in forecast_days[1:6]
    ]
    return {
        "city": city_name or location.get("name", "Lokasi GPS Anda"),
        "country": country_name or location.get("country", ""),
        "latitude": lat,
        "longitude": lon,
        "is_day": current.get("is_day", 1),
        "temperature": current.get("temp_c"),
        "apparent_temperature": current.get("feelslike_c"),
        "humidity": current.get("humidity"),
        "wind_speed": current.get("wind_kph"),
        "uv_index": current.get("uv"),
        "sunrise": astronomy.get("sunrise"),
        "sunset": astronomy.get("sunset"),
        "last_updated": current.get("last_updated"),
        "condition": current_condition.get("text", "Tidak diketahui"),
        "hourly_forecast": hourly_forecast,
        "forecast": daily_forecast,
        "alerts": [
            {
                "headline": alert.get("headline") or alert.get("event", "Peringatan cuaca"),
                "severity": alert.get("severity", ""),
                "areas": alert.get("areas", ""),
                "description": alert.get("desc", ""),
                "instruction": alert.get("instruction", ""),
                "expires": alert.get("expires", ""),
            }
            for alert in alerts
        ],
        "cached": False,
        "source": "weatherapi",
    }


async def fetch_forecast_by_coords(
    lat: float,
    lon: float,
    city_name: str,
    country_name: str = "",
    force_refresh: bool = False,
):
    cache_key = f"weather:v4:{round(lat, 2)}:{round(lon, 2)}"
    if not force_refresh:
        try:
            cached = await redis_client.get(cache_key)
            if cached:
                data = json.loads(cached)
                data["cached"] = True
                return data
        except (redis.RedisError, json.JSONDecodeError) as exc:
            logger.warning("Cache cuaca tidak dapat dibaca (%s).", type(exc).__name__)

    result = await fetch_weatherapi_forecast(lat, lon, city_name, country_name)
    try:
        await redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
    except redis.RedisError as exc:
        logger.warning("Cache cuaca tidak dapat disimpan (%s).", type(exc).__name__)
    return result

@app.get("/api/search")
async def search_cities(q: str = ""):
    if len(q.strip()) < 2:
        return {"results": []}
    return {"results": await search_weatherapi_cities(q.strip())}

@app.get("/api/weather")
async def get_weather(city: str = "Jakarta", refresh: bool = False):
    locations = await search_weatherapi_cities(city.strip())
    if not locations:
        raise HTTPException(status_code=404, detail=f"Kota '{city}' tidak ditemukan.")
    location = locations[0]
    return await fetch_forecast_by_coords(
        location["latitude"],
        location["longitude"],
        location["name"],
        location["country"],
        force_refresh=refresh,
    )

@app.get("/api/weather/coords")
async def get_weather_by_coords(
    lat: float,
    lon: float,
    city: str = "",
    country: str = "",
    refresh: bool = False,
):
    city_name = city.strip()
    country_name = country.strip()
    return await fetch_forecast_by_coords(
        lat, lon, city_name, country_name, force_refresh=refresh
    )

if os.path.isdir("static"):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory="static", html=True), name="static")

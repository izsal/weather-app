from fastapi import FastAPI, HTTPException
import httpx
import redis.asyncio as redis
import json
import os

app = FastAPI(title="Weather API Pro")

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CACHE_TTL = 600  # Cache 10 menit
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

WEATHER_CODES = {
    0: "Cerah",
    1: "Sebagian Besar Cerah",
    2: "Berawan Sebagian",
    3: "Mendung",
    45: "Berkabut",
    48: "Kabut Beku",
    51: "Gerimis Ringan",
    53: "Gerimis Sedang",
    55: "Gerimis Lebat",
    61: "Hujan Ringan",
    63: "Hujan Sedang",
    65: "Hujan Lebat",
    80: "Hujan Lokal Ringan",
    81: "Hujan Lokal Sedang",
    82: "Hujan Lokal Deras",
    95: "Badai Petir",
}

async def fetch_forecast_by_coords(lat: float, lon: float, city_name: str, country_name: str = ""):
    cache_key = f"weather:{round(lat, 2)}:{round(lon, 2)}"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            data = json.loads(cached)
            data["cached"] = True
            return data
    except Exception:
        pass

    async with httpx.AsyncClient(timeout=10.0) as client:
        weather_res = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,is_day",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min",
                "forecast_days": 6,
                "timezone": "auto"
            }
        )
        data = weather_res.json()
        current = data.get("current", {})
        daily = data.get("daily", {})
        code = current.get("weather_code", 0)

        forecast = []
        dates = daily.get("time", [])
        codes = daily.get("weather_code", [])
        temp_maxs = daily.get("temperature_2m_max", [])
        temp_mins = daily.get("temperature_2m_min", [])

        for i in range(1, min(6, len(dates))):
            d_code = codes[i]
            forecast.append({
                "date": dates[i],
                "condition": WEATHER_CODES.get(d_code, f"Kode ({d_code})"),
                "temp_max": temp_maxs[i],
                "temp_min": temp_mins[i],
            })

        result = {
            "city": city_name,
            "country": country_name,
            "latitude": lat,
            "longitude": lon,
            "is_day": current.get("is_day", 1),
            "temperature": current.get("temperature_2m"),
            "apparent_temperature": current.get("apparent_temperature"),
            "humidity": current.get("relative_humidity_2m"),
            "wind_speed": current.get("wind_speed_10m"),
            "condition": WEATHER_CODES.get(code, f"Kode Cuaca ({code})"),
            "forecast": forecast,
            "cached": False
        }

        try:
            await redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        except Exception:
            pass

        return result

@app.get("/api/search")
async def search_cities(q: str = ""):
    if len(q.strip()) < 2:
        return {"results": []}
    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": q.strip(), "count": 5, "language": "id", "format": "json"}
        )
        items = res.json().get("results", [])
        return {
            "results": [
                {
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "admin1": item.get("admin1", ""),
                    "country": item.get("country", ""),
                    "latitude": item.get("latitude"),
                    "longitude": item.get("longitude"),
                }
                for item in items
            ]
        }

@app.get("/api/weather")
async def get_weather(city: str = "Jakarta"):
    async with httpx.AsyncClient(timeout=10.0) as client:
        geo_res = await client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city, "count": 1, "language": "id", "format": "json"}
        )
        geo_data = geo_res.json()
        if not geo_data.get("results"):
            raise HTTPException(status_code=404, detail=f"Kota '{city}' tidak ditemukan.")
        loc = geo_data["results"][0]
        return await fetch_forecast_by_coords(
            loc["latitude"], loc["longitude"], loc["name"], loc.get("country", "")
        )

@app.get("/api/weather/coords")
async def get_weather_by_coords(lat: float, lon: float):
    city_name = "Lokasi GPS Anda"
    country_name = f"{lat:.2f}, {lon:.2f}"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            rev = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lon, "format": "json"},
                headers={"User-Agent": "WeatherDashboardApp/1.0"}
            )
            addr = rev.json().get("address", {})
            city_name = addr.get("city") or addr.get("town") or addr.get("county") or addr.get("state") or city_name
            country_name = addr.get("country", country_name)
    except Exception:
        pass
    return await fetch_forecast_by_coords(lat, lon, city_name, country_name)

if os.path.isdir("static"):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory="static", html=True), name="static")

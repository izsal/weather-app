import unittest
from unittest.mock import AsyncMock, patch

import main


class WeatherApiTests(unittest.IsolatedAsyncioTestCase):
    async def test_city_search_normalizes_weatherapi_results(self):
        locations = [
            {
                "id": 1,
                "name": "Jakarta",
                "region": "Jakarta",
                "country": "Indonesia",
                "lat": -6.2,
                "lon": 106.8,
            }
        ]
        fetch = AsyncMock(return_value=locations)
        with (
            patch.object(main, "WEATHERAPI_KEY", "test-key"),
            patch.object(main, "fetch_json", fetch),
        ):
            result = await main.search_weatherapi_cities("Jakarta")

        self.assertEqual(
            result,
            [{
                "id": 1,
                "name": "Jakarta",
                "admin1": "Jakarta",
                "country": "Indonesia",
                "latitude": -6.2,
                "longitude": 106.8,
            }],
        )
        self.assertEqual(fetch.await_args.args[2]["key"], "test-key")

    async def test_weatherapi_forecast_matches_existing_response_shape(self):
        data = {
            "location": {
                "name": "Jakarta",
                "country": "Indonesia",
                "tz_id": "Asia/Jakarta",
                "localtime": "2026-11-22 11:30",
            },
            "current": {
                "is_day": 1,
                "temp_c": 30,
                "feelslike_c": 34,
                "humidity": 70,
                "wind_kph": 12,
                "uv": 5,
                "last_updated": "2026-11-22 11:15",
                "condition": {"text": "Cerah"},
            },
            "alerts": {
                "alert": [{
                    "headline": "Peringatan hujan",
                    "severity": "Moderate",
                    "desc": "Hujan lebat diperkirakan.",
                    "instruction": "Waspada.",
                    "expires": "2026-11-22T18:00:00+07:00",
                }]
            },
            "forecast": {
                "forecastday": [
                    {
                        "date": "2026-11-22",
                        "astro": {"sunrise": "05:30 AM", "sunset": "05:45 PM"},
                        "day": {"condition": {"text": "Cerah"}, "maxtemp_c": 32, "mintemp_c": 24},
                        "hour": [
                            {"time": "2026-11-22 10:00", "temp_c": 29, "feelslike_c": 31, "humidity": 68, "wind_kph": 10, "uv": 4, "chance_of_rain": 0, "precip_mm": 0, "condition": {"text": "Cerah"}},
                            {"time": "2026-11-22 11:00", "temp_c": 30, "feelslike_c": 32, "humidity": 70, "wind_kph": 12, "uv": 5, "chance_of_rain": 0, "precip_mm": 0, "condition": {"text": "Cerah"}},
                            {"time": "2026-11-22 12:00", "temp_c": 31, "feelslike_c": 33, "humidity": 72, "wind_kph": 14, "uv": 6, "chance_of_rain": 5, "precip_mm": 0.1, "condition": {"text": "Cerah"}},
                        ],
                    },
                    {
                        "date": "2026-11-23",
                        "day": {"condition": {"text": "Hujan"}, "maxtemp_c": 31, "mintemp_c": 25},
                        "hour": [],
                    },
                    {
                        "date": "2026-11-24",
                        "day": {"condition": {"text": "Berawan"}, "maxtemp_c": 30, "mintemp_c": 24},
                        "hour": [],
                    },
                ]
            },
        }
        with (
            patch.object(main, "WEATHERAPI_KEY", "test-key"),
            patch.object(main, "fetch_json", AsyncMock(return_value=data)),
        ):
            result = await main.fetch_weatherapi_forecast(-6.2, 106.8, "", "")

        self.assertEqual(result["city"], "Jakarta")
        self.assertEqual(result["country"], "Indonesia")
        self.assertEqual(result["timezone"], "Asia/Jakarta")
        self.assertEqual(result["local_time"], "2026-11-22 11:30")
        self.assertEqual(result["temperature"], 30)
        self.assertEqual(result["uv_index"], 5)
        self.assertEqual(result["sunrise"], "05:30 AM")
        self.assertEqual(result["sunset"], "05:45 PM")
        self.assertEqual(result["last_updated"], "2026-11-22 11:15")
        self.assertEqual(result["alerts"][0]["headline"], "Peringatan hujan")
        self.assertEqual([hour["time"] for hour in result["hourly_forecast"]], [
            "2026-11-22 11:00",
            "2026-11-22 12:00",
        ])
        self.assertEqual(result["hourly_forecast"][0]["apparent_temperature"], 32)
        self.assertEqual(result["hourly_forecast"][0]["humidity"], 70)
        self.assertEqual(result["hourly_forecast"][1]["rain_mm"], 0.1)
        self.assertEqual(len(result["forecast"]), 2)
        self.assertEqual(result["source"], "weatherapi")

    async def test_city_weather_uses_weatherapi_search_then_coordinates(self):
        locations = [{
            "id": 1,
            "name": "Jakarta",
            "country": "Indonesia",
            "latitude": -6.2,
            "longitude": 106.8,
        }]
        forecast = {"city": "Jakarta", "source": "weatherapi"}
        search = AsyncMock(return_value=locations)
        get_forecast = AsyncMock(return_value=forecast)
        with (
            patch.object(main, "search_weatherapi_cities", search),
            patch.object(main, "fetch_forecast_by_coords", get_forecast),
        ):
            result = await main.get_weather("Jakarta")

        self.assertEqual(result, forecast)
        get_forecast.assert_awaited_once_with(
            -6.2, 106.8, "Jakarta", "Indonesia", force_refresh=False
        )

    async def test_manual_refresh_skips_cached_forecast(self):
        forecast = {"city": "Jakarta", "cached": False}
        get_forecast = AsyncMock(return_value=forecast)
        cache_get = AsyncMock(return_value='{"city":"Jakarta","cached":true}')
        with (
            patch.object(main.redis_client, "get", cache_get),
            patch.object(main.redis_client, "setex", AsyncMock()),
            patch.object(main, "fetch_weatherapi_forecast", get_forecast),
        ):
            result = await main.fetch_forecast_by_coords(
                -6.2, 106.8, "Jakarta", "Indonesia", force_refresh=True
            )

        self.assertEqual(result, forecast)
        cache_get.assert_not_awaited()
        get_forecast.assert_awaited_once_with(-6.2, 106.8, "Jakarta", "Indonesia")


if __name__ == "__main__":
    unittest.main()

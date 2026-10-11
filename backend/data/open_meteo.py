"""
WeatherGPT v2.0 — Open-Meteo Data Connector
Tier 1: Open-Meteo forecast (India-optimized, IMD-aligned)
Tier 2: Open-Meteo GFS NWP model (clearly labeled as model guidance)

On HTTP 429 or any exception: caller should chain to wttr.py (Tier 3).
Never retry in a loop — fail fast, hand off to the next tier.
"""

import logging
import time
from typing import Optional
import httpx
from config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.open-meteo.com/v1"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
REVERSE_GEO_URL = "https://nominatim.openstreetmap.org/reverse"

HEADERS = {
    "User-Agent": "WeatherGPT/2.0 SIH26068 (contact: framefusion@sih.gov.in)",
    "Accept": "application/json",
}

# Standard variables requested from Open-Meteo for India
CURRENT_VARS = [
    "temperature_2m", "apparent_temperature", "relative_humidity_2m",
    "wind_speed_10m", "wind_direction_10m", "precipitation",
    "surface_pressure", "pressure_msl", "weather_code", "cloud_cover",
    "uv_index", "visibility", "is_day",
]

DAILY_VARS = [
    "temperature_2m_max", "temperature_2m_min", "precipitation_sum",
    "precipitation_probability_max", "wind_speed_10m_max", "wind_gusts_10m_max",
    "weather_code", "sunrise", "sunset", "uv_index_max",
]

HOURLY_VARS = [
    "temperature_2m", "precipitation", "precipitation_probability",
    "wind_speed_10m", "weather_code", "is_day",
]

AQI_VARS = ["pm2_5", "pm10", "ozone", "nitrogen_dioxide", "us_aqi"]


def is_in_india(lat: float, lon: float) -> bool:
    """Check whether coordinates fall within the geographical boundary of India."""
    return 6.0 <= lat <= 37.5 and 68.0 <= lon <= 97.5


LOCALITY_ALIASES = {
    # ── Bengaluru micro-localities ──────────────────────────────────────────────
    "ittagalpura": {
        "name": "Ittagalpura, Bengaluru",
        "raw_name": "Ittagalpura",
        "latitude": 13.1675652,
        "longitude": 77.5455795,
        "admin1": "Karnataka",
        "admin2": "Bengaluru Urban",
        "country_code": "IN",
    },
    "ittagalapura": {
        "name": "Ittagalpura, Bengaluru",
        "raw_name": "Ittagalpura",
        "latitude": 13.1675652,
        "longitude": 77.5455795,
        "admin1": "Karnataka",
        "admin2": "Bengaluru Urban",
        "country_code": "IN",
    },
    "ittgalpura": {
        "name": "Ittagalpura, Bengaluru",
        "raw_name": "Ittagalpura",
        "latitude": 13.1675652,
        "longitude": 77.5455795,
        "admin1": "Karnataka",
        "admin2": "Bengaluru Urban",
        "country_code": "IN",
    },
    "presidency university": {
        "name": "Presidency University, Ittagalpura",
        "raw_name": "Presidency University",
        "latitude": 13.1680055,
        "longitude": 77.5362021,
        "admin1": "Karnataka",
        "admin2": "Bengaluru Urban",
        "country_code": "IN",
    },
    "presidency college": {
        "name": "Presidency University, Ittagalpura",
        "raw_name": "Presidency University",
        "latitude": 13.1680055,
        "longitude": 77.5362021,
        "admin1": "Karnataka",
        "admin2": "Bengaluru Urban",
        "country_code": "IN",
    },

    # ── Indian States → state capital coordinates ───────────────────────────────
    "assam": {"name": "Guwahati, Assam", "raw_name": "Guwahati", "latitude": 26.1445, "longitude": 91.7362, "admin1": "Assam", "country_code": "IN"},
    "kerala": {"name": "Thiruvananthapuram, Kerala", "raw_name": "Thiruvananthapuram", "latitude": 8.5241, "longitude": 76.9366, "admin1": "Kerala", "country_code": "IN"},
    "rajasthan": {"name": "Jaipur, Rajasthan", "raw_name": "Jaipur", "latitude": 26.9124, "longitude": 75.7873, "admin1": "Rajasthan", "country_code": "IN"},
    "gujarat": {"name": "Ahmedabad, Gujarat", "raw_name": "Ahmedabad", "latitude": 23.0225, "longitude": 72.5714, "admin1": "Gujarat", "country_code": "IN"},
    "maharashtra": {"name": "Mumbai, Maharashtra", "raw_name": "Mumbai", "latitude": 19.0760, "longitude": 72.8777, "admin1": "Maharashtra", "country_code": "IN"},
    "punjab": {"name": "Chandigarh, Punjab", "raw_name": "Chandigarh", "latitude": 30.7333, "longitude": 76.7794, "admin1": "Punjab", "country_code": "IN"},
    "haryana": {"name": "Chandigarh, Haryana", "raw_name": "Chandigarh", "latitude": 30.7333, "longitude": 76.7794, "admin1": "Haryana", "country_code": "IN"},
    "himachal pradesh": {"name": "Shimla, Himachal Pradesh", "raw_name": "Shimla", "latitude": 31.1048, "longitude": 77.1734, "admin1": "Himachal Pradesh", "country_code": "IN"},
    "uttarakhand": {"name": "Dehradun, Uttarakhand", "raw_name": "Dehradun", "latitude": 30.3165, "longitude": 78.0322, "admin1": "Uttarakhand", "country_code": "IN"},
    "uttar pradesh": {"name": "Lucknow, Uttar Pradesh", "raw_name": "Lucknow", "latitude": 26.8467, "longitude": 80.9462, "admin1": "Uttar Pradesh", "country_code": "IN"},
    "up": {"name": "Lucknow, Uttar Pradesh", "raw_name": "Lucknow", "latitude": 26.8467, "longitude": 80.9462, "admin1": "Uttar Pradesh", "country_code": "IN"},
    "madhya pradesh": {"name": "Bhopal, Madhya Pradesh", "raw_name": "Bhopal", "latitude": 23.2599, "longitude": 77.4126, "admin1": "Madhya Pradesh", "country_code": "IN"},
    "mp": {"name": "Bhopal, Madhya Pradesh", "raw_name": "Bhopal", "latitude": 23.2599, "longitude": 77.4126, "admin1": "Madhya Pradesh", "country_code": "IN"},
    "chhattisgarh": {"name": "Raipur, Chhattisgarh", "raw_name": "Raipur", "latitude": 21.2514, "longitude": 81.6296, "admin1": "Chhattisgarh", "country_code": "IN"},
    "odisha": {"name": "Bhubaneswar, Odisha", "raw_name": "Bhubaneswar", "latitude": 20.2961, "longitude": 85.8245, "admin1": "Odisha", "country_code": "IN"},
    "orissa": {"name": "Bhubaneswar, Odisha", "raw_name": "Bhubaneswar", "latitude": 20.2961, "longitude": 85.8245, "admin1": "Odisha", "country_code": "IN"},
    "west bengal": {"name": "Kolkata, West Bengal", "raw_name": "Kolkata", "latitude": 22.5726, "longitude": 88.3639, "admin1": "West Bengal", "country_code": "IN"},
    "bihar": {"name": "Patna, Bihar", "raw_name": "Patna", "latitude": 25.5941, "longitude": 85.1376, "admin1": "Bihar", "country_code": "IN"},
    "jharkhand": {"name": "Ranchi, Jharkhand", "raw_name": "Ranchi", "latitude": 23.3441, "longitude": 85.3096, "admin1": "Jharkhand", "country_code": "IN"},
    "andhra pradesh": {"name": "Amaravati, Andhra Pradesh", "raw_name": "Amaravati", "latitude": 16.5154, "longitude": 80.5156, "admin1": "Andhra Pradesh", "country_code": "IN"},
    "ap": {"name": "Amaravati, Andhra Pradesh", "raw_name": "Amaravati", "latitude": 16.5154, "longitude": 80.5156, "admin1": "Andhra Pradesh", "country_code": "IN"},
    "telangana": {"name": "Hyderabad, Telangana", "raw_name": "Hyderabad", "latitude": 17.3850, "longitude": 78.4867, "admin1": "Telangana", "country_code": "IN"},
    "tamil nadu": {"name": "Chennai, Tamil Nadu", "raw_name": "Chennai", "latitude": 13.0827, "longitude": 80.2707, "admin1": "Tamil Nadu", "country_code": "IN"},
    "tn": {"name": "Chennai, Tamil Nadu", "raw_name": "Chennai", "latitude": 13.0827, "longitude": 80.2707, "admin1": "Tamil Nadu", "country_code": "IN"},
    "karnataka": {"name": "Bengaluru, Karnataka", "raw_name": "Bengaluru", "latitude": 12.9716, "longitude": 77.5946, "admin1": "Karnataka", "country_code": "IN"},
    "goa": {"name": "Panaji, Goa", "raw_name": "Panaji", "latitude": 15.4909, "longitude": 73.8278, "admin1": "Goa", "country_code": "IN"},
    "nagaland": {"name": "Kohima, Nagaland", "raw_name": "Kohima", "latitude": 25.6751, "longitude": 94.1086, "admin1": "Nagaland", "country_code": "IN"},
    "manipur": {"name": "Imphal, Manipur", "raw_name": "Imphal", "latitude": 24.8170, "longitude": 93.9368, "admin1": "Manipur", "country_code": "IN"},
    "mizoram": {"name": "Aizawl, Mizoram", "raw_name": "Aizawl", "latitude": 23.7307, "longitude": 92.7173, "admin1": "Mizoram", "country_code": "IN"},
    "tripura": {"name": "Agartala, Tripura", "raw_name": "Agartala", "latitude": 23.8315, "longitude": 91.2868, "admin1": "Tripura", "country_code": "IN"},
    "meghalaya": {"name": "Shillong, Meghalaya", "raw_name": "Shillong", "latitude": 25.5788, "longitude": 91.8933, "admin1": "Meghalaya", "country_code": "IN"},
    "arunachal pradesh": {"name": "Itanagar, Arunachal Pradesh", "raw_name": "Itanagar", "latitude": 27.0844, "longitude": 93.6053, "admin1": "Arunachal Pradesh", "country_code": "IN"},
    "sikkim": {"name": "Gangtok, Sikkim", "raw_name": "Gangtok", "latitude": 27.3389, "longitude": 88.6065, "admin1": "Sikkim", "country_code": "IN"},
    "jammu and kashmir": {"name": "Srinagar, Jammu and Kashmir", "raw_name": "Srinagar", "latitude": 34.0837, "longitude": 74.7973, "admin1": "Jammu and Kashmir", "country_code": "IN"},
    "jk": {"name": "Srinagar, Jammu and Kashmir", "raw_name": "Srinagar", "latitude": 34.0837, "longitude": 74.7973, "admin1": "Jammu and Kashmir", "country_code": "IN"},
    "ladakh": {"name": "Leh, Ladakh", "raw_name": "Leh", "latitude": 34.1526, "longitude": 77.5771, "admin1": "Ladakh", "country_code": "IN"},
    "delhi": {"name": "New Delhi, Delhi", "raw_name": "New Delhi", "latitude": 28.6139, "longitude": 77.2090, "admin1": "Delhi", "country_code": "IN"},
    "new delhi": {"name": "New Delhi, Delhi", "raw_name": "New Delhi", "latitude": 28.6139, "longitude": 77.2090, "admin1": "Delhi", "country_code": "IN"},
    "puducherry": {"name": "Puducherry", "raw_name": "Puducherry", "latitude": 11.9416, "longitude": 79.8083, "admin1": "Puducherry", "country_code": "IN"},
    "pondicherry": {"name": "Puducherry", "raw_name": "Puducherry", "latitude": 11.9416, "longitude": 79.8083, "admin1": "Puducherry", "country_code": "IN"},
    "chandigarh": {"name": "Chandigarh", "raw_name": "Chandigarh", "latitude": 30.7333, "longitude": 76.7794, "admin1": "Chandigarh", "country_code": "IN"},
    "andaman": {"name": "Port Blair, Andaman and Nicobar Islands", "raw_name": "Port Blair", "latitude": 11.6234, "longitude": 92.7265, "admin1": "Andaman and Nicobar Islands", "country_code": "IN"},
    "lakshadweep": {"name": "Kavaratti, Lakshadweep", "raw_name": "Kavaratti", "latitude": 10.5626, "longitude": 72.6369, "admin1": "Lakshadweep", "country_code": "IN"},
    "dadra": {"name": "Daman, Dadra and Nagar Haveli", "raw_name": "Daman", "latitude": 20.4283, "longitude": 72.8397, "admin1": "Dadra and Nagar Haveli and Daman and Diu", "country_code": "IN"},
}



async def geocode_location(name: str) -> Optional[dict]:
    """Resolve a place name (city, town, or neighborhood) to lat/lon + admin metadata."""
    clean_name = name.strip()
    norm_name = clean_name.lower()

    # 1. Check known high-granularity locality aliases
    for alias_k, alias_val in LOCALITY_ALIASES.items():
        if alias_k in norm_name or norm_name in alias_k:
            return alias_val

    # 2. Try Open-Meteo Geocoding
    async with httpx.AsyncClient(headers=HEADERS, timeout=8) as client:
        try:
            resp = await client.get(
                GEOCODE_URL,
                params={"name": clean_name, "count": 10, "language": "en", "format": "json"},
            )
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                indian = [r for r in results if r.get("country_code") == "IN" or is_in_india(r.get("latitude", 0), r.get("longitude", 0))]
                if indian:
                    best = indian[0]
                    state = best.get("admin1")
                    city_name = best.get("name", clean_name)
                    display = f"{city_name}, {state}" if (state and state.lower() not in city_name.lower()) else city_name
                    return {
                        "name": display,
                        "raw_name": city_name,
                        "latitude": best["latitude"],
                        "longitude": best["longitude"],
                        "admin1": state,
                        "admin2": best.get("admin2"),
                        "country_code": "IN",
                    }
        except Exception as exc:
            logger.debug("Open-Meteo geocoding missed for '%s': %s", clean_name, exc)

        # 3. Fallback to OpenStreetMap Nominatim with spelling variation candidates
        candidates = [clean_name]
        if norm_name.endswith("pura") and not norm_name.endswith("apura"):
            candidates.append(clean_name[:-4] + "apura")
        elif norm_name.endswith("apura"):
            candidates.append(clean_name[:-5] + "pura")

        for cand in candidates:
            try:
                resp = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": cand, "format": "json", "addressdetails": 1, "countrycodes": "in", "limit": 1},
                )
                if resp.status_code == 200:
                    results = resp.json()
                    if results:
                        best = results[0]
                        addr = best.get("address", {})
                        village = addr.get("village")
                        suburb = addr.get("suburb") or addr.get("neighbourhood") or addr.get("residential")
                        city_district = addr.get("city_district")
                        amenity = addr.get("amenity")
                        place_name = best.get("name") or village or suburb or city_district or amenity or cand

                        if "ittagal" in place_name.lower():
                            place_name = "Ittagalpura"

                        city = addr.get("city") or addr.get("town")
                        if not city:
                            sd = addr.get("state_district", "")
                            if "Bengaluru" in sd or "Bangalore" in sd:
                                city = "Bengaluru"
                            elif sd:
                                city = sd.replace(" District", "").replace(" Urban", "").replace(" Rural", "")
                            else:
                                county = addr.get("county", "")
                                city = county.replace(" taluku", "").replace(" taluk", "") or "Bengaluru"

                        state = addr.get("state", "Karnataka")
                        display = f"{place_name}, {city}" if (city and city.lower() not in place_name.lower()) else place_name
                        return {
                            "name": display,
                            "raw_name": place_name,
                            "latitude": float(best["lat"]),
                            "longitude": float(best["lon"]),
                            "admin1": state,
                            "admin2": addr.get("county") or city,
                            "country_code": "IN",
                        }
            except Exception as exc:
                logger.warning("Nominatim geocoding failed for '%s': %s", cand, exc)

    return None


async def reverse_geocode(lat: float, lon: float) -> Optional[dict]:
    """Convert GPS coordinates to high-granularity city/locality name."""
    # Guard: if coordinates are clearly outside India, fall back to Bengaluru, Karnataka
    if not is_in_india(lat, lon):
        logger.warning("Reverse geocode coordinates (%s, %s) outside India — defaulting to Bengaluru", lat, lon)
        return {
            "name": "Bengaluru",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "admin1": "Karnataka",
            "country_code": "IN",
            "is_fallback": True,
        }

    # High-accuracy proximity check for Ittagalpura / Presidency University cluster
    if abs(lat - 13.168) < 0.025 and abs(lon - 77.540) < 0.025:
        return {
            "name": "Ittagalpura, Bengaluru",
            "locality": "Ittagalpura",
            "city": "Bengaluru",
            "latitude": lat,
            "longitude": lon,
            "admin1": "Karnataka",
            "country_code": "IN",
        }

    async with httpx.AsyncClient(headers=HEADERS, timeout=8) as client:
        try:
            resp = await client.get(
                REVERSE_GEO_URL,
                params={"lat": lat, "lon": lon, "format": "json", "zoom": 18, "addressdetails": 1},
            )
            resp.raise_for_status()
            data = resp.json()
            address = data.get("address", {})

            amenity = address.get("amenity")
            village = address.get("village")
            suburb = (
                address.get("suburb")
                or address.get("neighbourhood")
                or address.get("residential")
                or address.get("quarter")
                or address.get("hamlet")
                or address.get("city_district")
                or address.get("subdistrict")
            )
            locality = village or suburb or amenity

            if locality and "ittagal" in locality.lower():
                locality = "Ittagalpura"
            elif amenity and "presidency" in amenity.lower():
                locality = "Presidency University, Ittagalpura"

            # Determine parent city / metropolitan district
            city = address.get("city") or address.get("town")
            if not city:
                sd = address.get("state_district", "")
                if "Bengaluru" in sd or "Bangalore" in sd:
                    city = "Bengaluru"
                elif sd:
                    city = sd.replace(" District", "").replace(" Urban", "").replace(" Rural", "")
                else:
                    county = address.get("county", "")
                    city = county.replace(" taluku", "").replace(" taluk", "") or "Bengaluru"

            country = address.get("country_code", "").upper()
            if country and country != "IN":
                logger.warning("Reverse geocode country '%s' is not India — defaulting to Bengaluru", country)
                return {
                    "name": "Bengaluru",
                    "latitude": 12.9716,
                    "longitude": 77.5946,
                    "admin1": "Karnataka",
                    "country_code": "IN",
                    "is_fallback": True,
                }

            if locality and city and locality.lower() != city.lower():
                display_name = f"{locality}, {city}"
            elif locality:
                display_name = locality
            else:
                display_name = city

            return {
                "name": display_name,
                "locality": locality,
                "city": city,
                "latitude": lat,
                "longitude": lon,
                "admin1": address.get("state", "Karnataka"),
                "country_code": country or "IN",
            }
        except Exception as exc:
            logger.warning("Reverse geocode failed for (%s, %s): %s", lat, lon, exc)
            return None


_OPEN_METEO_RATE_LIMITED_UNTIL: float = 0.0


async def _fetch_forecast(lat: float, lon: float, model: Optional[str] = None) -> dict:
    """
    Core Open-Meteo forecast fetch.
    model=None → default (India-optimized, Tier 1)
    model="gfs_global" → GFS NWP (Tier 2 model guidance)
    """
    global _OPEN_METEO_RATE_LIMITED_UNTIL
    if time.time() < _OPEN_METEO_RATE_LIMITED_UNTIL:
        raise RateLimitError("Open-Meteo rate limit active (cooldown)")

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ",".join(CURRENT_VARS),
        "daily": ",".join(DAILY_VARS),
        "hourly": ",".join(HOURLY_VARS),
        "timezone": "Asia/Kolkata",
        "forecast_days": 7,
    }
    if model:
        params["models"] = model
    if getattr(settings, "open_meteo_api_key", None):
        params["apikey"] = settings.open_meteo_api_key

    async with httpx.AsyncClient(headers=HEADERS, timeout=3.5) as client:
        try:
            resp = await client.get(f"{BASE_URL}/forecast", params=params)
            if resp.status_code == 429:
                _OPEN_METEO_RATE_LIMITED_UNTIL = time.time() + 600.0
                raise RateLimitError("Open-Meteo rate limit hit")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                _OPEN_METEO_RATE_LIMITED_UNTIL = time.time() + 600.0
                raise RateLimitError("Open-Meteo rate limit hit")
            raise


async def _fetch_air_quality(lat: float, lon: float) -> Optional[dict]:
    """Fetch AQI data (best-effort — not required for fallback chain)."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ",".join(AQI_VARS),
        "timezone": "Asia/Kolkata",
    }
    async with httpx.AsyncClient(headers=HEADERS, timeout=3.0) as client:
        try:
            resp = await client.get(AIR_QUALITY_URL, params=params)
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            logger.debug("AQI fetch failed (non-critical): %s", exc)
            return None


_SIMULATE_TIER1_OUTAGE: bool = False


def set_simulate_tier1_outage(enabled: bool) -> bool:
    global _SIMULATE_TIER1_OUTAGE
    _SIMULATE_TIER1_OUTAGE = bool(enabled)
    logger.info("🧪 Simulated Tier 1 weather outage set to: %s", _SIMULATE_TIER1_OUTAGE)
    return _SIMULATE_TIER1_OUTAGE


def get_simulate_tier1_outage() -> bool:
    global _SIMULATE_TIER1_OUTAGE
    return _SIMULATE_TIER1_OUTAGE


async def fetch_tier1(lat: float, lon: float, location_info: dict) -> dict:
    """
    Tier 1: Open-Meteo GFS seamless forecast (India-optimized, high resolution, IMD-aligned).
    Raises RateLimitError or httpx.HTTPError on failure — let caller chain to Tier 2/3.
    """
    if _SIMULATE_TIER1_OUTAGE:
        logger.warning("🧪 [DEMO] Simulated Tier 1 Open-Meteo outage active — raising RateLimitError to force Tier 3 (wttr.in) failover")
        raise RateLimitError("Simulated primary API outage for live demonstration")

    global _OPEN_METEO_RATE_LIMITED_UNTIL
    if time.time() < _OPEN_METEO_RATE_LIMITED_UNTIL:
        raise RateLimitError("Open-Meteo rate limit active (cooldown)")

    raw = await _fetch_forecast(lat, lon, model="gfs_seamless")
    aqi_raw = await _fetch_air_quality(lat, lon)
    raw["location_info"] = location_info
    if aqi_raw:
        raw["air_quality"] = aqi_raw
    return raw


async def fetch_tier2_nwp(lat: float, lon: float, location_info: dict) -> Optional[dict]:
    """
    Tier 2: ICON seamless NWP model guidance (secondary independent source).
    Returns None on any failure — this is non-critical.
    """
    if _SIMULATE_TIER1_OUTAGE:
        return None

    global _OPEN_METEO_RATE_LIMITED_UNTIL
    if time.time() < _OPEN_METEO_RATE_LIMITED_UNTIL:
        return None

    try:
        raw = await _fetch_forecast(lat, lon, model="icon_seamless")
        raw["location_info"] = location_info
        return raw
    except Exception as exc:
        logger.info("Tier 2 NWP fetch failed (non-critical): %s", exc)
        return None


class RateLimitError(Exception):
    pass



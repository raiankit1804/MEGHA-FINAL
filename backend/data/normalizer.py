"""
WeatherGPT v2.0 — Data Normalizer
Converts raw API responses from any tier into the shared WeatherRecord and WarningRecord schemas.
CRITICAL: All null/NaN guards live here. Nothing undefined ever leaves this module.
"""

from datetime import datetime, timezone
from typing import Any, Optional
import math


# ─── Shared Data Contracts ────────────────────────────────────────────────────

def safe_float(value: Any, fallback: float = 0.0) -> float:
    """Convert any value to float, returning fallback for None/NaN/invalid."""
    try:
        result = float(value)
        return fallback if math.isnan(result) or math.isinf(result) else result
    except (TypeError, ValueError):
        return fallback


def safe_int(value: Any, fallback: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return fallback


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── WMO Weather Code Mapping ─────────────────────────────────────────────────

WMO_CODES: dict[int, tuple[str, str]] = {
    0: ("Clear sky", "☀️"),
    1: ("Mainly clear", "🌤️"),
    2: ("Partly cloudy", "⛅"),
    3: ("Overcast", "☁️"),
    45: ("Foggy", "🌫️"),
    48: ("Icy fog", "🌫️"),
    51: ("Light drizzle", "🌦️"),
    53: ("Moderate drizzle", "🌦️"),
    55: ("Dense drizzle", "🌧️"),
    61: ("Slight rain", "🌧️"),
    63: ("Moderate rain", "🌧️"),
    65: ("Heavy rain", "🌧️"),
    71: ("Slight snowfall", "❄️"),
    73: ("Moderate snowfall", "❄️"),
    75: ("Heavy snowfall", "❄️"),
    77: ("Snow grains", "❄️"),
    80: ("Slight showers", "🌦️"),
    81: ("Moderate showers", "🌧️"),
    82: ("Violent showers", "⛈️"),
    85: ("Slight snow showers", "🌨️"),
    86: ("Heavy snow showers", "🌨️"),
    95: ("Thunderstorm", "⛈️"),
    96: ("Thunderstorm with hail", "⛈️"),
    99: ("Thunderstorm with heavy hail", "⛈️"),
}


def wmo_description(code: int, is_day: Optional[int] = 1) -> str:
    if is_day == 0:
        if code == 0: return "Clear night"
        if code == 1: return "Mainly clear"
        if code == 2: return "Partly cloudy"
    return WMO_CODES.get(code, ("Unknown", "🌡️"))[0]


def wmo_emoji(code: int, is_day: Optional[int] = 1) -> str:
    if is_day == 0:
        if code in (0, 1): return "🌙"
        if code == 2: return "☁️"
    return WMO_CODES.get(code, ("Unknown", "🌡️"))[1]


def resolve_weather_condition(
    code: int,
    cloud_cover: int = 0,
    precipitation: float = 0.0,
    is_day: int = 1,
) -> tuple[int, str, str]:
    """
    Cross-validates WMO weather code against real physical sensors (cloud cover, precipitation, day/night).
    Prevents reporting 'Clear sky' when it is actually overcast (e.g. 80-100% clouds) or raining.
    Returns (adjusted_code, condition_text, emoji).
    """
    adjusted_code = code

    # Precipitation overrides clear / mainly clear / partly cloudy
    if precipitation >= 2.5:
        adjusted_code = 65  # Heavy rain
    elif precipitation >= 0.8:
        adjusted_code = 63  # Moderate rain
    elif precipitation >= 0.2:
        adjusted_code = 61  # Slight rain
    elif precipitation > 0.0:
        adjusted_code = 51  # Light drizzle
    elif adjusted_code in (0, 1) and cloud_cover >= 80:
        adjusted_code = 3   # Overcast
    elif adjusted_code == 0 and cloud_cover >= 50:
        adjusted_code = 2   # Partly cloudy
    elif adjusted_code == 0 and cloud_cover >= 20:
        adjusted_code = 1   # Mainly clear

    desc = wmo_description(adjusted_code, is_day)
    emoji = wmo_emoji(adjusted_code, is_day)
    return adjusted_code, desc, emoji


# ─── AQI Categorization ──────────────────────────────────────────────────────

def categorize_us_aqi(aqi: float) -> str:
    if aqi <= 50: return "Good"
    elif aqi <= 100: return "Moderate"
    elif aqi <= 150: return "Unhealthy for Sensitive Groups"
    elif aqi <= 200: return "Unhealthy"
    elif aqi <= 300: return "Very Unhealthy"
    return "Hazardous"


def categorize_uv(uv: float) -> str:
    if uv < 3: return "Low"
    elif uv < 6: return "Moderate"
    elif uv < 8: return "High"
    elif uv < 11: return "Very High"
    return "Extreme"


# ─── Model Agreement ─────────────────────────────────────────────────────────

def compute_model_agreement(imd_value: Optional[float], nwp_value: Optional[float]) -> str:
    """Compare Tier 1 (IMD-aligned) and Tier 2 (NWP/GFS) values for same metric."""
    if imd_value is None or nwp_value is None:
        return "not_applicable"
    diff = abs(imd_value - nwp_value)
    # Temperature: within 1°C = high, 1-3°C = moderate, >3°C = low
    # We use a generic ±5% threshold relative to magnitude
    magnitude = max(abs(imd_value), abs(nwp_value), 1.0)
    relative_diff = diff / magnitude
    if relative_diff < 0.05:
        return "high"
    elif relative_diff < 0.15:
        return "moderate"
    return "low"


# ─── Normalized WeatherRecord ─────────────────────────────────────────────────

def make_weather_record(
    location_name: str,
    latitude: float,
    longitude: float,
    metric: str,
    value: Any,
    unit: str,
    source: str,
    data_type: str,
    valid_time: str,
    retrieved_at: Optional[str] = None,
    model_agreement: str = "not_applicable",
    confidence: str = "high",
    state: Optional[str] = None,
    district: Optional[str] = None,
) -> dict:
    return {
        "location_name": location_name,
        "latitude": safe_float(latitude),
        "longitude": safe_float(longitude),
        "state": state,
        "district": district,
        "metric": metric,
        "value": safe_float(value),
        "unit": unit,
        "valid_time": valid_time,
        "source": source,
        "type": data_type,
        "model_agreement": model_agreement,
        "confidence": confidence,
        "retrieved_at": retrieved_at or now_utc(),
    }


# ─── Lifestyle & Activity Suitability ─────────────────────────────────────────

def format_hourly_label(iso_time_str: str) -> str:
    """Format an ISO time string like '2026-09-14T21:00' to '9 PM'."""
    try:
        if "T" in iso_time_str:
            hour_str = iso_time_str.split("T")[1].split(":")[0]
            hour = int(hour_str)
            suffix = "AM" if hour < 12 else "PM"
            display_hour = hour % 12
            if display_hour == 0:
                display_hour = 12
            return f"{display_hour} {suffix}"
    except Exception:
        pass
    return iso_time_str


def compute_activities_index(current: dict, aqi: Optional[dict]) -> dict:
    """
    Deterministic suitability calculation for popular outdoor activities.
    Returns: { 'running': {'rating': 'Good'|'Fair'|'Poor'}, ... }
    """
    temp = current.get("temperature", 25)
    precip = current.get("precipitation", 0)
    wind = current.get("wind_speed", 10)
    code = current.get("weather_code", 0)
    us_aqi = aqi.get("us_aqi", 50) if aqi else 50

    is_storm = code in [95, 96, 99, 82]
    is_rain = precip > 0.4 or code in [51, 53, 55, 61, 63, 65, 80, 81]
    is_hot = temp > 34
    is_unhealthy_air = us_aqi > 150

    def rate_activity(name: str) -> str:
        if is_storm or is_unhealthy_air:
            return "Poor"
        if name in ["running", "jogging"]:
            if is_rain or is_hot or us_aqi > 100:
                return "Poor" if (precip > 1.2 or is_hot) else "Fair"
            return "Good"
        elif name == "cycling":
            if is_rain or wind > 28 or is_hot:
                return "Poor"
            if wind > 18 or us_aqi > 100:
                return "Fair"
            return "Good"
        elif name == "hiking":
            if is_rain or is_storm or current.get("visibility", 10) < 3.5:
                return "Poor"
            if temp > 32 or wind > 25:
                return "Fair"
            return "Good"
        return "Fair"

    return {
        "running": {"rating": rate_activity("running")},
        "jogging": {"rating": rate_activity("jogging")},
        "cycling": {"rating": rate_activity("cycling")},
        "hiking": {"rating": rate_activity("hiking")},
    }


def compute_allergies_index(aqi: Optional[dict], current: dict) -> dict:
    """
    Compute environmental allergy indicators (dust, dander, air sensitivity).
    """
    pm10 = aqi.get("pm10", 30) if aqi else 30
    pm25 = aqi.get("pm2_5", 20) if aqi else 20
    wind = current.get("wind_speed", 10)
    precip = current.get("precipitation", 0)

    # Dust and dander calculation:
    # High PM10 or gusty wind with moderate PM10 stirs airborne dust and dander.
    # Rain suppresses dust.
    if precip > 0.5:
        dust_level = "Low" if pm10 < 50 else "Moderate"
    elif pm10 > 55 or (pm10 > 38 and wind > 12):
        dust_level = "High"
    elif pm10 > 25:
        dust_level = "Moderate"
    else:
        dust_level = "Low"

    return {
        "dust_and_dander": {
            "level": dust_level,
            "pm10": pm10,
            "pm2_5": pm25,
        }
    }


def generate_tomorrow_summary(daily_forecast: list[dict]) -> str:
    """Natural sentence preview of tomorrow's weather for the Moto-style banner."""
    if len(daily_forecast) > 1:
        tom = daily_forecast[1]
        cond = tom.get("condition", "Partly cloudy")
        min_t = tom.get("temp_min")
        max_t = tom.get("temp_max")
        rain_prob = tom.get("precipitation_probability", 0)
        precip = tom.get("precipitation_sum", 0)

        phrase = f"{cond}"
        if rain_prob > 60 or precip >= 4.0:
            if precip > 4.0:
                phrase += " with thundery showers in the afternoon"
            elif precip > 0.5:
                phrase += " with a steady shower"
            else:
                phrase += " with scattered drizzle"
        elif rain_prob > 30 or precip > 0.5:
            phrase += " with a passing shower"
        else:
            phrase += " with pleasant, mostly dry conditions"

        return phrase
    return "Weather forecast updating..."


# ─── Normalize Open-Meteo Response ────────────────────────────────────────────

def normalize_open_meteo(
    raw: dict,
    location_name: str = "India",
    source_label: str = "Open-Meteo (IMD-aligned)",
    data_type: str = "forecast",
) -> dict:
    """
    Convert Open-Meteo API response to WeatherGPT internal format.
    source_label: "Open-Meteo (IMD-aligned)" for Tier 1, "Open-Meteo GFS/NWP" for Tier 2.
    data_type: "observation" or "forecast" or "model_guidance"
    """
    current = raw.get("current", {})
    daily = raw.get("daily", {})
    hourly = raw.get("hourly", {})
    loc = raw.get("location_info", {})
    retrieved = now_utc()

    lat = safe_float(loc.get("latitude", 0))
    lon = safe_float(loc.get("longitude", 0))

    # Current weather with physical sensor validation & day/night awareness
    raw_code = safe_int(current.get("weather_code"))
    cloud_cover = safe_int(current.get("cloud_cover"))
    precipitation = safe_float(current.get("precipitation"))
    is_day = safe_int(current.get("is_day", 1))

    resolved_code, resolved_condition, resolved_emoji = resolve_weather_condition(
        code=raw_code,
        cloud_cover=cloud_cover,
        precipitation=precipitation,
        is_day=is_day,
    )

    surface_press = safe_float(current.get("surface_pressure"))
    msl_press = safe_float(current.get("pressure_msl"))
    if msl_press <= 0.0:
        if surface_press > 0.0:
            # If surface pressure is low due to high elevation (e.g. Bengaluru ~920m is ~912 hPa),
            # adjust to standard sea level pressure (~1013 hPa)
            msl_press = surface_press + (100.0 if surface_press < 960.0 else 0.0)
        else:
            msl_press = 1013.25

    current_weather = {
        "temperature": safe_float(current.get("temperature_2m")),
        "feels_like": safe_float(current.get("apparent_temperature")),
        "humidity": safe_int(current.get("relative_humidity_2m")),
        "wind_speed": safe_float(current.get("wind_speed_10m")),
        "wind_direction": safe_int(current.get("wind_direction_10m")),
        "precipitation": precipitation,
        "surface_pressure": surface_press,
        "pressure_msl": msl_press,
        "weather_code": resolved_code,
        "condition": resolved_condition,
        "emoji": resolved_emoji,
        "uv_index": safe_float(current.get("uv_index")),
        "uv_category": categorize_uv(safe_float(current.get("uv_index"))),
        "cloud_cover": cloud_cover,
        "visibility": safe_float(current.get("visibility", 10000)) / 1000,  # convert m → km
        "is_day": is_day,
    }

    # AQI (from air quality sub-call if present)
    aqi_data = raw.get("air_quality", {})
    current_aqi = aqi_data.get("current", {})
    air_quality = {
        "us_aqi": safe_int(current_aqi.get("us_aqi")),
        "category": categorize_us_aqi(safe_int(current_aqi.get("us_aqi"))),
        "pm2_5": safe_float(current_aqi.get("pm2_5")),
        "pm10": safe_float(current_aqi.get("pm10")),
        "ozone": safe_float(current_aqi.get("ozone")),
        "nitrogen_dioxide": safe_float(current_aqi.get("nitrogen_dioxide")),
    } if current_aqi else None

    # Daily forecast (up to 7 days)
    daily_forecast = []
    dates = daily.get("time", [])
    for i, date in enumerate(dates[:7]):
        d_code = safe_int(daily.get("weather_code", [0] * 10)[i])
        d_precip = safe_float(daily.get("precipitation_sum", [0] * 10)[i])
        if d_precip >= 5.0 and d_code < 50:
            d_code = 65
        elif d_precip >= 1.0 and d_code < 50:
            d_code = 61
        elif d_precip > 0.0 and d_code < 50:
            d_code = 51

        daily_forecast.append({
            "date": date,
            "temp_max": safe_float(daily.get("temperature_2m_max", [None] * 10)[i]),
            "temp_min": safe_float(daily.get("temperature_2m_min", [None] * 10)[i]),
            "precipitation_sum": d_precip,
            "precipitation_probability": safe_int(daily.get("precipitation_probability_max", [0] * 10)[i]),
            "wind_speed_max": safe_float(daily.get("wind_speed_10m_max", [0] * 10)[i]),
            "wind_gusts": safe_float(daily.get("wind_gusts_10m_max", [0] * 10)[i]),
            "weather_code": d_code,
            "condition": wmo_description(d_code, 1),
            "emoji": wmo_emoji(d_code, 1),
            "sunrise": daily.get("sunrise", [None] * 10)[i],
            "sunset": daily.get("sunset", [None] * 10)[i],
            "uv_index_max": safe_float(daily.get("uv_index_max", [0] * 10)[i]),
        })

    # Hourly forecast (next 24 hours)
    hourly_times = hourly.get("time", [])[:24]
    hourly_is_days = hourly.get("is_day", [1] * 25)
    hourly_forecast = []
    for i, t in enumerate(hourly_times):
        w_code = safe_int(hourly.get("weather_code", [0] * 25)[i])
        h_is_day = safe_int(hourly_is_days[i]) if i < len(hourly_is_days) else 1
        h_precip = safe_float(hourly.get("precipitation", [0] * 25)[i])

        if h_precip >= 2.0 and w_code < 50:
            w_code = 63
        elif h_precip >= 0.2 and w_code < 50:
            w_code = 61
        elif h_precip > 0.0 and w_code < 50:
            w_code = 51

        hourly_forecast.append({
            "time": t,
            "formatted_hour": format_hourly_label(t),
            "temperature": safe_float(hourly.get("temperature_2m", [None] * 25)[i]),
            "precipitation": h_precip,
            "precipitation_probability": safe_int(hourly.get("precipitation_probability", [0] * 25)[i]),
            "wind_speed": safe_float(hourly.get("wind_speed_10m", [0] * 25)[i]),
            "weather_code": w_code,
            "is_day": h_is_day,
            "condition": wmo_description(w_code, h_is_day),
            "emoji": wmo_emoji(w_code, h_is_day),
        })

    # Lifestyle & activity evaluations
    activities = compute_activities_index(current_weather, air_quality)
    allergies = compute_allergies_index(air_quality, current_weather)
    tomorrow_summary = generate_tomorrow_summary(daily_forecast)

    return {
        "location_info": {
            "name": location_name,
            "latitude": lat,
            "longitude": lon,
            "country": "India",
            "state": loc.get("admin1"),
        },
        "current_weather": current_weather,
        "daily_forecast": daily_forecast,
        "hourly_forecast": hourly_forecast,
        "air_quality": air_quality,
        "activities": activities,
        "allergies": allergies,
        "tomorrow_summary": tomorrow_summary,
        "source": source_label,
        "type": data_type,
        "retrieved_at": retrieved,
    }


# ─── Normalize wttr.in Response ──────────────────────────────────────────────

def normalize_wttr(raw: dict, location_name: str, lat: float, lon: float) -> dict:
    """Convert wttr.in JSON response to WeatherGPT internal format."""
    retrieved = now_utc()
    current_condition = raw.get("current_condition", [{}])[0]

    temp_c = safe_float(current_condition.get("temp_C"))
    feels_like_c = safe_float(current_condition.get("FeelsLikeC"))
    humidity = safe_int(current_condition.get("humidity"))
    wind_kmph = safe_float(current_condition.get("windspeedKmph"))
    wind_dir = current_condition.get("winddir16Point", "N")
    desc_list = current_condition.get("weatherDesc", [{}])
    condition = desc_list[0].get("value", "Unknown") if desc_list else "Unknown"

    # Build daily forecast from wttr.in weather array
    daily_forecast = []
    for day in raw.get("weather", [])[:7]:
        hourly = day.get("hourly", [])
        precip_mm = sum(safe_float(h.get("precipMM")) for h in hourly)
        daily_forecast.append({
            "date": day.get("date", ""),
            "temp_max": safe_float(day.get("maxtempC")),
            "temp_min": safe_float(day.get("mintempC")),
            "precipitation_sum": round(precip_mm, 1),
            "precipitation_probability": 0,
            "wind_speed_max": max(safe_float(h.get("windspeedKmph")) for h in hourly) if hourly else 0,
            "condition": hourly[4].get("weatherDesc", [{}])[0].get("value", "N/A") if len(hourly) > 4 else condition,
            "emoji": "🌡️",
        })

    return {
        "location_info": {"name": location_name, "latitude": lat, "longitude": lon, "country": "India"},
        "current_weather": {
            "temperature": temp_c,
            "feels_like": feels_like_c,
            "humidity": humidity,
            "wind_speed": wind_kmph,
            "wind_direction_label": wind_dir,
            "condition": condition,
            "emoji": "🌡️",
            "precipitation": 0,
            "visibility": safe_float(current_condition.get("visibility")),
            "uv_index": safe_float(current_condition.get("uvIndex")),
            "uv_category": categorize_uv(safe_float(current_condition.get("uvIndex"))),
        },
        "daily_forecast": daily_forecast,
        "hourly_forecast": [],
        "air_quality": None,
        "source": "wttr.in",
        "type": "observation",
        "retrieved_at": retrieved,
    }


# ─── Normalize Synthetic Response ────────────────────────────────────────────

def normalize_synthetic(raw: dict, location_name: str, lat: float, lon: float) -> dict:
    """Wrap synthetic baseline in standard format with clear provenance flags."""
    result = raw.copy()
    result["source"] = "Synthetic Indian Climatic Baseline"
    result["type"] = "synthetic"
    result["confidence"] = "low"
    result["retrieved_at"] = now_utc()
    result["location_info"] = {"name": location_name, "latitude": lat, "longitude": lon, "country": "India"}
    result["_synthetic_warning"] = (
        "This data is a deterministic seasonal estimate. "
        "Live APIs were unreachable at the time of this query."
    )
    return result

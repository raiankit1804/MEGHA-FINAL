"""
Android-facing /v1 API (contract used by the offline-first Megha Setu Android app).

  GET  /v1/weather?lat&lon&mode   flat WeatherData JSON
  GET  /v1/marine?lat&lon         same shape, plus waves and sea temperature
  GET  /v1/metar?icao             METAR card
  GET  /v1/alerts?region|lat&lon  {source, alerts: [AlertPacket]} (Ed25519-signed when a key is configured)
  POST /v1/chat                   {answer, source, fetchedAt}
  GET  /v1/app/update             newest Android build: {versionCode, versionName, apkUrl, sha256, sizeBytes, notes}

Rules this module follows:
  * A value the upstream source does not provide is returned as null, never 0 or a default.
    (The app shows null as a dash.)
  * Alerts are signed here, server-side. The private key is read from the environment and is never
    in the repo or the app:
        ALERT_SIGNING_KEY_B64   base64 of the raw 32-byte Ed25519 seed, or
        ALERT_SIGNING_KEY_FILE  path to a PKCS8 PEM file
        ALERT_KEY_ID            key id put in each packet (default "backend-key-1")
    Without a key, alerts are served with an empty signature and the app marks them Unverified.
  * Optional auth: set ANDROID_API_KEY to require the X-API-Key header on every /v1 route.
"""
import asyncio
import base64
import hashlib
import hmac
import json
import logging
import math
import os
import pathlib
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel

from data.imd_scraper import fetch_warnings_for_location
from data.open_meteo import fetch_tier1, is_in_india, reverse_geocode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["Android v1"])

MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
METAR_URL = "https://aviationweather.gov/api/data/metar"
WEATHER_SOURCE = "Open-Meteo (IMD-aligned)"
MARINE_SOURCE = "Open-Meteo Marine"
ALERT_TTL_HOPS = 4          # mesh hops allowed for a relayed alert
ALERT_MAX_AGE_HOURS = 24    # used only when the IMD record carries no validity end
DOMAINS = {"normal", "agriculture", "aviation", "marine", "research"}
_COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]


def require_api_key(x_api_key: Optional[str] = Header(None)) -> None:
    expected = os.environ.get("ANDROID_API_KEY", "")
    if expected and not hmac.compare_digest((x_api_key or "").encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="invalid api key")


router.dependencies.append(Depends(require_api_key))


# ─── helpers ──────────────────────────────────────────────────────────────────

def _now_z() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _num(v) -> Optional[float]:
    """A finite number, or None. Missing stays missing."""
    if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
        return None
    return float(v)


def _compass(deg) -> Optional[str]:
    d = _num(deg)
    return None if d is None else _COMPASS[int(round((d % 360) / 22.5)) % 16]


def _check_india(lat: float, lon: float) -> None:
    if not is_in_india(lat, lon):
        raise HTTPException(status_code=400, detail="coordinates outside India")


def _next_hours(raw: dict, n: int) -> tuple[list[int], dict]:
    """Indices of the hourly series from the current hour onward (at most n)."""
    hourly = raw.get("hourly") or {}
    times = hourly.get("time") or []
    now_h = str((raw.get("current") or {}).get("time") or "")[:13]
    start = next((i for i, t in enumerate(times) if str(t)[:13] >= now_h), 0) if now_h else 0
    return list(range(start, min(start + n, len(times)))), hourly


def _series(hourly: dict, key: str, idx: list[int]) -> list[Optional[float]]:
    arr = hourly.get(key) or []
    return [_num(arr[i]) if i < len(arr) else None for i in idx]


async def _location_name(lat: float, lon: float) -> str:
    try:
        rev = await asyncio.wait_for(reverse_geocode(lat, lon), timeout=2.5)
        if rev and rev.get("name") and rev["name"] != "Unknown location":
            return rev["name"]
    except Exception as exc:  # name is cosmetic; never fail the request for it
        logger.debug("reverse geocode failed: %s", exc)
    return f"{lat:.2f}, {lon:.2f}"


def _aqi(raw: dict) -> Optional[float]:
    """US AQI from the air-quality sub-call, or None. Open-Meteo gives null when it has no value."""
    cur = ((raw.get("air_quality") or {}).get("current")) or {}
    v = _num(cur.get("us_aqi"))
    return v if v is not None and v >= 0 else None


def _flat_weather(raw: dict, location: str) -> dict:
    cur = raw.get("current") or {}
    idx, hourly = _next_hours(raw, 24)
    temps = [t for t in _series(hourly, "temperature_2m", idx)[:8] if t is not None]
    precip = _series(hourly, "precipitation", idx)
    probs = [p for p in _series(hourly, "precipitation_probability", idx) if p is not None]
    vis_m = _num(cur.get("visibility"))
    return {
        "source": WEATHER_SOURCE,
        "isDemo": False,
        "location": location,
        "fetchedAt": _now_z(),
        "tempC": _num(cur.get("temperature_2m")),
        "feelsLikeC": _num(cur.get("apparent_temperature")),
        "humidity": _num(cur.get("relative_humidity_2m")),
        "windKmh": _num(cur.get("wind_speed_10m")),
        "windDir": _compass(cur.get("wind_direction_10m")),
        # next 24 h from the current hour; null unless every hour is present
        "rainProb": max(probs) if probs and len(probs) == len(idx) else None,
        "rainMm24h": round(sum(precip), 1) if precip and all(p is not None for p in precip) else None,
        "pressureHpa": _num(cur.get("pressure_msl")),
        "visibilityKm": None if vis_m is None else round(vis_m / 1000, 1),
        "uvIndex": _num(cur.get("uv_index")),
        "aqi": _aqi(raw),
        "waveHeightM": None,
        "wavePeriodS": None,
        "seaTempC": None,
        "soilMoisturePct": None,
        "hourlyTemps": temps,
        "advisories": {},
    }


async def _forecast_raw(lat: float, lon: float) -> dict:
    """Open-Meteo answers a transient 5xx now and then; one retry is cheap and avoids a blank screen."""
    last: Optional[Exception] = None
    for attempt in range(2):
        try:
            return await fetch_tier1(lat, lon, {"latitude": lat, "longitude": lon})
        except Exception as exc:
            last = exc
            logger.warning("v1 forecast attempt %d failed: %r", attempt + 1, exc)
            if attempt == 0:
                await asyncio.sleep(0.8)
    raise HTTPException(status_code=502, detail="weather source unavailable") from last


# ─── weather / marine ─────────────────────────────────────────────────────────

def _g(v) -> str:
    return f"{v:g}" if isinstance(v, (int, float)) else "—"


def _advisories(w: dict) -> dict:
    """
    Rule-based advisories computed only from the values in `w` (no model, no invented figures).
    Thresholds follow the web app's risk engine: IMD rainfall classes (35.5 / 64.5 mm/day),
    Beaufort wind limits (38 / 62 / 88 km/h), WMO sea state (1.25 / 2.5 m) and the 0.8 km approach minimum.
    A topic is omitted when the data needed to judge it is missing.
    """
    out: dict[str, str] = {}
    note = " Indicative only; follow official IMD bulletins."
    rain, prob, wind, temp = w.get("rainMm24h"), w.get("rainProb"), w.get("windKmh"), w.get("tempC")
    wave, vis = w.get("waveHeightM"), w.get("visibilityKm")

    # city (general public). Thresholds follow the web app's urban risk rules: IMD heavy rain 64.5 mm/day,
    # heat above 40 °C (severe above 43 °C), unhealthy air above US AQI 150 and very unhealthy above 200.
    aqi = w.get("aqi")
    city: list[str] = []
    if temp is not None and temp > 43:
        city.append(f"Severe heat ({_g(temp)} °C): stay indoors in the afternoon and drink water often.")
    elif temp is not None and temp > 40:
        city.append(f"Very hot ({_g(temp)} °C): avoid midday sun and drink water often.")
    if rain is not None and rain > 64.5:
        city.append(f"Heavy rain expected ({_g(rain)} mm in 24 h): avoid low-lying roads and underpasses.")
    elif prob is not None and prob >= 60:
        city.append(f"Rain is likely (chance {_g(prob)}%): carry an umbrella and allow extra travel time.")
    if aqi is not None and aqi > 200:
        city.append(f"Very unhealthy air (AQI {_g(aqi)}): limit time outdoors; sensitive people should stay in.")
    elif aqi is not None and aqi > 150:
        city.append(f"Unhealthy air (AQI {_g(aqi)}): reduce long or hard outdoor activity.")
    if wind is not None and wind > 50:
        city.append(f"Strong wind ({_g(wind)} km/h): secure loose objects and take care on the road.")
    if city:
        out["city"] = " ".join(city) + note
    elif any(v is not None for v in (temp, rain, prob, aqi, wind)):
        out["city"] = "No weather hazard flagged for the next 24 h." + note

    # agriculture
    if rain is not None or prob is not None:
        if rain is not None and rain > 64.5:
            out["agriculture"] = f"Heavy rain expected ({_g(rain)} mm in 24 h). Do not spray or fertilise; clear drainage channels and protect harvested produce." + note
        elif rain is not None and rain >= 35.5:
            out["agriculture"] = f"Significant rain expected ({_g(rain)} mm in 24 h). Postpone spraying and fertiliser; keep drainage open." + note
        elif prob is not None and prob >= 60:
            out["agriculture"] = f"Rain is likely (chance {_g(prob)}%). Postpone spraying and fertiliser; check soil before irrigating." + note
        elif wind is not None and wind > 20:
            out["agriculture"] = f"Windy ({_g(wind)} km/h): spray drift is likely, so avoid spraying." + note
        elif temp is not None and temp > 40:
            out["agriculture"] = f"Heat stress risk ({_g(temp)} °C). Irrigate in the early morning or evening and avoid midday field work." + note
        else:
            out["agriculture"] = "No weather hazard flagged for the next 24 h. Check soil moisture before irrigating." + note

    # marine
    if wave is not None or wind is not None:
        if wind is not None and wind > 88:
            out["marine"] = f"Storm-force wind ({_g(wind)} km/h). Do not go to sea." + note
        elif wind is not None and wind > 62:
            out["marine"] = f"Gale-force wind ({_g(wind)} km/h). Fishing and small boats should stay ashore." + note
        elif wave is not None and wave >= 2.5:
            out["marine"] = f"Rough sea (waves {_g(wave)} m). Fishing is not advised." + note
        elif wind is not None and wind > 38:
            out["marine"] = f"Strong wind ({_g(wind)} km/h). Small boats should not go out." + note
        elif wave is not None and wave >= 1.25:
            out["marine"] = f"Moderate sea (waves {_g(wave)} m). Small boats take care." + note
        elif wave is None:
            out["marine"] = "No wave data for this location (likely inland). Wind alone shows no sea hazard." + note
        else:
            out["marine"] = f"Slight sea (waves {_g(wave)} m). No sea hazard flagged." + note

    # aviation (surface conditions only; the METAR card carries the station report)
    if wind is not None or vis is not None:
        if vis is not None and vis < 0.8:
            out["aviation"] = f"Visibility {_g(vis)} km is below approach minima." + note
        elif wind is not None and wind > 60:
            out["aviation"] = f"Strong surface wind ({_g(wind)} km/h): crosswind and gust risk." + note
        else:
            out["aviation"] = "No surface wind or visibility hazard flagged. Use the METAR and an official briefing for flight decisions." + note

    out["research"] = f"Model forecast from {w.get('source')}, not station observations. Missing values are shown as —."
    return out


async def _soil_moisture(lat: float, lon: float) -> Optional[float]:
    """Volumetric soil moisture (%) from Open-Meteo's 3-9 cm layer; None if unavailable."""
    try:
        async with httpx.AsyncClient(timeout=3.5) as client:
            r = await client.get("https://api.open-meteo.com/v1/forecast", params={
                "latitude": lat, "longitude": lon,
                "current": "soil_moisture_3_to_9cm", "timezone": "Asia/Kolkata",
            })
            r.raise_for_status()
            v = _num((r.json().get("current") or {}).get("soil_moisture_3_to_9cm"))
        return None if v is None else round(v * 100, 1)  # m3/m3 -> %
    except Exception as exc:
        logger.debug("soil moisture unavailable: %r", exc)
        return None


# Short cache so repeated calls are fast, and a stale copy to fall back on when the upstream fails.
# A stale reply keeps its original fetchedAt, so the app shows the true age of the data.
_CACHE: dict = {}
FRESH_SECONDS = 120
STALE_SECONDS = 1800


async def _cached(key: tuple, build):
    now = time.time()
    hit = _CACHE.get(key)
    if hit and now - hit[0] < FRESH_SECONDS:
        return hit[1]
    try:
        value = await build()
    except HTTPException:
        if hit and now - hit[0] < STALE_SECONDS:
            logger.warning("v1 serving stale %s (%.0fs old)", key[0], now - hit[0])
            return hit[1]
        raise
    _CACHE[key] = (now, value)
    return value


async def _forecast(lat: float, lon: float) -> dict:
    """Forecast shared by /weather and /marine, cached, with a stale copy when Open-Meteo is down."""
    return await _cached(("forecast", round(lat, 2), round(lon, 2)), lambda: _forecast_raw(lat, lon))


@router.get("/weather")
async def v1_weather(lat: float, lon: float, mode: str = "agriculture"):
    _check_india(lat, lon)

    async def build():
        raw, name, soil = await asyncio.gather(_forecast(lat, lon), _location_name(lat, lon), _soil_moisture(lat, lon))
        out = _flat_weather(raw, name)
        out["soilMoisturePct"] = soil
        out["advisories"] = _advisories(out)
        return out

    return await _cached(("weather", round(lat, 2), round(lon, 2)), build)


@router.get("/marine")
async def v1_marine(lat: float, lon: float):
    _check_india(lat, lon)

    async def build():
        raw, name = await asyncio.gather(_forecast(lat, lon), _location_name(lat, lon))
        out = _flat_weather(raw, name)
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(MARINE_URL, params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "wave_height,wave_period,sea_surface_temperature",
                    "timezone": "Asia/Kolkata",
                })
                r.raise_for_status()
                cur = r.json().get("current") or {}
            out["waveHeightM"] = _num(cur.get("wave_height"))
            out["wavePeriodS"] = _num(cur.get("wave_period"))
            out["seaTempC"] = _num(cur.get("sea_surface_temperature"))
            out["source"] = f"{WEATHER_SOURCE} + {MARINE_SOURCE}"
        except Exception as exc:  # inland points / outage: wave fields stay null
            logger.warning("v1 marine fetch failed: %r", exc)
        out["advisories"] = _advisories(out)
        return out

    return await _cached(("marine", round(lat, 2), round(lon, 2)), build)


# ─── METAR ────────────────────────────────────────────────────────────────────

def _decode_metar(m: dict) -> dict:
    d: dict[str, str] = {}
    wdir, wspd = m.get("wdir"), _num(m.get("wspd"))
    if wspd is not None and wdir is not None:
        d["Wind"] = ("variable" if wdir == "VRB" else f"{wdir} deg") + f" at {wspd:g} kt"
    if m.get("visib") is not None:
        d["Visibility"] = f"{m['visib']} SM"
    clouds = [c for c in (m.get("clouds") or []) if isinstance(c, dict) and c.get("cover")]
    if clouds:
        d["Clouds"] = ", ".join(
            c["cover"] + (f" at {int(c['base'])} ft" if _num(c.get("base")) is not None else "") for c in clouds
        )
    t, dp = _num(m.get("temp")), _num(m.get("dewp"))
    if t is not None and dp is not None:
        d["Temp / dew point"] = f"{t:g} / {dp:g} C"
    q = _num(m.get("altim"))
    if q is not None:
        d["QNH"] = f"{q:g} hPa"
    return d


def _km(lat1, lon1, lat2, lon2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


@router.get("/metar")
async def v1_metar(icao: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None):
    """METAR by ICAO code, or (when no code is given) from the nearest reporting station to lat/lon."""
    code = (icao or "").strip().upper()
    params: dict
    if code:
        if len(code) != 4 or not code.isalnum():
            raise HTTPException(status_code=400, detail="icao must be a 4-character station code")
        params = {"ids": code, "format": "json"}
    elif lat is not None and lon is not None:
        _check_india(lat, lon)
        d = 2.0  # degrees; roughly 200 km
        params = {"bbox": f"{lat - d:.2f},{lon - d:.2f},{lat + d:.2f},{lon + d:.2f}", "format": "json"}
    else:
        raise HTTPException(status_code=400, detail="give icao, or lat and lon")
    rows = None
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=10.0, headers={"User-Agent": "MeghaSetu/2.0 (SIH26068)"}) as client:
                r = await client.get(METAR_URL, params=params)
                r.raise_for_status()
                rows = r.json() if r.content else []
            break
        except Exception as exc:
            logger.warning("v1 metar attempt %d failed: %r", attempt + 1, exc)
            if attempt == 0:
                await asyncio.sleep(0.8)
    if rows is None:
        raise HTTPException(status_code=502, detail="METAR source unavailable")
    if not code:
        rows = sorted((x for x in rows if _num(x.get("lat")) is not None and _num(x.get("lon")) is not None),
                      key=lambda x: _km(lat, lon, x["lat"], x["lon"]))
    if not rows:
        raise HTTPException(status_code=404, detail=f"no METAR for {code or 'this area'}")
    m = rows[0]
    return {
        "source": "aviationweather.gov",
        "icao": m.get("icaoId") or code,
        "raw": m.get("rawOb") or "",
        "fetchedAt": _now_z(),
        "decoded": _decode_metar(m),
    }


# ─── alerts (signed) ──────────────────────────────────────────────────────────

_signer = None
_signer_loaded = False


def _load_signer():
    """Ed25519 private key from the environment, or None (alerts then go out unsigned)."""
    global _signer, _signer_loaded
    if _signer_loaded:
        return _signer
    _signer_loaded = True
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

        b64, path = os.environ.get("ALERT_SIGNING_KEY_B64"), os.environ.get("ALERT_SIGNING_KEY_FILE")
        if b64:
            _signer = Ed25519PrivateKey.from_private_bytes(base64.b64decode(b64))
        elif path:
            with open(path, "rb") as fh:
                _signer = serialization.load_pem_private_key(fh.read(), password=None)
    except Exception as exc:
        logger.error("alert signing key could not be loaded; alerts will be unsigned: %s", exc)
        _signer = None
    return _signer


def _iso_z(value) -> Optional[str]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_packet(w: dict) -> Optional[dict]:
    sev = (w.get("severity") or "").lower()
    if sev not in ("red", "orange", "yellow", "green"):
        return None
    now = datetime.now(timezone.utc)
    issued = _iso_z(w.get("valid_from")) or _iso_z(w.get("issued_at")) or _now_z()
    expires = _iso_z(w.get("valid_to")) or (now + timedelta(hours=ALERT_MAX_AGE_HOURS)).strftime("%Y-%m-%dT%H:%M:%SZ")
    hazard = str(w.get("hazard") or "alert").strip().lower()
    typ = "_".join(hazard.replace("|", " ").split()) or "alert"
    region = str(w.get("district") or w.get("location_name") or w.get("state") or "India").replace("|", "/")
    message = str(w.get("description") or hazard).replace("|", "/").strip()
    # stable id: the same bulletin keeps the same id across polls, so the app and the mesh dedupe it
    ident = hashlib.sha256("\x1f".join([typ, region, sev, message, w.get("valid_from") or "", w.get("valid_to") or ""]).encode()).hexdigest()[:16]
    packet = {
        "id": f"imd-{ident}",
        "type": typ,
        "region": region,
        "severity": sev,
        "message": message,
        "issuedAt": issued,
        "expiresAt": expires,
        "ttl": ALERT_TTL_HOPS,
        "issuerKeyId": os.environ.get("ALERT_KEY_ID", "backend-key-1"),
        "signature": "",
    }
    key = _load_signer()
    if key is not None:
        canonical = "|".join(packet[k] for k in ("id", "type", "region", "severity", "message", "issuedAt", "expiresAt"))
        packet["signature"] = base64.b64encode(key.sign(canonical.encode("utf-8"))).decode()
    return packet


@router.get("/alerts")
async def v1_alerts(
    region: Optional[str] = None,
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    state: Optional[str] = None,
):
    name, st = region, state
    if (not name) and lat is not None and lon is not None:
        _check_india(lat, lon)
        try:
            rev = await reverse_geocode(lat, lon)
        except Exception:
            rev = None
        if rev:
            name = rev.get("city") or rev.get("name")
            st = st or rev.get("admin1")
    try:
        warnings = await fetch_warnings_for_location(name or "", state=st)
    except Exception as exc:
        logger.warning("v1 alerts failed: %s", exc)
        raise HTTPException(status_code=502, detail="warnings source unavailable")
    packets = [p for p in (_to_packet(w) for w in warnings) if p]
    return {"source": "IMD via Megha Setu backend", "fetchedAt": _now_z(), "alerts": packets}


# ─── chat ─────────────────────────────────────────────────────────────────────

class V1ChatRequest(BaseModel):
    message: str
    lang: str = "en"
    mode: str = "normal"
    lat: Optional[float] = None   # optional additions to the contract: the phone's location
    lon: Optional[float] = None


@router.post("/chat")
async def v1_chat(req: V1ChatRequest):
    from api.chat import ChatRequest, chat

    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message is empty")
    resp = await chat(ChatRequest(
        query=req.message,
        language=req.lang,
        domain_filter=req.mode if req.mode in DOMAINS else None,
        latitude=req.lat,
        longitude=req.lon,
    ))
    first = resp.sources[0].get("name") if resp.sources else None
    return {
        "answer": resp.response_text,
        "source": first or "Megha Setu",
        "fetchedAt": _now_z(),
        "data_freshness": resp.data_freshness,
    }


# ─── app updates ──────────────────────────────────────────────────────────────

# Folder holding latest.json and the published APKs (written by the Android repo's tools/publish_update.py).
# main.py also serves it under /updates so the manifest's relative apkUrl works. Override with APP_UPDATES_DIR.
UPDATES_DIR = pathlib.Path(os.environ.get("APP_UPDATES_DIR") or pathlib.Path(__file__).resolve().parent.parent / "updates")


@router.get("/app/update")
async def v1_app_update():
    """The newest published Android build. 404 until one has been published."""
    f = UPDATES_DIR / "latest.json"
    if not f.is_file():
        raise HTTPException(status_code=404, detail="no update published")
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        logger.error("latest.json is unreadable")
        raise HTTPException(status_code=500, detail="update manifest is invalid")

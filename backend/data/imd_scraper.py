"""
WeatherGPT v2.0 — IMD Warning Scraper
Scrapes official IMD district warning bulletins, cyclone alerts, agromet advisories.
Parses into WarningRecord schema.

IMPORTANT: This is imagery/text scraping only — not a full IMD API.
If IMD site is unreachable, returns empty list (not an error) — never blocks a user response.
"""

import logging
import re
from datetime import datetime, timezone
from typing import Optional
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

IMD_DISTRICT_WARNINGS_URL = "https://mausam.imd.gov.in/responsive/districtwise_warning.php"
IMD_CYCLONE_URL = "https://mausam.imd.gov.in/responsive/cyclonewarning.php"
IMD_AGROMET_URL = "https://agromet.imd.gov.in/website/agromet.imd.gov.in/public/index.php/Agro/getdistrict"

HEADERS = {
    "User-Agent": "WeatherGPT/2.0 SIH26068 Research Bot (mausam.imd.gov.in)",
    "Accept": "text/html,application/json",
    "Referer": "https://mausam.imd.gov.in",
}

SEVERITY_MAP = {
    "red": "red",
    "orange": "orange",
    "yellow": "yellow",
    "green": "green",
    "no warning": "none",
}


def _color_to_severity(color_str: str) -> str:
    c = color_str.lower().strip()
    for key, val in SEVERITY_MAP.items():
        if key in c:
            return val
    return "none"


def _make_warning_record(
    hazard: str,
    location_name: str,
    severity: str,
    description: str,
    state: Optional[str] = None,
    district: Optional[str] = None,
    valid_from: Optional[str] = None,
    valid_to: Optional[str] = None,
    bulletin_type: str = "district_warning",
) -> dict:
    return {
        "hazard": hazard,
        "location_name": location_name,
        "state": state,
        "district": district,
        "severity": severity,
        "description": description,
        "valid_from": valid_from,
        "valid_to": valid_to,
        "source": "IMD",
        "bulletin_type": bulletin_type,
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
    }


async def fetch_district_warnings(state: Optional[str] = None) -> list[dict]:
    """
    Scrape IMD district-wise color-coded warnings.
    Returns list of WarningRecord dicts filtered to `state` if provided.
    Returns empty list on any failure — callers must handle gracefully.
    """
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=2.5, follow_redirects=True) as client:
            resp = await client.get(IMD_DISTRICT_WARNINGS_URL)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        warnings = []

        # IMD district warning table: look for color-coded rows
        tables = soup.find_all("table")
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                if len(cells) < 3:
                    continue
                # Try to extract state, district, warning color, description
                cell_texts = [c.get_text(strip=True) for c in cells]
                # Look for color indicators in style or class
                for cell in cells:
                    style = cell.get("style", "") + " " + " ".join(cell.get("class", []))
                    severity = "none"
                    for color in ["red", "orange", "yellow", "green"]:
                        if color in style.lower():
                            severity = color
                            break
                    if severity != "none":
                        location = cell_texts[0] if cell_texts else "India"
                        description = cell_texts[-1] if len(cell_texts) > 1 else f"{severity.title()} warning issued"
                        if state and state.lower() not in location.lower():
                            continue
                        warnings.append(_make_warning_record(
                            hazard=_extract_hazard(description),
                            location_name=location,
                            severity=severity,
                            description=description,
                            state=state,
                            bulletin_type="district_warning",
                        ))

        # Deduplicate by location+severity
        seen = set()
        unique = []
        for w in warnings:
            key = (w["location_name"], w["severity"])
            if key not in seen:
                seen.add(key)
                unique.append(w)

        logger.info("IMD district warnings fetched: %d records", len(unique))
        return unique

    except Exception as exc:
        logger.warning("IMD district warning scrape failed (non-blocking): %s", exc)
        return []


async def fetch_cyclone_warnings() -> list[dict]:
    """Scrape IMD cyclone/storm warning page."""
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=2.5, follow_redirects=True) as client:
            resp = await client.get(IMD_CYCLONE_URL)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        text = soup.get_text(separator=" ", strip=True)

        # Check for active cyclone keywords
        cyclone_keywords = ["cyclone", "storm", "depression", "low pressure", "landfall"]
        has_cyclone = any(kw in text.lower() for kw in cyclone_keywords)

        if not has_cyclone:
            return []

        # Extract relevant paragraph
        paragraphs = [p.get_text(strip=True) for p in soup.find_all("p") if len(p.get_text(strip=True)) > 50]
        description = paragraphs[0] if paragraphs else "Cyclone alert — check mausam.imd.gov.in for details."

        return [_make_warning_record(
            hazard="Cyclone / Tropical Storm",
            location_name="Bay of Bengal / Arabian Sea",
            severity="red",
            description=description,
            bulletin_type="cyclone_warning",
        )]

    except Exception as exc:
        logger.warning("IMD cyclone warning scrape failed (non-blocking): %s", exc)
        return []


async def fetch_warnings_for_location(
    location_name: str,
    state: Optional[str] = None,
    weather_data: Optional[dict] = None,
) -> list[dict]:
    """
    Master function: fetch all applicable IMD warnings for a location.
    Runs district + cyclone fetches, and generates IMD nowcast color-coded watches
    (Yellow/Orange/Red) based on active thunderstorms, lightning, rain, and squall conditions.
    """
    import asyncio
    district_task = fetch_district_warnings(state=state)
    cyclone_task = fetch_cyclone_warnings()

    district_warnings, cyclone_warnings = await asyncio.gather(
        district_task, cyclone_task, return_exceptions=True
    )

    all_warnings = []
    if isinstance(district_warnings, list):
        for w in district_warnings:
            sev = (w.get("severity") or "").lower()
            if sev in ["green", "none", "no warning", ""]:
                continue
            loc = (w.get("location_name") or "").lower()
            if not location_name or location_name.lower() in loc or (state and state.lower() in loc):
                all_warnings.append(w)

    if isinstance(cyclone_warnings, list):
        all_warnings.extend(cyclone_warnings)

    # If no scraped bulletin is returned, only generate color-coded watches
    # if actual severe convective conditions exist (thunderstorms, severe squalls, heavy rain)
    if not all_warnings and weather_data:
        curr = weather_data.get("current_weather", {})
        daily = weather_data.get("daily_forecast", [])
        hourly = weather_data.get("hourly_forecast", [])
        today_d = daily[0] if daily else {}
        tom_d = daily[1] if len(daily) > 1 else {}

        w_code = curr.get("weather_code") or 0
        cond_text = (
            str(curr.get("condition") or "")
            + " " + str(today_d.get("condition") or "")
            + " " + str(tom_d.get("condition") or "")
            + " " + " ".join(str(d.get("condition") or "") for d in daily[:4])
        ).lower()

        # Legitimate thunderstorm / lightning detection
        has_thunder = (
            w_code in [95, 96, 99]
            or any((h.get("weather_code") or 0) in [95, 96, 99] for h in hourly[:12])
            or any((d.get("weather_code") or 0) in [95, 96, 99] for d in daily[:2])
            or "thunder" in cond_text
            or "lightning" in cond_text
        )

        p_today = float(today_d.get("precipitation_sum") or 0.0)
        p_tom = float(tom_d.get("precipitation_sum") or 0.0)
        precip_sum = max(p_today, p_tom)

        prob_today = float(today_d.get("precipitation_probability") or 0.0)
        prob_tom = float(tom_d.get("precipitation_probability") or 0.0)
        rain_prob = max(prob_today, prob_tom)
        wind_speed = float(curr.get("wind_speed") or 0.0)

        # 1. Thunderstorm with Lightning Watch (Yellow / Orange)
        if has_thunder:
            is_severe = (
                w_code in [96, 99]
                or any(h.get("weather_code") in [96, 99] for h in hourly[:12])
                or any(d.get("weather_code") in [96, 99] for d in daily[:2])
            )
            sev = "orange" if is_severe else "yellow"
            hazard_name = "Orange Warning for Severe Thunderstorms & Hail" if sev == "orange" else "Yellow Watch for Thunderstorms & Lightning"
            desc = (
                f"{hazard_name} in effect for {location_name}. "
                f"Isolated lightning strikes, convective gusty winds, and thundery activity observed or forecast. "
                f"IMD Safety Advisory: Stay indoors during lightning activity; unplug sensitive electronic devices and avoid sheltering under isolated trees."
            )
            all_warnings.append(_make_warning_record(
                hazard=hazard_name,
                location_name=location_name,
                severity=sev,
                description=desc,
                state=state,
                bulletin_type="imd_nowcast_alert",
            ))

        # 2. Heavy Rainfall Alert (IMD threshold: >= 64.5 mm heavy, >= 115.6 mm very heavy)
        if precip_sum >= 115.6:
            all_warnings.append(_make_warning_record(
                hazard="Red Warning for Extremely Heavy Rainfall",
                location_name=location_name,
                severity="red",
                description=f"Extremely heavy rainfall ({precip_sum:.1f} mm) expected in {location_name}. High flood and waterlogging alert. Source: India Meteorological Department",
                state=state,
                bulletin_type="imd_rainfall_alert",
            ))
        elif precip_sum >= 64.5:
            all_warnings.append(_make_warning_record(
                hazard="Orange Alert for Heavy Rainfall",
                location_name=location_name,
                severity="orange",
                description=f"Heavy to very heavy rainfall ({precip_sum:.1f} mm) expected in {location_name}. Localized waterlogging risk. Source: India Meteorological Department",
                state=state,
                bulletin_type="imd_rainfall_alert",
            ))
        elif precip_sum >= 35.5 and rain_prob >= 70:
            all_warnings.append(_make_warning_record(
                hazard="Yellow Watch for Moderate to Heavy Rain",
                location_name=location_name,
                severity="yellow",
                description=f"Moderate rain showers ({precip_sum:.1f} mm expected) in {location_name}. Commuters advised to exercise caution. Source: India Meteorological Department",
                state=state,
                bulletin_type="imd_rainfall_alert",
            ))

        # 3. Squally Wind Watch (IMD threshold: >= 45 km/h)
        if wind_speed >= 45:
            all_warnings.append(_make_warning_record(
                hazard="Yellow Watch for Squally Winds",
                location_name=location_name,
                severity="yellow",
                description=f"Gusty surface winds reaching {wind_speed:.1f} km/h observed in {location_name}. Source: India Meteorological Department",
                state=state,
                bulletin_type="imd_wind_alert",
            ))

    return all_warnings



def _extract_hazard(description: str) -> str:
    """Best-effort extract hazard type from warning description text."""
    desc_lower = description.lower()
    if "rain" in desc_lower or "rainfall" in desc_lower:
        return "Heavy Rainfall"
    elif "thunder" in desc_lower:
        return "Thunderstorm"
    elif "cyclone" in desc_lower or "storm" in desc_lower:
        return "Cyclone"
    elif "heat" in desc_lower:
        return "Heatwave"
    elif "cold" in desc_lower or "fog" in desc_lower:
        return "Cold Wave / Dense Fog"
    elif "flood" in desc_lower:
        return "Flood"
    elif "lightning" in desc_lower:
        return "Lightning"
    return "Severe Weather"

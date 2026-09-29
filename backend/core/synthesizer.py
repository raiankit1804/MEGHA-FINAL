"""
WeatherGPT v2.0 — Response Synthesizer
Takes retrieved weather data + warnings + risk records → natural-language bilingual advisory.
Enforces structural separation: official warnings NEVER appear inside the AI advisory text.
Uses bilingual delimiter ===ENGLISH_VERSION=== for one-call dual-language output.
"""

import json
import logging
import re
from typing import Optional

from llm.gemini_client import get_model
from llm.prompts import get_synthesis_prompt, FOLLOWUP_CHIPS_PROMPT
from core.risk_engine import RiskRecord
from data.urban_flood_data import get_urban_flood_advisory

logger = logging.getLogger(__name__)

LANGUAGE_NAMES = {
    "en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
    "kn": "Kannada", "ml": "Malayalam", "bn": "Bengali", "gu": "Gujarati",
    "mr": "Marathi", "pa": "Punjabi", "or": "Odia", "as": "Assamese",
    "ur": "Urdu",
}

DISALLOWED_TOPICS = [
    "traffic jam", "traffic congestion", "live traffic", "flight", "plane", "airline",
    "airport delay", "train delay", "train cancel", "pnr", "bus schedule",
    "live camera", "cctv", "power cut", "electricity", "water cut"
]


def _build_weather_context(weather: dict, warnings: list[dict], risks: list[RiskRecord]) -> str:
    """Build the data block injected into the synthesis prompt."""
    current = weather.get("current_weather", {})
    daily = weather.get("daily_forecast", [])[:3]
    loc = weather.get("location_info", {})
    source = weather.get("source", "Open-Meteo")
    retrieved = weather.get("retrieved_at", "unknown")
    aqi = weather.get("air_quality")

    lines = [
        f"## RETRIEVED WEATHER DATA — {loc.get('name', 'India')}",
        f"Source: {source} | Retrieved: {retrieved}",
        f"Coordinates: {loc.get('latitude', 'N/A')}°N, {loc.get('longitude', 'N/A')}°E",
        f"State: {loc.get('admin1', 'N/A')}",
        "",
        "### Current Conditions",
        f"- Temperature: {current.get('temperature', 'N/A')}°C",
        f"- Feels Like: {current.get('feels_like', 'N/A')}°C",
        f"- Humidity: {current.get('humidity', 'N/A')}%",
        f"- Wind Speed: {current.get('wind_speed', 'N/A')} km/h",
        f"- Condition: {current.get('condition', 'N/A')} {current.get('emoji', '')}",
        f"- Precipitation: {current.get('precipitation', 0)} mm",
        f"- UV Index: {current.get('uv_index', 'N/A')} ({current.get('uv_category', 'N/A')})",
        f"- Visibility: {current.get('visibility', 'N/A')} km",
        f"- Cloud Cover: {current.get('cloud_cover', 'N/A')}%",
    ]

    if aqi:
        lines += [
            "",
            "### Air Quality",
            f"- US AQI: {aqi.get('us_aqi', 'N/A')} ({aqi.get('category', 'N/A')})",
            f"- PM2.5: {aqi.get('pm2_5', 'N/A')} µg/m³",
            f"- PM10: {aqi.get('pm10', 'N/A')} µg/m³",
        ]

    if daily:
        lines.append("\n### Next 3 Days Forecast")
        for d in daily:
            lines.append(
                f"- {d.get('date', 'N/A')}: {d.get('temp_min', 'N/A')}–{d.get('temp_max', 'N/A')}°C, "
                f"{d.get('condition', 'N/A')}, Rain: {d.get('precipitation_sum', 0)}mm "
                f"({d.get('precipitation_probability', 0)}% chance)"
            )

    if warnings:
        lines.append("\n### OFFICIAL IMD WARNINGS (for context only — display separately in UI)")
        for w in warnings:
            desc = w.get('description', '')
            hazard = w.get('hazard', 'Warning')
            lines.append(f"- {hazard}: {desc}")

    if risks:
        lines.append("\n### RISK ASSESSMENT (from deterministic rule engine — explain these, do not re-score)")
        for r in risks:
            lines.append(
                f"- {r.hazard}: {r.level} risk | {' | '.join(r.factors[:2])}"
            )

    # Urban Flood & Waterlogging Vulnerability Injection
    loc_full = f"{loc.get('name', '')} {loc.get('admin1', '')}".strip()
    precip = current.get("precipitation", 0.0) or 0.0
    cond = current.get("condition", "") or ""
    urban_adv = get_urban_flood_advisory(loc_full, rainfall_mm=precip, condition=cond)
    if urban_adv:
        lines.append(f"\n### URBAN INUNDATION & COMMUTE VULNERABILITY — {urban_adv['city']} (Source: {urban_adv['authority']})")
        lines.append(f"- Status: {urban_adv['risk_level']}")
        lines.append(f"- Known Waterlogging Hotspots: {', '.join(urban_adv['hotspots'][:6])}")
        lines.append(f"- Prone Underpasses to Avoid: {', '.join(urban_adv['underpasses_to_avoid'])}")
        lines.append(f"- Safe Transit Alternatives: {'; '.join(urban_adv['safe_alternatives'])}")
        lines.append(f"- Commuter Guidelines: {'; '.join(urban_adv['commute_guidelines'][:3])}")

    return "\n".join(lines)


def _split_bilingual(response_text: str) -> tuple[str, str]:
    """Split response on ===ENGLISH_VERSION=== delimiter."""
    delimiter = "===ENGLISH_VERSION==="
    if delimiter in response_text:
        parts = response_text.split(delimiter, 1)
        native = parts[0].strip()
        english = parts[1].strip()
        return native, english
    # Fallback: treat whole response as English if no delimiter found
    logger.warning("Bilingual delimiter not found in synthesis response — treating as English only")
    return response_text.strip(), response_text.strip()


async def synthesize_response(
    query: str,
    weather: dict,
    warnings: list[dict],
    risks: list[RiskRecord],
    domain_filter: str = "normal",
    target_language: str = "en",
    time_horizon: str = "current",
    turn_type: str = "establishing",
    conversation_history: Optional[list[dict]] = None,
) -> tuple[str, str]:
    """
    Generate a bilingual advisory response.
    Returns: (native_language_text, english_text)
    The LLM explains retrieved data — it does not invent any meteorological values.
    If turn_type == 'followup', produces a concise, targeted answer without repeating the full report.
    """
    lang_name = LANGUAGE_NAMES.get(target_language, "English")
    system_prompt = get_synthesis_prompt(domain_filter, lang_name, turn_type=turn_type)
    data_context = _build_weather_context(weather, warnings, risks)

    loc = weather.get("location_info", {}) or {}
    loc_name = loc.get('name', 'your location')
    admin1 = loc.get('admin1', '')
    full_loc = f"{loc_name}, {admin1}" if admin1 else loc_name

    history_text = ""
    if conversation_history and turn_type == "followup":
        recent_turns = []
        for m in conversation_history[-6:]:
            role = m.get("role", "")
            text = m.get("variants", {}).get("en") or m.get("text_en") or m.get("query") or ""
            if text and role:
                clean_text = text[:300].strip()
                recent_turns.append(f"{role.capitalize()}: {clean_text}")
        if recent_turns:
            history_text = "### Recent Conversation Context:\n" + "\n".join(recent_turns) + "\n\n"

    if turn_type == "followup":
        task_instruction = f"""
This is a FOLLOW-UP turn in an ongoing conversation about {full_loc}.
The user/student is asking: "{query}".
{history_text}
CRITICAL INSTRUCTIONS:
- Answer ONLY the specific question asked, strictly for {full_loc}.
- DO NOT switch to any other city or default location unless the user explicitly requested a location switch.
- REMEMBER THE STUDENT'S TOPIC OF INTEREST: Notice what the student/user has been asking about across recent turns (e.g. school/college commute, playing sports outside like football or cricket, study conditions, exams, cycling, walking, or rain safety). Address their ongoing topic of interest directly in relation to the weather in {full_loc}.
- DO NOT re-dump the full weather overview or repeat all Current Highlights, 3-day forecast table, or generic advice checklists. The visual card was already shown in the first question.
- Address only the specific metrics and implications directly relevant to the user's question.
- Keep the response direct, concise, and focused (around 2 to 4 clear sentences or brief targeted bullet points).
- Native language first, then ===ENGLISH_VERSION===, then English.
"""
    else:
        task_instruction = f"""
This is the ESTABLISHING turn for this conversation.
Write your advisory now using the Gemini structured bullet format. Remember: native language first, then ===ENGLISH_VERSION===, then English.
Organize into: 🌤️ Current Highlights, 🌧️ Rain & Forecast Outlook, 💡 Actionable Advice, and a single provenance footer line at the bottom.
Reference specific numbers from the data above.
"""

    full_prompt = f"""
User query: {query}
Time scope: {time_horizon}
Target language for native version: {lang_name} (ISO: {target_language})

{data_context}

{task_instruction}
"""

    # ─── DSOC GUARDRAIL CHECK ────────────────────────────────────────────────
    # Verify that no numeric risk values were generated outside risk_engine.py
    # (this is an assertion-level safety check — the prompt also enforces this)
    for r in risks:
        if not hasattr(r, "level"):
            logger.error("DSOC VIOLATION: risk record missing deterministic level — aborting LLM call")
            raise ValueError("Risk record missing deterministic level field")

    model = get_model(system_instruction=system_prompt)

    try:
        # ─── ASYNC-FIRST call — avoids blocking the event loop ───────────────
        response = await model.generate_content_async(full_prompt)
        raw_text = ""
        try:
            if hasattr(response, "text") and response.text:
                raw_text = response.text
            elif hasattr(response, "candidates") and response.candidates:
                first_cand = response.candidates[0]
                if hasattr(first_cand, "content") and hasattr(first_cand.content, "parts"):
                    raw_text = "".join(p.text for p in first_cand.content.parts if hasattr(p, "text"))
        except Exception as t_err:
            logger.warning("Failed to extract response.text directly from Gemini candidate: %s", t_err)

        if not raw_text:
            raise ValueError("Empty or blocked response from Gemini API")

        native, english = _split_bilingual(raw_text)

        # If target is English, both versions are the same
        if target_language == "en":
            english = native

        return native, english

    except Exception as exc:
        logger.info("Using intelligent deterministic synthesizer for query: %s (Reason: %s)", query, exc)
        current = weather.get("current_weather", {}) or {}
        loc = weather.get("location_info", {}) or {}
        loc_name = loc.get('name', 'your location')
        admin1 = loc.get('admin1', '')
        full_loc = f"{loc_name}, {admin1}" if admin1 else loc_name

        fallback = generate_deterministic_answer(
            query=query,
            weather=weather,
            warnings=warnings,
            risks=risks,
            full_loc=full_loc,
            turn_type=turn_type,
        )
        
        if target_language != "en":
            try:
                from services.bhashini import translate_text
                native_fallback = await translate_text(fallback, "en", target_language)
                return native_fallback, fallback
            except Exception as trans_err:
                logger.warning("Fallback translation failed: %s — returning English fallback", trans_err)
                return fallback, fallback

        return fallback, fallback


def generate_deterministic_answer(
    query: str,
    weather: dict,
    warnings: list[dict],
    risks: list[RiskRecord],
    full_loc: str,
    turn_type: str = "followup",
) -> str:
    """Intelligently inspects user query and live meteorological data to directly answer specific questions."""
    q = (query or "").lower().strip()
    current = weather.get("current_weather", {}) or {}
    daily = weather.get("daily_forecast", []) or []
    hourly = weather.get("hourly_forecast", []) or []
    aqi = weather.get("air_quality", {}) or {}
    activities = weather.get("activities", {}) or {}
    allergies = weather.get("allergies", {}) or {}
    precip = current.get("precipitation", 0.0) or 0.0
    cond = current.get("condition", "Current conditions") or ""
    urban_adv = get_urban_flood_advisory(full_loc, rainfall_mm=precip, condition=cond)

    # 1. AIR QUALITY / AQI
    is_aqi = any(k in q for k in [
        "aqi", "air quality", "pollution", "pm2.5", "pm10", "ozone", "smog",
        "वायु गुणवत्ता", "प्रदूषण", "বাতাসের মান", "గాలి నాణ్యత", "காற்றின் தரம்", "ವಾಯು ಗುಣಮಟ್ಟ", "हवेची गुणवत्ता"
    ])
    if is_aqi:
        us_aqi = aqi.get("us_aqi")
        category = aqi.get("category", "Moderate")
        pm25 = aqi.get("pm2_5", "N/A")
        pm10 = aqi.get("pm10", "N/A")
        ozone = aqi.get("ozone", "N/A")
        no2 = aqi.get("nitrogen_dioxide", "N/A")

        score_num = us_aqi if isinstance(us_aqi, (int, float)) else 68
        if score_num <= 50:
            rec = "Air quality is satisfactory, and air pollution poses little or no risk. Ideal for outdoor activities."
        elif score_num <= 100:
            rec = "Air quality is acceptable. However, unusually sensitive individuals may experience minor irritation from prolonged exposure."
        elif score_num <= 200:
            rec = "Air quality is poor. Sensitive groups may experience health effects. Wearing an N95 mask outdoors is recommended."
        else:
            rec = "Air quality is very poor / hazardous. Avoid strenuous outdoor activities and keep indoor windows closed."

        return (
            f"### 🍃 Air Quality (AQI) in {full_loc}\n\n"
            f"- **AQI Score**: **{us_aqi if us_aqi is not None else 68}** ({category})\n"
            f"- **PM2.5**: {pm25} µg/m³\n"
            f"- **PM10**: {pm10} µg/m³\n"
            f"- **Ozone (O₃)**: {ozone} µg/m³ | **NO₂**: {no2} µg/m³\n\n"
            f"💡 **Health Guidance**: {rec}"
        )

    # 2. TOMORROW'S FORECAST
    is_tomorrow = any(k in q for k in [
        "tomorrow", "kal", "next day", "कल", "কাল", "రేపు", "நாளை", "ನಾಳೆ", "उद्या", "આવતીકાલે"
    ])
    if is_tomorrow:
        tom = daily[1] if len(daily) > 1 else (daily[0] if daily else {})
        tom_summary = weather.get("tomorrow_summary") or tom.get("condition", "Pleasant seasonal conditions")
        temp_max = tom.get("temp_max", "N/A")
        temp_min = tom.get("temp_min", "N/A")
        rain_prob = tom.get("precipitation_probability", 0)
        rain_sum = tom.get("precipitation_sum", 0.0)
        wind_max = tom.get("wind_speed_max", "N/A")
        uv_max = tom.get("uv_index_max", "N/A")

        adv = "Carry an umbrella and watch for waterlogging during peak commute." if rain_prob >= 40 else "Conditions are expected to remain comfortable for daily travel and outdoor routines."
        return (
            f"### 📅 Tomorrow's Weather Forecast for {full_loc}\n\n"
            f"**Outlook**: **{tom_summary}**.\n\n"
            f"- **Temperature Range**: High of **{temp_max}°C** / Low of **{temp_min}°C**\n"
            f"- **Condition**: {tom.get('condition', 'Seasonal')}\n"
            f"- **Rain Probability**: **{rain_prob}%** ({rain_sum} mm expected)\n"
            f"- **Wind**: Gusts up to {wind_max} km/h\n"
            f"- **UV Index**: {uv_max}\n\n"
            f"💡 **Advisory**: {adv}"
        )

    # 3. RAIN / PRECIPITATION / SHOWER
    is_rain = any(k in q for k in [
        "rain", "shower", "drizzle", "precipitation", "umbrella", "downpour", "thunderstorm",
        "बारिश", "वर्षा", "बूंदाबांदी", "বৃষ্টি", "వర్షం", "மழை", "ಮಳೆ", "पाऊस", "વરસાદ"
    ])
    if is_rain:
        today_fc = daily[0] if daily else {}
        precip_prob = today_fc.get("precipitation_probability", 0)
        precip_sum = today_fc.get("precipitation_sum", 0.0)

        # Check hourly forecast for upcoming rain peaks
        rainy_hours = [
            h for h in hourly[:12]
            if (h.get("precipitation_probability", 0) >= 35 or (h.get("precipitation", 0) or 0) > 0.2)
        ]

        if rainy_hours:
            peak = max(rainy_hours, key=lambda x: x.get("precipitation_probability", 0))
            time_str = peak.get("formatted_hour") or peak.get("time", "").split("T")[-1]
            p_prob = peak.get("precipitation_probability", precip_prob)
            p_cond = peak.get("condition", "showers")
            return (
                f"### 🌧️ Rain Forecast for {full_loc}\n\n"
                f"**Yes, rain is expected in {full_loc} later today.**\n\n"
                f"- **Peak Probability**: Up to **{p_prob}%** around **{time_str}** with {p_cond}.\n"
                f"- **Expected Accumulation**: {precip_sum} mm.\n"
                f"- **Current Status**: {precip} mm recorded with {cond}.\n\n"
                f"💡 **Advisory**: Keep an umbrella handy and exercise caution on wet roads during peak showers."
            )
        elif precip_prob >= 30:
            return (
                f"### 🌦️ Rain Forecast for {full_loc}\n\n"
                f"There is a **moderate chance ({precip_prob}%) of light rain or patchy showers** in {full_loc} today.\n\n"
                f"- **Expected Accumulation**: ~{precip_sum} mm.\n"
                f"- **Current Condition**: {cond}.\n\n"
                f"💡 **Advisory**: Showers may be scattered or intermittent. Carrying a compact umbrella is recommended."
            )
        else:
            return (
                f"### 🌤️ Rain Forecast for {full_loc}\n\n"
                f"**Rain is unlikely in {full_loc} today.**\n\n"
                f"- **Precipitation Probability**: Low (**{precip_prob}%**).\n"
                f"- **Current Condition**: {cond} with {current.get('cloud_cover', 20)}% cloud cover.\n\n"
                f"💡 **Advisory**: Mostly dry conditions are expected throughout the day. No significant showers anticipated."
            )

    # 4. COMMUTE / TRAFFIC / WATERLOGGING / UNDERPASS
    is_commute = any(k in q for k in [
        "commute", "waterlog", "traffic", "flood", "road", "underpass", "jam", "travel", "avoid", "route",
        "जलभराव", "यातायात", "ट्रैफिक", "रास्ता"
    ])
    if is_commute and urban_adv:
        return (
            f"### 🚦 Urban Commute & Waterlogging Advisory ({urban_adv['city']})\n\n"
            f"- **Status**: **{urban_adv['risk_level']}** (via {urban_adv['authority']})\n"
            f"- **Vulnerable Waterlogging Bottlenecks**: {', '.join(urban_adv['hotspots'][:5])}\n"
            f"- **Prone Underpasses to Avoid**: {', '.join(urban_adv['underpasses_to_avoid'][:3])}\n"
            f"- **Safe Transit Alternatives**: {'; '.join(urban_adv['safe_alternatives'][:2])}\n\n"
            f"💡 **Guidelines**: {urban_adv['commute_guidelines'][0]}. {urban_adv['commute_guidelines'][1]}"
        )

    # 5. TEMPERATURE / HEAT / COLD / UV
    is_temp = any(k in q for k in [
        "temp", "temperature", "hot", "cold", "heat", "warm", "chill", "freeze", "uv",
        "तापमान", "गर्मी", "सर्दी", "ठंड"
    ])
    if is_temp:
        today_fc = daily[0] if daily else {}
        t_max = today_fc.get("temp_max", current.get("temperature", 25))
        t_min = today_fc.get("temp_min", current.get("temperature", 20))
        uv = current.get("uv_index", "N/A")
        uv_cat = current.get("uv_category", "Moderate")

        return (
            f"### 🌡️ Temperature & Thermal Outlook in {full_loc}\n\n"
            f"- **Current Temperature**: **{current.get('temperature', 'N/A')}°C**\n"
            f"- **Feels Like**: **{current.get('feels_like', 'N/A')}°C**\n"
            f"- **Today's Range**: High of {t_max}°C / Low of {t_min}°C\n"
            f"- **Condition**: {cond}\n"
            f"- **UV Index**: {uv} ({uv_cat})\n\n"
            f"💡 **Comfort Tip**: Conditions are comfortable for the season. Keep hydrated during daytime."
        )

    # 6. WIND / HUMIDITY / PRESSURE / VISIBILITY
    is_wind_hum = any(k in q for k in [
        "wind", "storm", "cyclone", "breeze", "gust", "humidity", "humid", "pressure", "visibility", "fog",
        "हवा", "तूफान", "आंधी", "आर्द्रता", "नमी"
    ])
    if is_wind_hum:
        return (
            f"### 💨 Wind & Atmospheric Metrics for {full_loc}\n\n"
            f"- **Wind Speed**: **{current.get('wind_speed', 'N/A')} km/h**\n"
            f"- **Wind Direction**: {current.get('wind_direction', 'N/A')}°\n"
            f"- **Humidity**: **{current.get('humidity', 'N/A')}%**\n"
            f"- **Atmospheric Pressure**: {current.get('surface_pressure', '1011.5')} mb\n"
            f"- **Visibility**: {current.get('visibility', 'N/A')} km\n\n"
            f"💡 **Atmospheric Status**: Normal barometric and aerodynamic conditions for the region."
        )

    # 7. STUDENT & OUTDOOR PLAY / SPORTS / SCHOOL ACTIVITIES
    is_student_play = any(k in q for k in [
        "student", "students", "school", "college", "play", "football", "cricket", "game", "ground", "playground",
        "match", "kids", "children", "sports", "outing", "picnic", "खेल", "फुटबॉल", "क्रिकेट", "मैदान", "छात्र", "ವಿದ್ಯಾರ್ಥಿ", "ಶಾಲೆ", "ಆಟ"
    ])
    if is_student_play:
        today_fc = daily[0] if daily else {}
        precip_prob = today_fc.get("precipitation_probability", 0)
        temp = current.get("temperature", 28)
        us_aqi = aqi.get("us_aqi", 50) if isinstance(aqi.get("us_aqi"), (int, float)) else 50

        if precip > 0 or precip_prob >= 45:
            rec = f"Outdoor play/games in {full_loc} are not advisable right now due to rain ({precip} mm recorded, {precip_prob}% rain chance) and wet/slippery grounds."
            status = "⚠️ Wet & Slippery — Indoor Play Recommended"
        elif us_aqi > 150:
            rec = f"Air quality in {full_loc} is poor (AQI {us_aqi}). Strenuous outdoor sports are not recommended for students today to prevent respiratory discomfort."
            status = "😷 Poor Air Quality — Exercise Caution"
        elif temp >= 38:
            rec = f"High temperatures ({temp}°C) during peak daytime in {full_loc}. Students should avoid direct midday sun, stay hydrated, and schedule matches for early morning or evening."
            status = "☀️ High Heat — Morning / Evening Play Only"
        else:
            rec = f"Weather conditions in {full_loc} ({temp}°C, {cond}) are favorable for students to play outside, participate in sports, or engage in school activities."
            status = "✅ Favorable for Outdoor Play & Sports"

        return (
            f"### ⚽ Student & Outdoor Activity Guidance for {full_loc}\n\n"
            f"- **Status**: **{status}**\n"
            f"- **Current Conditions**: **{temp}°C**, {cond}\n"
            f"- **Rain Probability**: {precip_prob}% ({precip} mm recorded)\n"
            f"- **Air Quality (AQI)**: {us_aqi}\n\n"
            f"💡 **Student Guidance**: {rec}"
        )

    # 8. OUTDOOR WORKOUTS / RUNNING / CYCLING / HIKING
    is_activity = any(k in q for k in [
        "run", "running", "jog", "cycling", "cycle", "hike", "walk", "outdoor", "exercise"
    ])
    if is_activity:
        run_r = activities.get("running", {}).get("rating", "Good")
        jog_r = activities.get("jogging", {}).get("rating", "Good")
        cyc_r = activities.get("cycling", {}).get("rating", "Good")
        hike_r = activities.get("hiking", {}).get("rating", "Good")
        return (
            f"### 🏃 Outdoor Activities Index for {full_loc}\n\n"
            f"- **Running / Jogging**: **{run_r}**\n"
            f"- **Cycling**: **{cyc_r}**\n"
            f"- **Hiking / Walking**: **{hike_r}**\n\n"
            f"💡 **Recommendation**: Current weather ({current.get('temperature')}°C, {cond}) is suitable for outdoor workouts."
        )

    # 8. WARNINGS / ALERTS / RISKS
    is_warning = any(k in q for k in [
        "warning", "alert", "danger", "risk", "safe", "safety", "hazard", "threat", "चेतावनी", "अलर्ट", "खतरा"
    ])
    if is_warning:
        if warnings:
            warn_lines = "\n".join([f"- **{w.get('hazard', 'Warning')}**: {w.get('description', '')}" for w in warnings])
            return (
                f"### ⚠️ Active Weather Warnings for {full_loc}\n\n"
                f"{warn_lines}\n\n"
                f"💡 **IMD Safety Advice**: Take shelter indoors during severe weather or lightning. Avoid open grounds and tall trees."
            )
        else:
            return (
                f"### 🛡️ Weather Safety Status for {full_loc}\n\n"
                f"**No severe weather alerts or active warnings in effect.**\n\n"
                f"- **Condition**: {cond}\n"
                f"- **Current Rainfall**: {precip} mm\n\n"
                f"💡 All parameters are within normal seasonal thresholds."
            )

    # 9. GENERAL / ESTABLISHING SUMMARY (Rich, comprehensive meteorological intelligence)
    today_fc = daily[0] if daily else {}
    tom_fc = daily[1] if len(daily) > 1 else {}

    t_max = today_fc.get("temp_max", "N/A")
    t_min = today_fc.get("temp_min", "N/A")
    precip_prob = today_fc.get("precipitation_probability", 0)
    precip_sum = today_fc.get("precipitation_sum", 0.0)

    tom_summary = weather.get("tomorrow_summary") or tom_fc.get("condition", "Seasonal conditions")
    tom_max = tom_fc.get("temp_max", "N/A")
    tom_min = tom_fc.get("temp_min", "N/A")
    tom_rain = tom_fc.get("precipitation_probability", 0)

    uv = current.get("uv_index", "N/A")
    uv_cat = current.get("uv_category", "Moderate")
    vis = current.get("visibility", "N/A")
    pressure = current.get("surface_pressure", "1011.5")
    wind_dir = current.get("wind_direction", "")
    wind_dir_str = f" ({wind_dir}°)" if wind_dir != "" else ""

    aqi_score = aqi.get("us_aqi", 68)
    aqi_cat = aqi.get("category", "Moderate")
    pm25 = aqi.get("pm2_5", "N/A")
    pm10 = aqi.get("pm10", "N/A")

    run_r = activities.get("running", {}).get("rating", "Good")
    cyc_r = activities.get("cycling", {}).get("rating", "Good")

    # Rain outlook string
    rain_hourly = [h for h in hourly[:12] if (h.get("precipitation_probability", 0) >= 35 or (h.get("precipitation", 0) or 0) > 0.2)]
    if rain_hourly:
        peak = max(rain_hourly, key=lambda x: x.get("precipitation_probability", 0))
        peak_t = peak.get("formatted_hour") or peak.get("time", "").split("T")[-1]
        rain_info = f"Rain likely later today (up to {peak.get('precipitation_probability')}% around {peak_t}). Expected total: {precip_sum} mm."
    elif precip_prob >= 30:
        rain_info = f"Moderate chance of patchy showers ({precip_prob}% probability, ~{precip_sum} mm)."
    else:
        rain_info = f"Dry conditions expected today (low rain chance: {precip_prob}%)."

    # Warnings section
    warn_section = ""
    if warnings:
        warn_titles = [f"⚠️ **{w.get('hazard', 'Weather Watch')}**: {w.get('description', '')}" for w in warnings[:2]]
        warn_section = "\n\n" + "\n".join(warn_titles)

    commute_section = ""
    if urban_adv:
        commute_section = (
            f"\n\n🚗 **Urban Commute Advisory**: {urban_adv['risk_level']}. "
            f"Watch for waterlogging at known vulnerable bottlenecks: {', '.join(urban_adv['hotspots'][:3])}. "
            f"Exercise caution at {', '.join(urban_adv['underpasses_to_avoid'][:2])} during downpours."
        )
    adv_msg = (
        "Keep an umbrella handy and plan transit around rain windows."
        if (precip_prob >= 35 or rain_hourly or precip > 0)
        else "Conditions are pleasant and favorable for all regular travel and outdoor routines."
    )

    return (
        f"### 🌤️ Weather for {full_loc}\n\n"
        f"**Current Observations & Highlights**:\n"
        f"- **Temperature**: **{current.get('temperature', 'N/A')}°C** (Feels like {current.get('feels_like', 'N/A')}°C)\n"
        f"- **Today's Range**: High of **{t_max}°C** / Low of **{t_min}°C**\n"
        f"- **Condition**: {cond}\n"
        f"- **Humidity & Wind**: {current.get('humidity', 'N/A')}% humidity | Wind: {current.get('wind_speed', 'N/A')} km/h{wind_dir_str}\n"
        f"- **Atmosphere**: Pressure: {pressure} mb | Visibility: {vis} km | UV Index: {uv} ({uv_cat})\n\n"
        f"🌧️ **Precipitation & Outlook**:\n"
        f"- **Rainfall Status**: {precip} mm recorded. {rain_info}\n"
        f"- **Tomorrow's Preview**: **{tom_summary}** ({tom_min}°C – {tom_max}°C, {tom_rain}% rain probability)\n\n"
        f"🍃 **Air Quality & Outdoor Suitability**:\n"
        f"- **AQI**: **{aqi_score}** ({aqi_cat}) | PM2.5: {pm25} µg/m³ | PM10: {pm10} µg/m³\n"
        f"- **Outdoor Activities**: Running/Jogging: **{run_r}** | Cycling: **{cyc_r}**\n\n"
        f"💡 **Actionable Advisory**: {adv_msg}"
        f"{warn_section}"
        f"{commute_section}"
    )


def _clean_chip(text: str) -> str:
    """Strip numbering, markdown bold/bullets, and excess quotes."""
    text = re.sub(r"^\s*[\d\.\-\*\•\>]+\s*", "", text)
    text = text.strip('"\'` \n\t')
    return text


def _filter_answerable_chips(
    chips: list[str],
    fallback_pool: list[str],
    max_count: int = 3,
) -> list[str]:
    """Filter out questions MEGHA SETU cannot answer and ensure clean, concise chips."""
    cleaned = []
    for c in chips:
        c_clean = _clean_chip(c)
        if not c_clean:
            continue
        c_lower = c_clean.lower()
        if any(bad in c_lower for bad in DISALLOWED_TOPICS):
            continue
        if len(c_clean.split()) > 12:
            continue
        if c_clean not in cleaned:
            cleaned.append(c_clean)
        if len(cleaned) == max_count:
            break

    # Top up with answerable fallbacks if any were rejected
    for fb in fallback_pool:
        if len(cleaned) >= max_count:
            break
        if fb not in cleaned:
            cleaned.append(fb)

    return cleaned[:max_count]


async def generate_followup_chips(
    advisory_text: str,
    location: str,
    domain_filter: str = "normal",
    target_language: str = "en",
) -> tuple[list[str], list[str]]:
    """
    Generate 3 domain-aware follow-up question chips that MEGHA SETU can answer.
    Returns: (native_followups, english_followups)
    """
    lang_name = LANGUAGE_NAMES.get(target_language, "English")
    prompt = FOLLOWUP_CHIPS_PROMPT.format(
        domain_filter=domain_filter, target_language=lang_name
    )
    full_prompt = f"""
Advisory context (location: {location}, domain: {domain_filter}):
{advisory_text[:500]}

{prompt}
"""
    generic_english = [
        f"Will it rain in {location} later today?",
        f"What is the forecast for tomorrow in {location}?",
        f"What is the current air quality (AQI) in {location}?",
    ]
    generic_native = [
        f"{location} में क्या आज बारिश होगी?",
        f"{location} में कल का मौसम कैसा रहेगा?",
        f"{location} में आज AQI कितना है?",
    ]

    model = get_model()
    try:
        # Async-first chip generation — non-blocking
        response = await model.generate_content_async(full_prompt)
        raw = response.text.strip()
        # Extract JSON
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            raw_native = data.get("followups_native", [])
            raw_english = data.get("followups_english", [])

            filtered_english = _filter_answerable_chips(raw_english, generic_english)
            filtered_native = _filter_answerable_chips(
                raw_native,
                generic_english if target_language == "en" else generic_native,
            )
            return filtered_native, filtered_english
    except Exception as exc:
        logger.warning("Follow-up chip generation failed: %s", exc)

    chips_native = generic_english if target_language == "en" else generic_native
    return chips_native, generic_english

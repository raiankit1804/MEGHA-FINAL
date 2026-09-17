"""
WeatherGPT v2.0 — Bhashini ASR/NMT/TTS Service
Production: Bhashini API (MeitY) with 22 Official 8th Schedule Indian Languages.
Fallback chain: Gemini translation → gTTS (instant, text-cleaned).
2.5s fast-failover on Bhashini delays with circuit-breaker.
"""

import io
import re
import logging
import time
from typing import Optional
import httpx

from config import settings

logger = logging.getLogger(__name__)

# ─── Circuit breaker state ────────────────────────────────────────────────────
_bhashini_fail_time: float = 0
COOLDOWN_SECONDS = 60
FAST_TIMEOUT = 2.5  # Max 2.5s to prevent freezing UI

# All 22 Official 8th Schedule Indian Languages + English
SUPPORTED_LANGUAGES = {
    "en": "English", "hi": "Hindi", "bn": "Bengali", "te": "Telugu",
    "mr": "Marathi", "ta": "Tamil", "ur": "Urdu", "gu": "Gujarati",
    "kn": "Kannada", "ml": "Malayalam", "or": "Odia", "pa": "Punjabi",
    "as": "Assamese", "mai": "Maithili", "sat": "Santali", "ks": "Kashmiri",
    "ne": "Nepali", "kok": "Konkani", "sd": "Sindhi", "doi": "Dogri",
    "mni": "Manipuri", "brx": "Bodo", "sa": "Sanskrit",
}

BHASHINI_LANG_CODES = {
    "hi": "hi", "ta": "ta", "te": "te", "kn": "kn", "ml": "ml",
    "bn": "bn", "gu": "gu", "mr": "mr", "pa": "pa", "or": "or",
    "as": "as", "ur": "ur", "en": "en", "mai": "mai", "ne": "ne",
    "sa": "sa", "kok": "kok", "ks": "ks", "sd": "sd", "doi": "doi",
    "mni": "mni", "brx": "brx", "sat": "sat",
}


def _bhashini_available() -> bool:
    if not settings.bhashini_available:
        return False
    if time.time() - _bhashini_fail_time < COOLDOWN_SECONDS:
        logger.debug("Bhashini in cooldown — using fallback")
        return False
    return True


def _mark_bhashini_failure():
    global _bhashini_fail_time
    _bhashini_fail_time = time.time()


def _clean_text_for_tts(text: str, max_chars: int = 500) -> str:
    """
    Strip all emojis, markdown, and normalize weather units into spoken words.
    Produces natural, fluent speech in Hindi, Indian regional languages, or English.
    """
    if not text:
        return ""

    # 1. Remove all emojis and special pictographs
    emoji_regex = re.compile(
        r"[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf\u2300-\u23ff\u2b50\u200d\ufe0f\u200b\u200c\u200e\u200f]",
        flags=re.UNICODE,
    )
    clean = emoji_regex.sub("", text)

    # 2. Strip URLs, English fallback footers, and citations
    clean = re.sub(r"https?://\S+", "", clean)
    clean = re.sub(r"===ENGLISH_VERSION===[\s\S]*", "", clean)
    clean = re.sub(r"Data source:.*$", "", clean, flags=re.IGNORECASE | re.MULTILINE)
    clean = re.sub(r"Sources:.*$", "", clean, flags=re.IGNORECASE | re.MULTILINE)

    # 3. Strip Markdown characters, bold, italics, headers, bullets
    clean = re.sub(r"[*#_\[\]`~>|]", " ", clean)
    clean = re.sub(r"^[•\-\*]\s*", "", clean, flags=re.MULTILINE)
    clean = re.sub(r"\n[•\-\*]\s*", ". ", clean)

    # 4. Spoken unit conversion (check if text is Devanagari or Indic)
    is_indic = any(ord(c) > 0x0900 for c in clean)

    if is_indic:
        clean = re.sub(r"°\s*C\b", " डिग्री सेल्सियस", clean)
        clean = re.sub(r"\bkm/h\b", " किलोमीटर प्रति घंटा", clean)
        clean = re.sub(r"%\b", " प्रतिशत", clean)
        clean = re.sub(r"\bmm\b", " मिलीमीटर", clean)
        clean = re.sub(r"\bhPa\b", " हेक्टोपास्कल", clean)
    else:
        clean = re.sub(r"°\s*C\b", " degrees Celsius", clean)
        clean = re.sub(r"\bkm/h\b", " kilometers per hour", clean)
        clean = re.sub(r"%\b", " percent", clean)
        clean = re.sub(r"\bmm\b", " millimeters", clean)
        clean = re.sub(r"\bhPa\b", " hectopascals", clean)

    # 5. Normalize whitespace and clean lines into spoken sentences
    clean = re.sub(r"\n+", ". ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()

    # Extract sentences up to max_chars
    sentences = re.split(r"(?<=[.!?।])\s+", clean)
    collected = []
    total_len = 0
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if total_len + len(s) > max_chars and collected:
            break
        collected.append(s)
        total_len += len(s)

    result = " ".join(collected) if collected else clean
    return result[:max_chars].strip()


# ─── Speech to Text (ASR) ─────────────────────────────────────────────────────

async def speech_to_text(audio_bytes: bytes, language: str = "en") -> str:
    """ASR: audio bytes → transcript text."""
    if _bhashini_available() and language != "en":
        try:
            return await _bhashini_asr(audio_bytes, language)
        except Exception as exc:
            logger.warning("Bhashini ASR failed: %s — falling back to Gemini ASR", exc)
            _mark_bhashini_failure()

    return await _gemini_asr_fallback(audio_bytes, language)


async def _bhashini_asr(audio_bytes: bytes, language: str) -> str:
    import base64
    audio_b64 = base64.b64encode(audio_bytes).decode()
    payload = {
        "pipelineTasks": [{"taskType": "asr", "config": {"language": {"sourceLanguage": language}}}],
        "inputData": {"audio": [{"audioContent": audio_b64}]},
    }
    async with httpx.AsyncClient(timeout=FAST_TIMEOUT) as client:
        resp = await client.post(
            "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
            json=payload,
            headers={
                "userID": settings.bhashini_user_id,
                "ulcaApiKey": settings.bhashini_api_key,
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["pipelineResponse"][0]["output"][0]["source"]


async def _gemini_asr_fallback(audio_bytes: bytes, language: str) -> str:
    """Gemini multimodal audio transcription fallback."""
    try:
        from google.genai import types
        from llm.gemini_client import get_client, get_verified_model_id
        client = get_client()
        model_id = get_verified_model_id()
        audio_part = types.Part.from_bytes(data=audio_bytes, mime_type="audio/wav")
        response = await client.aio.models.generate_content(
            model=model_id,
            contents=[f"Transcribe this audio accurately in Indian language: {SUPPORTED_LANGUAGES.get(language, 'English')}.", audio_part]
        )
        return response.text.strip() if response.text else ""
    except Exception as exc:
        logger.error("Gemini ASR fallback failed: %s", exc)
        return ""


# ─── Translation (NMT) ────────────────────────────────────────────────────────

async def translate_text(text: str, source_lang: str, target_lang: str, is_query: bool = False) -> str:
    """NMT: translate text between languages."""
    if source_lang == target_lang or not text:
        return text

    if _bhashini_available():
        try:
            return await _bhashini_nmt(text, source_lang, target_lang)
        except Exception as exc:
            logger.warning("Bhashini NMT failed (%s) — falling back to Gemini", exc)
            _mark_bhashini_failure()

    return await _gemini_translate_fallback(text, source_lang, target_lang, is_query=is_query)


async def _bhashini_nmt(text: str, source_lang: str, target_lang: str) -> str:
    payload = {
        "pipelineTasks": [{
            "taskType": "translation",
            "config": {"language": {"sourceLanguage": source_lang, "targetLanguage": target_lang}},
        }],
        "inputData": {"input": [{"source": text}]},
    }
    async with httpx.AsyncClient(timeout=FAST_TIMEOUT) as client:
        resp = await client.post(
            "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
            json=payload,
            headers={
                "userID": settings.bhashini_user_id,
                "ulcaApiKey": settings.bhashini_api_key,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["pipelineResponse"][0]["output"][0]["target"]


async def _gemini_translate_fallback(text: str, source_lang: str, target_lang: str, is_query: bool = False) -> str:
    try:
        from llm.gemini_client import get_model
        lang_name = SUPPORTED_LANGUAGES.get(target_lang, target_lang)
        if is_query or len(text.split()) <= 15:
            system_instruction = (
                f"You are an expert translator. Translate the following short query or question directly into natural, conversational {lang_name}. "
                "Output ONLY the direct translated question (under 10 words). Do NOT answer the question. Do NOT include any introductory or explanatory text."
            )
        else:
            system_instruction = (
                f"You are an expert translator. Translate the weather report into natural, conversational {lang_name}. "
                "Maintain bullet points and exact meteorological metrics (temperatures, wind speeds, rainfall in mm). Output ONLY the translated text without conversational preamble or meta-commentary."
            )
        model = get_model(system_instruction=system_instruction)
        response = await model.generate_content_async(text)
        result = response.text.strip() if response.text else text

        # Strip any meta-commentary or conversational preambles
        result = re.sub(r"^(?:Here is the translation[^\n:]*[:\n]+|Here's the translation[^\n:]*[:\n]+|Sure,[^\n:]*[:\n]+|Certainly,[^\n:]*[:\n]+)", "", result, flags=re.IGNORECASE).strip()
        result = result.strip('"\'')
        return result or text
    except Exception as exc:
        logger.warning("Gemini translate fallback failed (%s) — using rule-based offline translation", exc)
        return _offline_translate(text, target_lang, is_query=is_query)





# ─── Indian Locations Dictionary ───────────────────────────────────────────────

INDIAN_LOCATIONS: dict[str, dict[str, str]] = {
    "hi": {
        "bengaluru": "बेंगलुरु", "bangalore": "बेंगलुरु", "karnataka": "कर्नाटक",
        "mumbai": "मुंबई", "delhi": "दिल्ली", "new delhi": "नई दिल्ली",
        "kolkata": "कोलकाता", "chennai": "चेन्नई", "hyderabad": "हैदराबाद",
        "pune": "पुणे", "ahmedabad": "अहमदाबाद", "jaipur": "जयपुर",
        "lucknow": "लखनऊ", "chandigarh": "चंडीगढ़", "bhopal": "भोपाल",
        "patna": "पटना", "indore": "इंदौर", "kochi": "कोच्चि", "cochin": "कोच्चि",
        "thiruvananthapuram": "तिरुवनंतपुरम", "mysuru": "मैसूरु", "mysore": "मैसूरु",
        "mangaluru": "मंगलुरु", "mangalore": "मंगलुरु", "hubballi": "हुबली", "hubli": "हुबली",
        "belagavi": "बेलगाम", "belgaum": "बेलगाम", "srinagar": "श्रीनगर",
        "shimla": "शिमला", "dehradun": "देहरादून", "ranchi": "राँची",
        "raipur": "रायपुर", "bhubaneswar": "भुवनेश्वर", "surat": "सूरत",
        "vadodara": "वडोदरा", "nagpur": "नागपुर", "coimbatore": "कोयंबटूर",
        "madurai": "मदुरै", "visakhapatnam": "विशाखापत्तनम", "vizag": "विशाखापत्तनम",
        "vijayawada": "विजयवाड़ा", "varanasi": "वाराणसी", "agra": "आगरा",
        "kanpur": "कानपुर", "noida": "नोएडा", "gurugram": "गुरुग्राम", "gurgaon": "गुरुग्राम",
        "whitefield": "व्हाइटफील्ड", "koramangala": "कोरमंगला", "indiranagar": "इंदिरानगर",
        "yelahanka": "यलहंका", "ittagalpura": "इत्तगलपुरा", "presidency university": "प्रेसिडेंसी यूनिवर्सिटी",
        "maharashtra": "महाराष्ट्र", "tamil nadu": "तमिलनाडु", "andhra pradesh": "आंध्र प्रदेश",
        "telangana": "तेलंगाना", "kerala": "केरल", "uttar pradesh": "उत्तर प्रदेश",
        "west bengal": "पश्चिम बंगाल", "gujarat": "गुजरात", "rajasthan": "राजस्थान",
        "punjab": "पंजाब", "haryana": "हरियाणा", "bihar": "बिहार", "odisha": "ओडिशा",
        "madhya pradesh": "मध्य प्रदेश", "assam": "असम", "goa": "गोवा", "india": "भारत",
        "your area": "आपका क्षेत्र",
    },
    "kn": {
        "bengaluru": "ಬೆಂಗಳೂರು", "bangalore": "ಬೆಂಗಳೂರು", "karnataka": "ಕರ್ನಾಟಕ",
        "mumbai": "ಮುಂಬೈ", "delhi": "ದೆಹಲಿ", "new delhi": "ನವದೆಹಲಿ",
        "kolkata": "ಕೋಲ್ಕತ್ತಾ", "chennai": "ಚೆನ್ನೈ", "hyderabad": "ಹೈದರಾಬಾದ್",
        "pune": "ಪುಣೆ", "ahmedabad": "ಅಹಮದಾಬಾದ್", "jaipur": "ಜೈಪುರ",
        "lucknow": "ಲಕ್ನೋ", "chandigarh": "ಚಂಡೀಗಢ", "bhopal": "ಭೋಪಾಲ್",
        "patna": "ಪಾಟ್ನಾ", "indore": "ಇಂದೋರ್", "kochi": "ಕೊಚ್ಚಿ", "cochin": "ಕೊಚ್ಚಿ",
        "thiruvananthapuram": "ತಿರುವನಂತಪುರಂ", "mysuru": "ಮೈಸೂರು", "mysore": "ಮೈಸೂರು",
        "mangaluru": "ಮಂಗಳೂರು", "mangalore": "ಮಂಗಳೂರು", "hubballi": "ಹುಬ್ಬಳ್ಳಿ", "hubli": "ಹುಬ್ಬಳ್ಳಿ",
        "belagavi": "ಬೆಳಗಾವಿ", "belgaum": "ಬೆಳಗಾವಿ", "srinagar": "ಶ್ರೀನಗರ",
        "shimla": "ಶಿಮ್ಲಾ", "dehradun": "ಡೆಹ್ರಾಡೂನ್", "ranchi": "ರಾಂಚಿ",
        "raipur": "ರಾಯಪುರ", "bhubaneswar": "ಭುವನೇಶ್ವರ", "surat": "ಸೂರತ್",
        "vadodara": "ವಡೋದರಾ", "nagpur": "ನಾಗ್ಪುರ", "coimbatore": "ಕೊಯಮತ್ತೂರು",
        "madurai": "ಮಧುರೈ", "visakhapatnam": "ವಿಶಾಖಪಟ್ಟಣಂ", "vizag": "ವಿಶಾಖಪಟ್ಟಣಂ",
        "vijayawada": "ವಿಜಯವಾಡ", "varanasi": "ವಾರಣಾಸಿ", "agra": "ಆಗ್ರಾ",
        "kanpur": "ಕಾನ್ಪುರ", "noida": "ನೋಯ್ಡಾ", "gurugram": "ಗುರುಗ್ರಾಮ್", "gurgaon": "ಗುರುಗ್ರಾಮ್",
        "whitefield": "ವೈಟ್‌ಫೀಲ್ಡ್", "koramangala": "ಕೋರಮಂಗಲ", "indiranagar": "ಇಂದಿರಾನಗರ",
        "yelahanka": "ಯಲಹಂಕ", "ittagalpura": "ಇತ್ತಗಲಪುರ", "presidency university": "ಪ್ರೆಸಿಡೆನ್ಸಿ ವಿಶ್ವವಿದ್ಯಾಲಯ",
        "maharashtra": "ಮಹಾರಾಷ್ಟ್ರ", "tamil nadu": "ತಮಿಳುನಾಡು", "andhra pradesh": "ಆಂಧ್ರಪ್ರದೇಶ",
        "telangana": "ತೆಲಂಗಾಣ", "kerala": "ಕೇರಳ", "uttar pradesh": "ಉತ್ತರ ಪ್ರದೇಶ",
        "west bengal": "ಪಶ್ಚಿಮ ಬಂಗಾಳ", "gujarat": "ಗುಜರಾತ್", "rajasthan": "ರಾಜಸ್ಥಾನ",
        "punjab": "ಪಂಜಾಬ್", "haryana": "ಹರಿಯಾಣ", "bihar": "ಬಿಹಾರ", "odisha": "ಒಡಿಶಾ",
        "madhya pradesh": "ಮಧ್ಯಪ್ರದೇಶ", "assam": "ಅಸ್ಸಾಂ", "goa": "ಗೋವಾ", "india": "ಭಾರತ",
        "your area": "ನಿಮ್ಮ ಪ್ರದೇಶ",
    },
    "bn": {
        "bengaluru": "বেঙ্গালুরু", "bangalore": "বেঙ্গালুরু", "karnataka": "কর্ণাটক",
        "mumbai": "মুম্বই", "delhi": "দিল্লি", "new delhi": "নতুন দিল্লি",
        "kolkata": "কলকাতা", "chennai": "চেন্নাই", "hyderabad": "হায়দ্রাবাদ",
        "pune": "পুনে", "ahmedabad": "আহমেদাবাদ", "jaipur": "জয়পুর",
        "lucknow": "লখনউ", "chandigarh": "চণ্ডীগড়", "bhopal": "ভোপাল",
        "patna": "পাটনা", "indore": "ইন্দোর", "kochi": "কোচি", "cochin": "কোচি",
        "thiruvananthapuram": "তিরুবনন্তপুরম", "mysuru": "মহীশূর", "mysore": "মহীশূর",
        "mangaluru": "ম্যাঙ্গালোর", "mangalore": "ম্যাঙ্গালোর", "hubballi": "হুবলি", "hubli": "হুবলি",
        "belagavi": "বেলগাঁও", "belgaum": "বেলগাঁও", "srinagar": "শ্রীনগর",
        "shimla": "শিমলা", "dehradun": "দেরাদুন", "ranchi": "রাঁচি",
        "raipur": "রায়পুর", "bhubaneswar": "ভুবনেশ্বর", "surat": "সুরাট",
        "vadodara": "ভাদোদরা", "nagpur": "নাগপুর", "coimbatore": "কোয়েম্বাটুর",
        "madurai": "মাদুরাই", "visakhapatnam": "বিশাখাপত্তনম", "vizag": "বিশাখাপত্তনম",
        "vijayawada": "বিজয়ওয়াড়া", "varanasi": "বারাণসী", "agra": "আগ্রা",
        "kanpur": "কানপুর", "noida": "নয়ডা", "gurugram": "গুরুগ্রাম", "gurgaon": "গুরুগ্রাম",
        "whitefield": "হোয়াইটফিল্ড", "koramangala": "কোরামঙ্গলা", "indiranagar": "ইন্দিরানগর",
        "yelahanka": "য়েলাহাঙ্কা", "ittagalpura": "ইত্তাBufferপুর", "presidency university": "প্রেসিডেন্সি বিশ্ববিদ্যালয়",
        "maharashtra": "মহারাষ্ট্র", "tamil nadu": "তামিলনাড়ু", "andhra pradesh": "অন্ধ্রপ্রদেশ",
        "telangana": "তেলেঙ্গানা", "kerala": "কেরালা", "uttar pradesh": "উত্তরপ্রদেশ",
        "west bengal": "পশ্চিমবঙ্গ", "gujarat": "গুজরাট", "rajasthan": "রাজস্থান",
        "punjab": "পাঞ্জাব", "haryana": "হরিয়ানা", "bihar": "বিহার", "odisha": "ওড়িশা",
        "madhya pradesh": "মধ্যপ্রদেশ", "assam": "আসাম", "goa": "গোয়া", "india": "ভারত",
        "your area": "আপনার এলাকা",
    },
    "te": {
        "bengaluru": "బెంగళూరు", "bangalore": "బెంగళూరు", "karnataka": "కర్ణాటక",
        "mumbai": "ముంబై", "delhi": "ఢిల్లీ", "new delhi": "న్యూఢిల్లీ",
        "kolkata": "కోల్‌కతా", "chennai": "చెన్నై", "hyderabad": "హైదరాబాద్",
        "pune": "పూణే", "ahmedabad": "అహ్మదాబాద్", "jaipur": "జైపూర్",
        "lucknow": "లక్నో", "chandigarh": "చండీగఢ్", "bhopal": "భోపాల్",
        "patna": "పాట్నా", "indore": "ఇండోర్", "kochi": "కొచ్చి", "cochin": "కొచ్చి",
        "thiruvananthapuram": "తిరువనంతపురం", "mysuru": "మైసూరు", "mysore": "మైసూరు",
        "mangaluru": "మంగళూరు", "mangalore": "మంగళూరు", "hubballi": "హుబ్లీ", "hubli": "హుబ్లీ",
        "belagavi": "బెల్గాం", "belgaum": "బెల్గాం", "srinagar": "శ్రీనగర్",
        "shimla": "సిమ్లా", "dehradun": "డెహ్రాడూన్", "ranchi": "రాంచీ",
        "raipur": "రాయ్‌పూర్", "bhubaneswar": "భువనేశ్వర్", "surat": "సూరత్",
        "vadodara": "వడోదర", "nagpur": "నాగ్‌పూర్", "coimbatore": "కోయంబత్తూరు",
        "madurai": "మధురై", "visakhapatnam": "విశాఖపట్నం", "vizag": "విశాఖపట్నం",
        "vijayawada": "విజయవాడ", "varanasi": "వారణాసి", "agra": "ఆగ్రా",
        "kanpur": "కాన్పూర్", "noida": "నోయిడా", "gurugram": "గురుగ్రామ్", "gurgaon": "గురుగ్రామ్",
        "whitefield": "వైట్‌ఫీల్డ్", "koramangala": "కోరమంగళ", "indiranagar": "ఇందిరానగర్",
        "yelahanka": "యలహంక", "ittagalpura": "ఇత్తగాలపుర", "presidency university": "ప్రెసిడెన్సీ విశ్వవిద్యాలయం",
        "maharashtra": "మహారాష్ట్ర", "tamil nadu": "తమిళనాడు", "andhra pradesh": "ఆంధ్రప్రదేశ్",
        "telangana": "తెలంగాణ", "kerala": "కేరళ", "uttar pradesh": "ఉత్తర ప్రదేశ్",
        "west bengal": "పశ్చిమ బెంగాల్", "gujarat": "గుజరాత్", "rajasthan": "రాజస్థాన్",
        "punjab": "పంజాబ్", "haryana": "హర్యానా", "bihar": "బీహార్", "odisha": "ఒడిశా",
        "madhya pradesh": "మధ్యప్రదేశ్", "assam": "అస్సాం", "goa": "గోవా", "india": "భారత్",
        "your area": "మీ ప్రాంతం",
    },
    "ta": {
        "bengaluru": "பெங்களூரு", "bangalore": "பெங்களூரு", "karnataka": "கர்நாடகா",
        "mumbai": "மும்பை", "delhi": "தில்லி", "new delhi": "புது தில்லி",
        "kolkata": "கொல்கத்தா", "chennai": "சென்னை", "hyderabad": "ஹைதராபாத்",
        "pune": "புனே", "ahmedabad": "அகமதாபாத்", "jaipur": "ஜெய்ப்பூர்",
        "lucknow": "லக்னோ", "chandigarh": "சண்டிகர்", "bhopal": "போபால்",
        "patna": "பாட்னா", "indore": "இந்தூர்", "kochi": "கொச்சி", "cochin": "கொச்சி",
        "thiruvananthapuram": "திருவனந்தபுரம்", "mysuru": "மைசூர்", "mysore": "மைசூர்",
        "mangaluru": "மங்களூரு", "mangalore": "மங்களூரு", "hubballi": "ஹூப்ளி", "hubli": "ஹூப்ளி",
        "belagavi": "பெல்காம்", "belgaum": "பெல்காம்", "srinagar": "ஸ்ரீநகர்",
        "shimla": "சிம்லா", "dehradun": "டேராடூன்", "ranchi": "ராஞ்சி",
        "raipur": "ராய்ப்பூர்", "bhubaneswar": "புவனேஸ்வர்", "surat": "சூரத்",
        "vadodara": "வதோதரா", "nagpur": "நாக்பூர்", "coimbatore": "கோயம்புத்தூர்",
        "madurai": "மதுரை", "visakhapatnam": "விசாகப்பட்டினம்", "vizag": "விசாகப்பட்டினம்",
        "vijayawada": "விஜயவாடா", "varanasi": "வாரணாசி", "agra": "ஆக்ரா",
        "kanpur": "கான்பூர்", "noida": "நொய்டா", "gurugram": "குருகிராம்", "gurgaon": "குருகிராம்",
        "whitefield": "ஒயிட்பீல்டு", "koramangala": "கோரமங்களா", "indiranagar": "இந்திராநகர்",
        "yelahanka": "யெலஹங்கா", "ittagalpura": "இத்தகல்புரா", "presidency university": "பிரசிடென்சி பல்கலைக்கழகம்",
        "maharashtra": "மகாராஷ்டிரா", "tamil nadu": "தமிழ்நாடு", "andhra pradesh": "ஆந்திரப் பிரதேசம்",
        "telangana": "தெலங்கானா", "kerala": "கேரளா", "uttar pradesh": "உத்தரப் பிரதேசம்",
        "west bengal": "மேற்கு வங்கம்", "gujarat": "குஜராத்", "rajasthan": "ராஜஸ்தான்",
        "punjab": "பஞ்சாப்", "haryana": "ஹரியானா", "bihar": "பீகார்", "odisha": "ஒடிசா",
        "madhya pradesh": "மத்தியப் பிரதேசம்", "assam": "அசாம்", "goa": "கோவா", "india": "இந்தியா",
        "your area": "உங்கள் பகுதி",
    },
    "mr": {
        "bengaluru": "बंगळुरू", "bangalore": "बंगळुरू", "karnataka": "कर्नाटक",
        "mumbai": "मुंबई", "delhi": "दिल्ली", "new delhi": "नवी दिल्ली",
        "kolkata": "कोलकाता", "chennai": "चेन्नई", "hyderabad": "हैदराबाद",
        "pune": "पुणे", "ahmedabad": "अहमदाबाद", "jaipur": "जयपूर",
        "lucknow": "लखनौ", "chandigarh": "चंदिगढ", "bhopal": "भोपाळ",
        "patna": "पाटणा", "indore": "इंदूर", "kochi": "कोची", "cochin": "कोची",
        "thiruvananthapuram": "तिरुवनंतपुरम", "mysuru": "म्हैसूर", "mysore": "म्हैसूर",
        "mangaluru": "मंगळूर", "mangalore": "मंगळूर", "hubballi": "हुबळी", "hubli": "हुबळी",
        "belagavi": "बेळगाव", "belgaum": "बेळगाव", "srinagar": "श्रीनगर",
        "shimla": "शिमला", "dehradun": "डेहराडून", "ranchi": "रांची",
        "raipur": "रायपूर", "bhubaneswar": "भुवनेश्वर", "surat": "सुरत",
        "vadodara": "वडोदरा", "nagpur": "नागपूर", "coimbatore": "कोइम्बतूर",
        "madurai": "मदुराई", "visakhapatnam": "विशाखापट्टणम", "vizag": "विशाखापट्टणम",
        "vijayawada": "विजयवाडा", "varanasi": "वाराणसी", "agra": "आग्रा",
        "kanpur": "कानपूर", "noida": "नोएडा", "gurugram": "गुरुग्राम", "gurgaon": "गुरुग्राम",
        "whitefield": "व्हाईटफील्ड", "koramangala": "कोरोमंगला", "indiranagar": "इंदिरानगर",
        "yelahanka": "यलाहंका", "ittagalpura": "इत्तगलपुरा", "presidency university": "प्रेसिडेंसी विद्यापीठ",
        "maharashtra": "महाराष्ट्र", "tamil nadu": "तमिळनाडू", "andhra pradesh": "आंध्र प्रदेश",
        "telangana": "तेलंगणा", "kerala": "केरळ", "uttar pradesh": "उत्तर प्रदेश",
        "west bengal": "पश्चिम बंगाल", "gujarat": "गुजरात", "rajasthan": "राजस्थान",
        "punjab": "पंजाब", "haryana": "हरियाणा", "bihar": "बिहार", "odisha": "ओडिशा",
        "madhya pradesh": "मध्य प्रदेश", "assam": "आसाम", "goa": "गोवा", "india": "भारत",
        "your area": "तुमचा परिसर",
    },
    "gu": {
        "bengaluru": "બેંગલુરુ", "bangalore": "બેંગલુરુ", "karnataka": "કર્ણાટક",
        "mumbai": "મુંબઈ", "delhi": "દિલ્હી", "new delhi": "નવી દિલ્હી",
        "kolkata": "કોલકાતા", "chennai": "ચેન્નઈ", "hyderabad": "હૈદરાબાદ",
        "pune": "પુણે", "ahmedabad": "અમદાવાદ", "jaipur": "જયપુર",
        "lucknow": "લખનૌ", "chandigarh": "ચંદીગઢ", "bhopal": "ભોપાલ",
        "patna": "પટના", "indore": "ઈન્દોર", "kochi": "કોચી", "cochin": "કોચી",
        "thiruvananthapuram": "તિરુવનંતપુરમ", "mysuru": "મૈસૂર", "mysore": "મૈસૂર",
        "mangaluru": "મેંગલોર", "mangalore": "મેંગલોર", "hubballi": "હુબલી", "hubli": "હુબલી",
        "belagavi": "બેલગામ", "belgaum": "બેલગામ", "srinagar": "શ્રીનગર",
        "shimla": "શિમલા", "dehradun": "દેહરાદૂન", "ranchi": "રાંચી",
        "raipur": "રાયપુર", "bhubaneswar": "ભુવનેશ્વર", "surat": "સુરત",
        "vadodara": "વડોદરા", "nagpur": "નાગપુર", "coimbatore": "કોઈમ્બતૂર",
        "madurai": "મદુરાઈ", "visakhapatnam": "વિશાખાપટ્ટનમ", "vizag": "વિશાખાપટ્ટનમ",
        "vijayawada": "વિજયવાડા", "varanasi": "વારાણસી", "agra": "આગ્રા",
        "kanpur": "કાનપુર", "noida": "નોઈડા", "gurugram": "ગુરુગ્રામ", "gurgaon": "ગુરુગ્રામ",
        "whitefield": "વ્હાઈટફીલ્ડ", "koramangala": "કોરમંગલા", "indiranagar": "ઈન્દિરાનગર",
        "yelahanka": "યેલહંકા", "ittagalpura": "ઇત્તગલપુરા", "presidency university": "પ્રેસિડેન્સી યુનિવર્સિટી",
        "maharashtra": "મહારાષ્ટ્ર", "tamil nadu": "તમિલનાડુ", "andhra pradesh": "આંધ્ર પ્રદેશ",
        "telangana": "તેલંગાણા", "kerala": "કેરળ", "uttar pradesh": "ઉત્તર પ્રદેશ",
        "west bengal": "પશ્ચિમ બંગાળ", "gujarat": "ગુજરાત", "rajasthan": "રાજસ્થાન",
        "punjab": "પંજાબ", "haryana": "હરિયાણા", "bihar": "બિહાર", "odisha": "ઓડિશા",
        "madhya pradesh": "મધ્ય પ્રદેશ", "assam": "આસામ", "goa": "ગોવા", "india": "ભારત",
        "your area": "તમારો વિસ્તાર",
    },
}

UNIT_TRANSLATIONS: dict[str, dict[str, str]] = {
    "hi": {
        "km/h": "किमी/घंटा",
        "mb": "मिलीबार",
        "mm": "मिमी",
        "km": "किमी",
    },
    "kn": {
        "km/h": "ಕಿಮೀ/ಗಂ",
        "mb": "ಮಿಲಿಬಾರ್",
        "mm": "ಮಿಮೀ",
        "km": "ಕಿಮೀ",
    },
    "bn": {
        "km/h": "কিমি/ঘণ্টা",
        "mb": "মিলিবার",
        "mm": "মিমি",
        "km": "কিমি",
    },
    "te": {
        "km/h": "కిమీ/గం",
        "mb": "మిల్లీబార్",
        "mm": "మి.మీ.",
        "km": "కిమీ",
    },
    "ta": {
        "km/h": "கிமீ/மணி",
        "mb": "மில்லிபார்",
        "mm": "மிமீ",
        "km": "கிமீ",
    },
    "mr": {
        "km/h": "किमी/तास",
        "mb": "मिलीबार",
        "mm": "मिमी",
        "km": "किमी",
    },
    "gu": {
        "km/h": "કિમી/કલાક",
        "mb": "મિલીબાર",
        "mm": "મીમી",
        "km": "કિમી",
    },
}

def _translate_location(loc_str: str, lang: str) -> str:
    if not loc_str or lang == "en":
        return loc_str
    dict_map = INDIAN_LOCATIONS.get(lang) or INDIAN_LOCATIONS.get("hi", {})
    if not dict_map:
        return loc_str
    if "," in loc_str:
        parts = [p.strip() for p in loc_str.split(",")]
        trans_parts = [dict_map.get(p.lower(), p) for p in parts]
        return ", ".join(trans_parts)
    return dict_map.get(loc_str.strip().lower(), loc_str)

def _translate_times(text: str, lang: str) -> str:
    """Translate 12-hour times like '2 AM', '11 PM', '3:30 PM' to native Indic format."""
    if not text or lang == "en":
        return text

    def repl(m: re.Match) -> str:
        hour = int(m.group(1))
        minute = m.group(2)
        ampm = m.group(3).upper()
        if ampm == "AM":
            is_night = hour == 12 or hour <= 4
            if lang == "hi":
                period = "रात" if is_night else "सुबह"
                return f"{period} {hour} बजे" if not minute else f"{period} {hour}:{minute} बजे"
            elif lang == "kn":
                period = "ರಾತ್ರಿ" if is_night else "ಬೆಳಿಗ್ಗೆ"
                return f"{period} {hour} ಗಂಟೆಗೆ" if not minute else f"{period} {hour}:{minute}ಕ್ಕೆ"
            elif lang == "bn":
                period = "রাত" if is_night else "সকাল"
                return f"{period} {hour}টায়" if not minute else f"{period} {hour}:{minute}টায়"
            elif lang == "te":
                period = "రాత్రి" if is_night else "ఉదయం"
                return f"{period} {hour} గంటలకు" if not minute else f"{period} {hour}:{minute}కి"
            elif lang == "ta":
                period = "இரவு" if is_night else "காலை"
                return f"{period} {hour} மணிக்கு" if not minute else f"{period} {hour}:{minute} மணிக்கு"
            elif lang == "mr":
                period = "रात्री" if is_night else "सकाळी"
                return f"{period} {hour} वाजता" if not minute else f"{period} {hour}:{minute} वाजता"
            elif lang == "gu":
                period = "રાત્રે" if is_night else "સવારે"
                return f"{period} {hour} વાગ્યે" if not minute else f"{period} {hour}:{minute} વાગ્યે"
            else:
                return f"{hour} AM"
        else:
            is_afternoon = hour == 12 or hour <= 4
            is_evening = 5 <= hour <= 7
            if lang == "hi":
                period = "दोपहर" if is_afternoon else ("शाम" if is_evening else "रात")
                return f"{period} {hour} बजे" if not minute else f"{period} {hour}:{minute} बजे"
            elif lang == "kn":
                period = "ಮಧ್ಯಾಹ್ನ" if is_afternoon else ("ಸಂಜೆ" if is_evening else "ರಾತ್ರಿ")
                return f"{period} {hour} ಗಂಟೆಗೆ" if not minute else f"{period} {hour}:{minute}ಕ್ಕೆ"
            elif lang == "bn":
                period = "দুপুর" if is_afternoon else ("সন্ধ্যা" if is_evening else "রাত")
                return f"{period} {hour}টায়" if not minute else f"{period} {hour}:{minute}টায়"
            elif lang == "te":
                period = "మధ్యాహ్నం" if is_afternoon else ("సాయంత్రం" if is_evening else "రాత్రి")
                return f"{period} {hour} గంటలకు" if not minute else f"{period} {hour}:{minute}కి"
            elif lang == "ta":
                period = "பிற்பகல்" if is_afternoon else ("மாலை" if is_evening else "இரவு")
                return f"{period} {hour} மணிக்கு" if not minute else f"{period} {hour}:{minute} மணிக்கு"
            elif lang == "mr":
                period = "दुपारी" if is_afternoon else ("संध्याकाळी" if is_evening else "रात्री")
                return f"{period} {hour} वाजता" if not minute else f"{period} {hour}:{minute} वाजता"
            elif lang == "gu":
                period = "બપોરે" if is_afternoon else ("સાંજે" if is_evening else "રાત્રે")
                return f"{period} {hour} વાગ્યે" if not minute else f"{period} {hour}:{minute} વાગ્યે"
            else:
                return f"{hour} PM"

    return re.sub(r"\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b", repl, text, flags=re.IGNORECASE)

def _translate_units(text: str, lang: str) -> str:
    if not text or lang == "en":
        return text
    u_dict = UNIT_TRANSLATIONS.get(lang) or UNIT_TRANSLATIONS.get("hi", {})
    for en_unit in ["km/h", "mb", "mm", "km"]:
        if en_unit in u_dict:
            nat = u_dict[en_unit]
            text = re.sub(r"(?<=\d|\s)" + re.escape(en_unit) + r"\b", f"{nat}", text, flags=re.IGNORECASE)
    return text

# ─── Offline Weather & Query Translator ───────────────────────────────────────

OFFLINE_TERMS: dict[str, dict[str, str]] = {
    "hi": {
        "Weather for": "का मौसम",
        "Current Observations & Highlights": "वर्तमान मुख्य मौसम विवरण",
        "Today's Range": "आज का तापमान दायरा",
        "High of": "अधिकतम",
        "Low of": "न्यूनतम",
        "Temperature": "तापमान",
        "Feels like": "महसूस होने वाला तापमान",
        "Condition": "मौसम की स्थिति",
        "Humidity & Wind": "नमी और हवा की गति",
        "Atmosphere": "वायुमंडलीय स्थिति",
        "Pressure": "वायुदाब",
        "Visibility": "दृश्यता",
        "UV Index": "यूवी इंडेक्स",
        "Precipitation & Outlook": "वर्षा व पूर्वानुमान",
        "Rainfall Status": "वर्षा की स्थिति",
        "Rain likely later today": "आज बाद में बारिश होने की पूरी संभावना है",
        "Expected total": "कुल अनुमानित वर्षा",
        "Dry conditions expected today": "आज मौसम मुख्यतः शुष्क रहेगा",
        "Moderate chance of patchy showers": "रुक-रुक कर बौछारें पड़ने की मध्यम संभावना",
        "Tomorrow's Preview": "कल का मौसम पूर्वानुमान",
        "rain probability": "बारिश की संभावना",
        "Air Quality & Outdoor Suitability": "वायु गुणवत्ता व बाहरी गतिविधियाँ",
        "Outdoor Activities": "बाहरी गतिविधियाँ",
        "Running/Jogging": "दौड़ना / जॉगिंग",
        "Cycling": "साइकिल चलाना",
        "Actionable Advisory": "महत्वपूर्ण मौसम परामर्श",
        "Keep an umbrella handy and plan transit around rain windows.": "छाता साथ रखें और बारिश के समय को ध्यान में रखकर यात्रा की योजना बनाएं।",
        "Conditions are pleasant and favorable for all regular travel and outdoor routines.": "मौसम सुहावना है और सभी नियमित यात्राओं और दिनचर्या के लिए अनुकूल है।",
        "Clear sky": "साफ आसमान",
        "Mainly clear": "मुख्यतः साफ",
        "Partly cloudy": "आंशिक रूप से बादल",
        "Overcast": "बादल छाए रहेंगे",
        "Foggy": "कोहरा",
        "Light drizzle": "हल्की बूंदाबांदी",
        "Moderate drizzle": "मध्यम बूंदाबांदी",
        "Dense drizzle": "घनी बूंदाबांदी",
        "Light rain": "हल्की बारिश",
        "Moderate rain": "मध्यम बारिश",
        "Heavy rain": "भारी बारिश",
        "Thunderstorm": "गरज के साथ बारिश",
        "Good": "अच्छा",
        "Fair": "सामान्य",
        "Poor": "खराब",
        "Low": "कम",
        "Moderate": "मध्यम",
        "High": "अधिक",
        "Very High": "बहुत अधिक",
        "Extreme": "अत्यधिक",
        "humidity": "नमी",
        "Wind": "हवा",
        "recorded": "दर्ज",
        "around": "लगभग",
        "up to": "अधिकतम",
        "Light drizzle with a steady shower": "हल्की बूंदाबांदी और लगातार बारिश",
        "steady shower": "लगातार बारिश",
        "Source: India Meteorological Department (IMD)": "स्रोत: भारत मौसम विज्ञान विभाग (IMD)",
        "Source: India Meteorological Department": "स्रोत: भारत मौसम विज्ञान विभाग (IMD)",
        "Urban Commute Advisory": "शहरी यातायात परामर्श",
        "Normal Conditions": "सामान्य स्थिति",
        "Low Risk": "कम जोखिम",
        "Moderate Risk": "मध्यम जोखिम",
        "High Risk": "उच्च जोखिम",
        "Watch for waterlogging at known vulnerable bottlenecks:": "जलभराव के लिए सतर्क रहें, विशेषतः इन संवेदनशील स्थानों पर:",
        "Exercise caution at": "सावधानी बरतें",
        "during downpours.": "भारी बारिश के दौरान।",
    },
    "kn": {
        "Weather for": "ಹವಾಮಾನ ವರದಿ",
        "Current Observations & Highlights": "ಪ್ರಸ್ತುತ ಹವಾಮಾನ ಮುಖ್ಯಾಂಶಗಳು",
        "Today's Range": "ಇಂದಿನ ತಾಪಮಾನ ಶ್ರೇಣಿ",
        "High of": "ಗರಿಷ್ಠ",
        "Low of": "ಕನಿಷ್ಠ",
        "Temperature": "ತಾಪಮಾನ",
        "Feels like": "ಅನಿಸುವ ತಾಪಮಾನ",
        "Condition": "ಹವಾಮಾನ ಸ್ಥಿತಿ",
        "Humidity & Wind": "ಆರ್ದ್ರತೆ ಮತ್ತು ಗಾಳಿಯ ವೇಗ",
        "Atmosphere": "ವಾತಾವರಣ ಸ್ಥಿತಿ",
        "Pressure": "ವಾಯುಭಾರ",
        "Visibility": "ಗೋಚರತೆ",
        "UV Index": "ಯುವಿ ಸೂಚ್ಯಂಕ",
        "Precipitation & Outlook": "ಮಳೆ ಮತ್ತು ಮುನ್ಸೂಚನೆ",
        "Rainfall Status": "ಮಳೆಯ ವಿವರ",
        "Rain likely later today": "ಇಂದು ನಂತರ ಮಳೆಯಾಗುವ ಸಾಧ್ಯತೆಯಿದೆ",
        "Expected total": "ಒಟ್ಟು ನಿರೀಕ್ಷಿತ ಮಳೆ",
        "Dry conditions expected today": "ಇಂದು ಒಣ ಹವಾಮಾನ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ",
        "Moderate chance of patchy showers": "ಅಲ್ಲಲ್ಲಿ ಸಾಧಾರಣ ಮಳೆಯಾಗುವ ಸಾಧ್ಯತೆ",
        "Tomorrow's Preview": "ನಾಳೆಯ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ",
        "rain probability": "ಮಳೆಯ ಸಂಭವನೀಯತೆ",
        "Air Quality & Outdoor Suitability": "ವಾಯು ಗುಣಮಟ್ಟ ಮತ್ತು ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳು",
        "Outdoor Activities": "ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳು",
        "Running/Jogging": "ಓಟ / ಜಾಗಿಂಗ್",
        "Cycling": "ಸೈಕ್ಲಿಂಗ್",
        "Actionable Advisory": "ಮುಖ್ಯ ಹವಾಮಾನ ಸಲಹೆ",
        "Keep an umbrella handy and plan transit around rain windows.": "ಜೊತೆಯಲ್ಲಿ ಕೊಡೆ ಇಟ್ಟುಕೊಳ್ಳಿ ಮತ್ತು ಮಳೆಯ ಸಮಯವನ್ನು ಗಮನಿಸಿ ಪ್ರಯಾಣ ಯೋಜಿಸಿ.",
        "Conditions are pleasant and favorable for all regular travel and outdoor routines.": "ಹವಾಮಾನವು ಆಹ್ಲಾದಕರವಾಗಿದ್ದು ದೈನಂದಿನ ಪ್ರಯಾಣಕ್ಕೆ ಅನುಕೂಲಕರವಾಗಿದೆ.",
        "Clear sky": "ಸ್ವಚ್ಛ ಆಕಾಶ",
        "Mainly clear": "ಹೆಚ್ಚಾಗಿ ಸ್ವಚ್ಛ",
        "Partly cloudy": "ಭಾಗಶಃ ಮೋಡ",
        "Overcast": "ಮೋಡ ಕವಿದ ವಾತಾವರಣ",
        "Foggy": "ಮಂಜು ಕವಿದಿದೆ",
        "Light drizzle": "ಹಗುರ ತುಂತುರು",
        "Moderate drizzle": "ಮಧ್ಯಮ ತುಂತುರು ಮಳೆ",
        "Dense drizzle": "ಸಾಂದ್ರ ತುಂತುರು ಮಳೆ",
        "Light rain": "ಹಗುರ ಮಳೆ",
        "Moderate rain": "ಮಧ್ಯಮ ಮಳೆ",
        "Heavy rain": "ಭಾರಿ ಮಳೆ",
        "Thunderstorm": "ಗುಡುಗು ಸಹಿತ ಮಳೆ",
        "Good": "ಉತ್ತಮ",
        "Fair": "ಸಾಧಾರಣ",
        "Poor": "ಕಳಪೆ",
        "Low": "ಕಡಿಮೆ",
        "Moderate": "ಮಧ್ಯಮ",
        "High": "ಹೆಚ್ಚು",
        "Very High": "ಅತ್ಯಧಿಕ",
        "Extreme": "ತೀವ್ರ",
        "humidity": "ಆರ್ದ್ರತೆ",
        "Wind": "ಗಾಳಿಯ ವೇಗ",
        "recorded": "ದಾಖಲಾಗಿದೆ",
        "around": "ಸುಮಾರು",
        "up to": "ಗರಿಷ್ಠ",
        "Light drizzle with a steady shower": "ಹಗುರ ತುಂತುರು ಮತ್ತು ನಿರಂತರ ಮಳೆ",
        "steady shower": "ನಿರಂತರ ಮಳೆ",
        "Source: India Meteorological Department (IMD)": "ಮೂಲ: ಭಾರತೀಯ ಹವಾಮಾನ ಇಲಾಖೆ (ಐಎಂಡಿ)",
        "Source: India Meteorological Department": "ಮೂಲ: ಭಾರತೀಯ ಹವಾಮಾನ ಇಲಾಖೆ (ಐಎಂಡಿ)",
        "Urban Commute Advisory": "ನಗರ ಸಂಚಾರ ಸಲಹೆ",
        "Normal Conditions": "ಸಾಮಾನ್ಯ ಸ್ಥಿತಿ",
        "Low Risk": "ಕಡಿಮೆ ಅಪಾಯ",
        "Moderate Risk": "ಮಧ್ಯಮ ಅಪಾಯ",
        "High Risk": "ಹೆಚ್ಚಿನ ಅಪಾಯ",
        "Watch for waterlogging at known vulnerable bottlenecks:": "ನೀರು ತುಂಬುವ ಸಂವೇದನಾಶೀಲ ಪ್ರದೇಶಗಳಲ್ಲಿ ಜಾಗರೂಕರಾಗಿರಿ:",
        "Exercise caution at": "ಇಲ್ಲಿ ಎಚ್ಚರ ವಹಿಸಿ",
        "during downpours.": "ಭಾರಿ ಮಳೆಯ ಸಮಯದಲ್ಲಿ।",
    },
    "bn": {
        "Weather for": "এর আবহাওয়া",
        "Current Observations & Highlights": "বর্তমান আবহাওয়া ও প্রধান তথ্য",
        "Today's Range": "আজকের তাপমাত্রা সীমা",
        "High of": "সর্বোচ্চ",
        "Low of": "সর্বনিম্ন",
        "Temperature": "তাপমাত্রা",
        "Feels like": "অনুভূত তাপমাত্রা",
        "Condition": "আবহাওয়ার পরিস্থিতি",
        "Humidity & Wind": "আর্দ্রতা ও বাতাসের গতি",
        "Atmosphere": "বায়ুমণ্ডলীয় অবস্থা",
        "Pressure": "বায়ুচাপ",
        "Visibility": "দৃশ্যমানতা",
        "UV Index": "ইউভি সূচক",
        "Precipitation & Outlook": "বৃষ্টিপাত ও পূর্বাভাস",
        "Rainfall Status": "বৃষ্টিপাতের অবস্থা",
        "Rain likely later today": "আজ পরবর্তী সময়ে বৃষ্টির সম্ভাবনা রয়েছে",
        "Expected total": "মোট আনুমানিক বৃষ্টি",
        "Dry conditions expected today": "আজ আবহাওয়া মূলত শুষ্ক থাকবে",
        "Moderate chance of patchy showers": "মাঝে মাঝে হালকা বৃষ্টির মাঝারি সম্ভাবনা",
        "Tomorrow's Preview": "আগামীকালের পূর্বাভাস",
        "rain probability": "বৃষ্টির সম্ভাবনা",
        "Air Quality & Outdoor Suitability": "বায়ুর মান ও বহিরঙ্গন উপযুক্ততা",
        "Outdoor Activities": "বহিরঙ্গন ক্রিয়াকলাপ",
        "Running/Jogging": "দৌড়ানো / জগিং",
        "Cycling": "সাইকেল চালানো",
        "Actionable Advisory": "জরুরি আবহাওয়া পরামর্শ",
        "Keep an umbrella handy and plan transit around rain windows.": "একটি ছাতা সাথে রাখুন এবং বৃষ্টির সময় বুঝে যাতায়াত পরিকল্পনা করুন।",
        "Conditions are pleasant and favorable for all regular travel and outdoor routines.": "আবহাওয়া মনোরম এবং নিয়মিত চলাচলের জন্য সম্পূর্ণ অনুকূল।",
        "Clear sky": "পরিষ্কার আকাশ",
        "Partly cloudy": "আংশিক মেঘলা",
        "Overcast": "মেঘলা আকাশ",
        "Light drizzle": "হালকা গুঁড়ি বৃষ্টি",
        "Moderate rain": "মাঝারি বৃষ্টি",
        "Heavy rain": "ভারী বৃষ্টি",
        "Good": "ভালো",
        "Fair": "মোটামুটি",
        "Poor": "খারাপ",
        "Low": "কম",
        "Moderate": "মাঝারি",
        "High": "উচ্চ",
        "humidity": "আর্দ্রতা",
        "Wind": "বাতাসের গতি",
        "recorded": "রেকর্ড করা হয়েছে",
        "around": "প্রায়",
        "up to": "সর্বোচ্চ",
        "Light drizzle with a steady shower": "হালকা গুঁড়ি বৃষ্টি এবং অবিরাম ধারা",
        "Source: India Meteorological Department (IMD)": "উৎস: ভারত আবহাওয়া অধিদপ্তর (আইএমডি)",
        "Urban Commute Advisory": "নগর যাতায়াত পরামর্শ",
        "Normal Conditions": "স্বাভাবিক অবস্থা",
        "Low Risk": "কম ঝুঁকি",
        "Moderate Risk": "মাঝারি ঝুঁকি",
        "High Risk": "উচ্চ ঝুঁকি",
        "Watch for waterlogging at known vulnerable bottlenecks:": "পরিচিত সমস্যাজনক স্থানে জলাবদ্ধতার দিকে সতর্ক থাকুন:",
        "Exercise caution at": "এখানে সতর্ক থাকুন",
        "during downpours.": "ভারী বৃষ্টির সময়।",
    },
    "te": {
        "Weather for": "వాతావరణ సమాచారం",
        "Current Observations & Highlights": "ప్రస్తుత ముఖ్యాంశాలు",
        "Today's Range": "నేటి ఉష్ణోగ్రత శ్రేణి",
        "High of": "గరిష్టం",
        "Low of": "కనిష్టం",
        "Temperature": "ఉష్ణోగ్రత",
        "Feels like": "అనిపించే ఉష్ణోగ్రత",
        "Condition": "వాతావరణ పరిస్థితి",
        "Humidity & Wind": "తేమ మరియు గాలి వేగం",
        "Atmosphere": "వాతావరణ పీడనం",
        "Pressure": "పీడనం",
        "Visibility": "దృశ్యమానత",
        "UV Index": "యూవీ సూచిక",
        "Precipitation & Outlook": "వర్షపాతం & అంచనా",
        "Rainfall Status": "వర్షపాతం వివరాలు",
        "Rain likely later today": "ఈరోజు తర్వాత వర్షం పడే అవకాశం ఉంది",
        "Expected total": "మొత్తం అంచనా వర్షపాతం",
        "Dry conditions expected today": "నేడు ప్రధానంగా పొడి వాతావరణం ఉంటుంది",
        "Moderate chance of patchy showers": "అక్కడక్కడ తేలికపాటి జల్లులు పడే అవకాశం",
        "Tomorrow's Preview": "రేపటి వాతావరణ సమాచారం",
        "rain probability": "వర్ష సూచన సంభావ్యత",
        "Air Quality & Outdoor Suitability": "గాలి నాణ్యత & బహిరంగ కార్యకలాపాలు",
        "Outdoor Activities": "బహిరంగ కార్యకలాపాలు",
        "Running/Jogging": "రన్నింగ్ / జాగింగ్",
        "Cycling": "సైక్లింగ్",
        "Actionable Advisory": "కీలక వాతావరణ సలహా",
        "Keep an umbrella handy and plan transit around rain windows.": "గొడుగు వెంట ఉంచుకోండి మరియు వర్షాన్ని బట్టి ప్రయాణాన్ని ప్లాన్ చేసుకోండి.",
        "Clear sky": "నిర్మలమైన ఆకాశం",
        "Partly cloudy": "పాక్షికంగా మేఘావృతం",
        "Overcast": "పూర్తిగా మేఘావృతం",
        "Good": "మంచిది",
        "Fair": "సాధారణం",
        "Poor": "క్షీణించినది",
        "Low": "తక్కువ",
        "Moderate": "మధ్యస్థం",
        "High": "ఎక్కువ",
        "humidity": "తేమ",
        "Wind": "గాలి వేగం",
        "recorded": "నమోదైంది",
        "around": "దాదాపు",
        "up to": "గరిష్టంగా",
        "Light drizzle with a steady shower": "తేలికపాటి చినుకులు మరియు నిరంతర జల్లులు",
        "Source: India Meteorological Department (IMD)": "మూలం: భారత వాతావరణ శాఖ (ఐఎండీ)",
        "Urban Commute Advisory": "పట్టణ ప్రయాణ సలహా",
        "Normal Conditions": "సాధారణ పరిస్థితులు",
        "Low Risk": "తక్కువ ప్రమాదం",
        "Moderate Risk": "మధ్యస్థ ప్రమాదం",
        "High Risk": "అధిక ప్రమాదం",
        "Watch for waterlogging at known vulnerable bottlenecks:": "నీటి నిలకడ ఏర్పడే సున్నితమైన ప్రాంతాలలో జాగ్రత్తగా ఉండండి:",
        "Exercise caution at": "ఇక్కడ జాగ్రత్తగా ఉండండి",
        "during downpours.": "భారీ వర్షం సమయంలో।",
    },
    "ta": {
        "Weather for": "வானிலை விவரம்",
        "Current Observations & Highlights": "தற்போதைய முக்கிய வானிலை விவரங்கள்",
        "Today's Range": "இன்றைய வெப்பநிலை வரம்பு",
        "High of": "அதிகபட்சம்",
        "Low of": "குறைந்தபட்சம்",
        "Temperature": "வெப்பநிலை",
        "Feels like": "உணரப்படும் வெப்பநிலை",
        "Condition": "வானிலை நிலை",
        "Humidity & Wind": "ஈரப்பதம் மற்றும் காற்றின் வேகம்",
        "Atmosphere": "வளிமண்டல நிலை",
        "Pressure": "காற்றழுத்தம்",
        "Visibility": "பார்வை தூரம்",
        "UV Index": "புற ஊதாக் குறியீடு",
        "Precipitation & Outlook": "மழைப்பொழிவு & முன்னறிவிப்பு",
        "Rainfall Status": "மழைப்பொழிவு நிலை",
        "Rain likely later today": "இன்று பின்னர் மழை பெய்ய வாய்ப்புள்ளது",
        "Expected total": "எதிர்பார்க்கப்படும் மொத்த மழை",
        "Dry conditions expected today": "இன்று பெரும்பாலும் வறண்ட வானிலை நிலவும்",
        "Moderate chance of patchy showers": "ஆங்காங்கே லேசான மழை பெய்ய வாய்ப்பு",
        "Tomorrow's Preview": "நாளைய வானிலை விவரம்",
        "rain probability": "மழைக்கான வாய்ப்பு",
        "Air Quality & Outdoor Suitability": "காற்றின் தரம் & வெளிப்புறப் பயன்பாடு",
        "Outdoor Activities": "வெளிப்புற நடவடிக்கைகள்",
        "Running/Jogging": "ஓடுதல் / ஜாக்கிங்",
        "Cycling": "சைக்கிள் ஓட்டுதல்",
        "Actionable Advisory": "முக்கிய வானிலை ஆலோசனை",
        "Keep an umbrella handy and plan transit around rain windows.": "குடையை உடன் வைத்திருக்கவும், மழைக்கு ஏற்ப பயணத்தைத் திட்டமிடவும்.",
        "Clear sky": "தெளிவான வானம்",
        "Partly cloudy": "பகுதி மேகமூட்டம்",
        "Overcast": "முழு மேகமூட்டம்",
        "Good": "நன்று",
        "Fair": "சுமாரானது",
        "Poor": "மோசமானது",
        "Low": "குறைவு",
        "Moderate": "மிதமானது",
        "High": "அதிகம்",
        "humidity": "ஈரப்பதம்",
        "Wind": "காற்றின் வேகம்",
        "recorded": "பதிவாகியுள்ளது",
        "around": "சுமார்",
        "up to": "அதிகபட்சமாக",
        "Light drizzle with a steady shower": "லேசான தூறல் மற்றும் தொடர் மழை",
        "Source: India Meteorological Department (IMD)": "ஆதாரம்: இந்திய வானிலை ஆய்வுத் துறை (IMD)",
        "Urban Commute Advisory": "நகர போக்குவரத்து ஆலோசனை",
        "Normal Conditions": "சாதாரண நிலை",
        "Low Risk": "குறைந்த ஆபத்து",
        "Moderate Risk": "மிதமான ஆபத்து",
        "High Risk": "அதிக ஆபத்து",
        "Watch for waterlogging at known vulnerable bottlenecks:": "தண்ணீர் தேங்கும் பாதிப்புக்குள்ளான பகுதிகளில் கவனமாக இருங்கள்:",
        "Exercise caution at": "இங்கே எச்சரிக்கையாக இருங்கள்",
        "during downpours.": "கனமழையின் போது.",
    },
    "mr": {
        "Weather for": "चे हवामान",
        "Current Observations & Highlights": "सद्य हवामान ठळक नोंदी",
        "Today's Range": "आजची तापमान मर्यादा",
        "High of": "कमाल",
        "Low of": "किमान",
        "Temperature": "तापमान",
        "Feels like": "जावणारे तापमान",
        "Condition": "हवामानाची स्थिती",
        "Humidity & Wind": "आर्द्रता आणि वाऱ्याचा वेग",
        "Atmosphere": "वातावरणीय स्थिती",
        "Pressure": "हवेचा दाब",
        "Visibility": "दृश्यमानता",
        "UV Index": "यूव्ही निर्देशांक",
        "Precipitation & Outlook": "पाऊस आणि अंदाज",
        "Rainfall Status": "पावसाची स्थिती",
        "Rain likely later today": "आज नंतर पाऊस पडण्याची शक्यता आहे",
        "Expected total": "एकूण अंदाजित पाऊस",
        "Dry conditions expected today": "आज मुख्यत्वे कोरडे हवामान राहील",
        "Moderate chance of patchy showers": "तुरळक ठिकाणी हलक्या पावसाची शक्यता",
        "Tomorrow's Preview": "उद्याचा हवामान अंदाज",
        "rain probability": "पावसाची शक्यता",
        "Air Quality & Outdoor Suitability": "हवेची गुणवत्ता आणि मैदानी कामे",
        "Outdoor Activities": "मैदानी उपक्रम",
        "Running/Jogging": "धावणे / जॉगिंग",
        "Cycling": "सायकल चालवणे",
        "Actionable Advisory": "महत्त्वाचा हवामान सल्ला",
        "Keep an umbrella handy and plan transit around rain windows.": "छत्री सोबत ठेवा आणि पावसाच्या अंदाजानुसार प्रवासाचे नियोजन करा.",
        "Clear sky": "निरभ्र आकाश",
        "Partly cloudy": "अंशतः ढगाळ",
        "Overcast": "ढगाळ वातावरण",
        "Good": "उत्तम",
        "Fair": "मध्यम",
        "Poor": "वाईट",
        "Low": "कमी",
        "Moderate": "मध्यम",
        "High": "जास्त",
        "humidity": "आर्द्रता",
        "Wind": "वाऱ्याचा वेग",
        "recorded": "नोंदवले गेले",
        "around": "सुमारे",
        "up to": "कमाल",
        "Light drizzle with a steady shower": "हलकी रिमझिम आणि संततधार पाऊस",
        "Source: India Meteorological Department (IMD)": "स्रोत: भारतीय हवामान विभाग (IMD)",
        "Urban Commute Advisory": "शहरी वाहतूक सल्ला",
        "Normal Conditions": "सामान्य परिस्थिती",
        "Low Risk": "कमी धोका",
        "Moderate Risk": "मध्यम धोका",
        "High Risk": "जास्त धोका",
        "Watch for waterlogging at known vulnerable bottlenecks:": "पाणी साचण्याच्या संवेदनशील ठिकाणी सतर्क राहा:",
        "Exercise caution at": "येथे सावधगिरी बाळगा",
        "during downpours.": "मुसळधार पावसात.",
    },
    "gu": {
        "Weather for": "નું હવામાન",
        "Current Observations & Highlights": "હાલની મુખ્ય હવામાન વિગતો",
        "Today's Range": "આજની તાપમાન મર્યાદા",
        "High of": "મહત્તમ",
        "Low of": "લઘુત્તમ",
        "Temperature": "તાપમાન",
        "Feels like": "અનુભવાતું તાપમાન",
        "Condition": "હવામાન સ્થિતિ",
        "Humidity & Wind": "ભેજ અને પવનની ગતિ",
        "Atmosphere": "વાતાવરણીય દબાણ",
        "Pressure": "દબાણ",
        "Visibility": "દ્રશ્યતા",
        "UV Index": "યુવી ઇન્ડેક્સ",
        "Precipitation & Outlook": "વરસાદ અને આગાહી",
        "Rainfall Status": "વરસાદની સ્થિતિ",
        "Rain likely later today": "આજે પાછળથી વરસાદ પડવાની સંભાવના છે",
        "Expected total": "કુલ અંદાજિત વરસાદ",
        "Dry conditions expected today": "આજે મુખ્યત્વે સૂકું હવામાન રહેશે",
        "Tomorrow's Preview": "આવતીકાલની હવામાન આગાહી",
        "rain probability": "વરસાદની સંભાવના",
        "Air Quality & Outdoor Suitability": "હવાની ગુણવત્તા અને આઉટડોર અનુકૂળતા",
        "Outdoor Activities": "આઉટડોર પ્રવૃત્તિઓ",
        "Running/Jogging": "દોડવું / જોગિંગ",
        "Cycling": "સાયકલિંગ",
        "Actionable Advisory": "મહત્વપૂર્ણ હવામાન સલાહ",
        "Keep an umbrella handy and plan transit around rain windows.": "સાથે છત્રી રાખો અને વરસાદના સમય અનુસાર મુસાફરીનું આયોજન કરો.",
        "Clear sky": "સ્વચ્છ આકાશ",
        "Partly cloudy": "આંશિક વાદળછાયું",
        "Overcast": "વાદળછાયું વાતાવરણ",
        "Good": "સારું",
        "Fair": "સામાન્ય",
        "Poor": "ખરાબ",
        "Low": "ઓછું",
        "Moderate": "મધ્યમ",
        "High": "વધુ",
        "humidity": "ભેજ",
        "Wind": "પવન",
        "recorded": "નોંધાયેલ",
        "around": "લગભગ",
        "up to": "મહત્તમ",
        "Light drizzle with a steady shower": "હળવી ઝરમર અને સતત વરસાદ",
        "Source: India Meteorological Department (IMD)": "સ્રોત: ભારત હવામાન વિભાગ (IMD)",
        "Urban Commute Advisory": "શહેરી વાહનવ્યવહાર સલાહ",
        "Normal Conditions": "સામાન્ય સ્થિતિ",
        "Low Risk": "ઓછો જોખમ",
        "Moderate Risk": "મધ્યમ જોખમ",
        "High Risk": "વધારે જોખમ",
        "Watch for waterlogging at known vulnerable bottlenecks:": "જળ ભરાવ થઈ શકે તેવા સ્થળોએ સાવધ રહો:",
        "Exercise caution at": "અહીં સાવધ રહો",
        "during downpours.": "ભારે વરસાદ દરમિયાન.",
    },
}

OFFLINE_CHIP_TEMPLATES: dict[str, list[str]] = {
    "hi": [
        "क्या आज {loc} में बारिश होगी?",
        "कल {loc} में मौसम कैसा रहेगा?",
        "{loc} में आज वायु गुणवत्ता (AQI) कैसी है?",
    ],
    "bn": [
        "{loc}-এ কি আজ বৃষ্টি হবে?",
        "কাল {loc}-এর আবহাওয়া কেমন থাকবে?",
        "{loc}-এ আজকের বায়ুর মান (AQI) কেমন?",
    ],
    "te": [
        "{loc}లో ఈరోజు వర్షం పడుతుందా?",
        "రేపు {loc}లో వాతావరణం ఎలా ఉంటుంది?",
        "{loc}లో నేటి వాయు నాణ్యత (AQI) ఎంత?",
    ],
    "ta": [
        "{loc}ல் இன்று மழை பெய்யுமா?",
        "நாளை {loc}ல் வானிலை எப்படி இருக்கும்?",
        "{loc}ல் இன்றைய காற்றின் தரம் (AQI) என்ன?",
    ],
    "kn": [
        "{loc}ನಲ್ಲಿ ಇಂದು ಮಳೆ ಬರುತ್ತದೆಯೇ?",
        "ನಾಳೆ {loc}ನಲ್ಲಿ ಹವಾಮಾನ ಹೇಗಿರುತ್ತದೆ?",
        "{loc}ನಲ್ಲಿ ಇಂದಿನ ವಾಯು ಗುಣಮಟ್ಟ (AQI) ಎಷ್ಟು?",
    ],
    "mr": [
        "{loc} मध्ये आज पाऊस पडेल का?",
        "उद्या {loc} चे हवामान कसे असेल?",
        "{loc} मध्ये आजची हवेची गुणवत्ता (AQI) काय आहे?",
    ],
    "gu": [
        "{loc} માં આજે વરસાદ પડશે?",
        "આવતીકાલે {loc} માં હવામાન કેવું રહેશે?",
        "{loc} માં આજની હવાની ગુણવત્તા (AQI) કેવી છે?",
    ],
}

IMD_WARNING_TRANSLATIONS: dict[str, dict[str, str]] = {
    "kn": {
        "warning_in_effect": r"\1 ಪ್ರದೇಶದಲ್ಲಿ ಗುಡುಗು ಮತ್ತು ಸಿಡಿಲು ಸಹಿತ ಮಳೆಯ ಎಚ್ಚರಿಕೆ ಜಾರಿಯಲ್ಲಿದೆ:",
        "yellow_watch": "ಗುಡುಗು ಮತ್ತು ಸಿಡಿಲು ಎಚ್ಚರಿಕೆ",
        "severe_orange": "ತೀವ್ರ ಗುಡುಗು ಮತ್ತು ಆಲಿಕಲ್ಲು ಮಳೆ ಕಿತ್ತಳೆ ಎಚ್ಚರಿಕೆ",
        "heavy_rain_orange": "ಭಾರಿ ಮಳೆಯ ಕಿತ್ತಳೆ ಎಚ್ಚರಿಕೆ",
        "mod_heavy_rain_yellow": "ಮಧ್ಯಮದಿಂದ ಭಾರಿ ಮಳೆಯ ಹಳದಿ ಎಚ್ಚರಿಕೆ",
        "squally_winds": "ಬಿರುಗಾಳಿಯ ಹಳದಿ ಎಚ್ಚರಿಕೆ",
        "seasonal_watch": r"\1 ಗಾಗಿ ಐಎಂಡಿ ಋತುಮಾನದ ಗುಡುಗು ಸಹಿತ ಮಳೆಯ ನಿಗಾ ಸಕ್ರಿಯವಾಗಿದೆ. ಮಧ್ಯಾಹ್ನ ಪ್ರತ್ಯೇಕ ಸ್ಥಳಗಳಲ್ಲಿ ಗುಡುಗು, ಸಿಡಿಲು ಮತ್ತು ಬಿರುಗಾಳಿಯ ಸಾಧ್ಯತೆಯಿದೆ. ಲೈವ್ ರೇಡಾರ್ ಮೂಲಕ ಅಪ್‌ಡೇಟ್ ಆಗಿರಿ.",
        "isolated_lightning": "ಸಿಡಿಲು ಬಡಿಯುವ ಸಾಧ್ಯತೆ, ಬಿರುಗಾಳಿ ಮತ್ತು ಹಠಾತ್ ಮಳೆಯ ನಿರೀಕ್ಷೆಯಿದೆ.",
        "safety_advisory": "ಐಎಂಡಿ ಸುರಕ್ಷತಾ ಸಲಹೆ: ಸಿಡಿಲು ಬಡಿಯುವಾಗ ಮನೆಯೊಳಗೇ ಇರಿ; ವಿದ್ಯುತ್ ಉಪಕರಣಗಳನ್ನು ಅನ್‌ಪ್ಲಗ್ ಮಾಡಿ ಮತ್ತು ಪ್ರತ್ಯೇಕ ಮರಗಳ ಕೆಳಗೆ ಆಶ್ರಯ ಪಡೆಯುವುದನ್ನು ತಪ್ಪಿಸಿ.",
        "imd_source": "ಮೂಲ: ಭಾರತೀಯ ಹವಾಮಾನ ಇಲಾಖೆ (ಐಎಂಡಿ)",
    },
    "hi": {
        "warning_in_effect": r"\1 के लिए मेघगर्जन एवं आकाशीय बिजली की येलो वॉच प्रभावी है:",
        "yellow_watch": "मेघगर्जन एवं आकाशीय बिजली की चेतावनी",
        "severe_orange": "तीव्र मेघगर्जन व ओलावृष्टि की ऑरेंज चेतावनी",
        "heavy_rain_orange": "भारी वर्षा का ऑरेंज अलर्ट",
        "mod_heavy_rain_yellow": "मध्यम से भारी बारिश की येलो वॉच",
        "squally_winds": "तेज हवाओं की येलो वॉच",
        "seasonal_watch": r"\1 के लिए आईएमडी मौसमी मेघगर्जन वॉच सक्रिय है। दोपहर में छिटपुट गरज-चमक और तेज हवाओं की संभावना है। लाइव रडार से अपडेट रहें।",
        "isolated_lightning": "अलग-अलग स्थानों पर बिजली गिरने, तेज हवाओं और अचानक गरज के साथ बौछारें पड़ने की संभावना है।",
        "safety_advisory": "आईएमडी सुरक्षा सलाह: बिजली चमकने के दौरान घरों के भीतर रहें; संवेदनशील बिजली के उपकरणों को अनप्लग करें और अकेले पेड़ों के नीचे शरण लेने से बचें।",
        "imd_source": "स्रोत: भारत मौसम विज्ञान विभाग (IMD)",
    },
    "bn": {
        "warning_in_effect": r"\1 এলাকায় বজ্রবিদ্যুৎ সহ ঝড়ের সতর্কতা কার্যকর:",
        "yellow_watch": "বজ্রবিদ্যুৎ সহ ঝড়ের সতর্কতা",
        "severe_orange": "তীব্র ঝড় ও শিলাবৃষ্টির কমলা সতর্কতা",
        "heavy_rain_orange": "ভারী বৃষ্টির কমলা সতর্কতা",
        "mod_heavy_rain_yellow": "মাঝারি থেকে ভারী বৃষ্টির হলুদ সতর্কতা",
        "squally_winds": "দমকা বাতাসের হলুদ সতর্কতা",
        "seasonal_watch": r"\1-এর জন্য আইএমডি মরশুমি বজ্রঝড়ের সতর্কতা সক্রিয়।",
        "isolated_lightning": "বজ্রপাত, তীব্র দমকা বাতাস এবং হঠাৎ বৃষ্টির সম্ভাবনা রয়েছে।",
        "safety_advisory": "আইএমডি নিরাপত্তা নির্দেশিকা: বজ্রপাতের সময় ঘরের ভেতরে থাকুন; বৈদ্যুতিক ডিভাইস সংযোগ বিচ্ছিন্ন করুন।",
        "imd_source": "উৎস: ভারত আবহাওয়া অধিদপ্তর (আইএমডি)",
    },
    "te": {
        "warning_in_effect": r"\1 ప్రాంతంలో ఉరుములు మరియు మెరుపుల హెచ్చరిక అమలులో ఉంది:",
        "yellow_watch": "ఉరుములు మరియు మెరుపుల పసుపు హెచ్చరిక",
        "severe_orange": "తీవ్రమైన ఉరుములు మరియు వడగండ్ల నారింజ హెచ్చరిక",
        "heavy_rain_orange": "భారీ వర్షం నారింజ హెచ్చరిక",
        "mod_heavy_rain_yellow": "మధ్యస్థం నుండి భారీ వర్షం పసుపు హెచ్చరిక",
        "squally_winds": "ఈదురు గాలుల హెచ్చరిక",
        "seasonal_watch": r"\1 కొరకు ఐఎಂಡీ సీజనల్ హెచ్చరిక యాక్టివ్ గా ఉంది.",
        "isolated_lightning": "పిడుగులు పడే అవకాశం, ఈదురుగాలులు మరియు ఆకస్మిక వర్షం వచ్చే సూచన ఉంది.",
        "safety_advisory": "ఐఎండీ భద్రతా సలహా: మెరుపులు వచ్చే సమయంలో ఇళ్లలోనే ఉండండి; సున్నితమైన విద్యుత్ ఉపకరణాలను అన్‌ప్లగ్ చేయండి.",
        "imd_source": "మూలం: భారత వాతావరణ శాఖ (ఐఎండీ)",
    },
    "ta": {
        "warning_in_effect": r"\1 பகுதியில் இடியுடன் கூடிய மின்னல் எச்சரிக்கை விடுக்கப்பட்டுள்ளது:",
        "yellow_watch": "இடியுடன் கூடிய மின்னல் எச்சரிக்கை",
        "severe_orange": "கடும் இடியுடன் கூடிய ஆலங்கட்டி மழை ஆரஞ்சு எச்சரிக்கை",
        "heavy_rain_orange": "கனமழை ஆரஞ்சு எச்சரிக்கை",
        "mod_heavy_rain_yellow": "மிதமானது முதல் கனமழைக்கான மஞ்சள் எச்சரிக்கை",
        "squally_winds": "சூறாவளி காற்று எச்சரிக்கை",
        "seasonal_watch": r"\1-க்கு ஐஎம்டி பருவகால இடிமின்னல் எச்சரிக்கை அமலில் உள்ளது.",
        "isolated_lightning": "மின்னல் தாக்குதல், சூறாவளி காற்று மற்றும் திடீர் இடியுடன் கூடிய மழை பெய்ய வாய்ப்புள்ளது.",
        "safety_advisory": "ஐஎம்டி பாதுகாப்பு வழிகாட்டுதல்: மின்னல் வெட்டும் போது வீட்டுக்குள்ளேயே இருங்கள்; மின்சாதனங்களை அணைக்கவும்.",
        "imd_source": "ஆதாரம்: இந்திய வானிலை ஆய்வுத் துறை (IMD)",
    },
    "mr": {
        "warning_in_effect": r"\1 भागात मेघगर्जना आणि विजांचा इशारा लागू आहे:",
        "yellow_watch": "मेघगर्जना आणि विजांचा पिवळा इशारा",
        "severe_orange": "तीव्र मेघगर्जना आणि गारपिटीचा नारंगी इशारा",
        "heavy_rain_orange": "मुसळधार पावसाचा नारंगी इशारा",
        "mod_heavy_rain_yellow": "मध्यम ते मुसळधार पावसाचा पिवळा इशारा",
        "squally_winds": "वादळी वाऱ्यांचा पिवळा इशारा",
        "seasonal_watch": r"\1 साठी आयएमडी हंगामी इशारा सक्रिय आहे.",
        "isolated_lightning": "काही ठिकाणी वीज पडण्याची शक्यता, सोसाट्याचा वारा आणि अचानक पाऊस येण्याचा अंदाज आहे.",
        "safety_advisory": "आयएमडी सुरक्षा सल्ला: विजेच्या गडगडाटादरम्यान घरामध्येच राहा; संवेदनशील उपकरणे अनप्लग करा.",
        "imd_source": "स्रोत: भारतीय हवामान विभाग (IMD)",
    },
    "gu": {
        "warning_in_effect": r"\1 વિસ્તારમાં ગાજવીજ અને વીજળીની ચેતવણી અમલમાં છે:",
        "yellow_watch": "ગાજવીજ અને વીજળીની પીળી ચેતવણી",
        "severe_orange": "ભારે ગાજવીજ અને કરા સાથેની ઓરેન્જ ચેતવણી",
        "heavy_rain_orange": "ભારે વરસાદની ઓરેન્જ ચેતવણી",
        "mod_heavy_rain_yellow": "મધ્યમથી ભારે વરસાદની પીળી ચેતવણી",
        "squally_winds": "તોફાની પવનની ચેતવણી",
        "seasonal_watch": r"\1 માટે આઈએમડી મોસમી ચેતવણી સક્રિય છે.",
        "isolated_lightning": "વીજળી પડવાની શક્યતા, તેજ પવન અને અચાનક વરસાદની આગાહી છે.",
        "safety_advisory": "આઈએમડી સુરક્ષા સલાહ: વીજળીના કડાકા વખતે ઘરમાં જ રહો; ઇલેક્ટ્રોનિક ઉપકરણો અનપ્લગ કરો.",
        "imd_source": "સ્રોત: ભારત હવામાન વિભાગ (IMD)",
    },
}


def _offline_translate(text: str, target_lang: str, is_query: bool = False) -> str:
    """Deterministic, robust fallback translator for meteorological reports and follow-up queries."""
    if not text or target_lang == "en":
        return text

    terms = dict(OFFLINE_TERMS.get(target_lang, OFFLINE_TERMS["hi"]))

    # If it is a follow-up query
    if is_query:
        clean = text.strip().rstrip("?").strip()
        m_rain = re.search(r"will it rain in\s+(.+?)(?:\s+later today|\s+today)?$", clean, re.I)
        if m_rain:
            loc = m_rain.group(1).strip()
            loc_trans = _translate_location(loc, target_lang)
            return OFFLINE_CHIP_TEMPLATES.get(target_lang, OFFLINE_CHIP_TEMPLATES["hi"])[0].format(loc=loc_trans)

        m_tom = re.search(r"(?:what is the forecast for tomorrow in|tomorrow'?s? forecast in|forecast for tomorrow in)\s+(.+)$", clean, re.I)
        if m_tom:
            loc = m_tom.group(1).strip()
            loc_trans = _translate_location(loc, target_lang)
            return OFFLINE_CHIP_TEMPLATES.get(target_lang, OFFLINE_CHIP_TEMPLATES["hi"])[1].format(loc=loc_trans)

        m_aqi = re.search(r"(?:what is the current air quality\s*(?:\(aqi\))?\s*in|air quality.*?\s*in|aqi\s*in)\s+(.+)$", clean, re.I)
        if m_aqi:
            loc = m_aqi.group(1).strip()
            loc_trans = _translate_location(loc, target_lang)
            return OFFLINE_CHIP_TEMPLATES.get(target_lang, OFFLINE_CHIP_TEMPLATES["hi"])[2].format(loc=loc_trans)

    translated = text

    # 1. Handle "Weather for <location>" header naturally
    m_header = re.search(r"Weather for\s+([^\n\r*]+)", translated, re.I)
    if m_header:
        loc_name = m_header.group(1).strip()
        loc_translated = _translate_location(loc_name, target_lang)
        header_patterns = {
            "hi": f"{loc_translated} का मौसम",
            "bn": f"{loc_translated}-এর আবহাওয়া",
            "te": f"{loc_translated} వాతావరణ సమాచారం",
            "ta": f"{loc_translated} வானிலை விவரம்",
            "kn": f"{loc_translated} ಹವಾಮಾನ ವರದಿ",
            "mr": f"{loc_translated} चे हवामान",
            "gu": f"{loc_translated} નું હવામાન",
        }
        repl = header_patterns.get(target_lang, f"{loc_translated} का मौसम")
        translated = re.sub(r"Weather for\s+" + re.escape(loc_name), repl, translated, flags=re.I)

    # 2. Handle IMD Warning Paragraphs before individual word token matching
    warn_dict = IMD_WARNING_TRANSLATIONS.get(target_lang)
    if warn_dict:
        def repl_warn(m):
            raw_loc = m.group(1).strip()
            loc_t = _translate_location(raw_loc, target_lang)
            tpl = warn_dict["warning_in_effect"]
            return tpl.replace(r"\1", loc_t)

        translated = re.sub(r"Yellow Watch for Thunderstorms & Lightning in effect for\s+([^\n.]+)", repl_warn, translated, flags=re.IGNORECASE)
        translated = re.sub(r"Yellow Watch for Thunderstorms & Lightning", warn_dict["yellow_watch"], translated, flags=re.IGNORECASE)
        translated = re.sub(r"Orange Warning for Severe Thunderstorms & Hail", warn_dict["severe_orange"], translated, flags=re.IGNORECASE)
        translated = re.sub(r"Orange Alert for Heavy Rainfall", warn_dict["heavy_rain_orange"], translated, flags=re.IGNORECASE)
        translated = re.sub(r"Yellow Watch for Moderate to Heavy Rain", warn_dict["mod_heavy_rain_yellow"], translated, flags=re.IGNORECASE)
        translated = re.sub(r"Yellow Watch for Squally Winds", warn_dict["squally_winds"], translated, flags=re.IGNORECASE)
        translated = re.sub(r"IMD Seasonal Convective Watch active for\s+([^\n.]+)", repl_warn, translated, flags=re.IGNORECASE)
        translated = re.sub(r"Isolated lightning strikes, convective gusty winds, and sudden thundery showers anticipated\.?", warn_dict["isolated_lightning"], translated, flags=re.IGNORECASE)
        translated = re.sub(r"IMD Safety Advisory:\s*Stay indoors during lightning activity;?\s*unplug sensitive electronic devices and avoid sheltering under isolated trees\.?", warn_dict["safety_advisory"], translated, flags=re.IGNORECASE)
        translated = re.sub(r"Source: India Meteorological Department \(IMD\)", warn_dict["imd_source"], translated, flags=re.IGNORECASE)
        translated = re.sub(r"Source: India Meteorological Department", warn_dict["imd_source"], translated, flags=re.IGNORECASE)

    # 3. Translate times (e.g. 2 AM, 4:30 PM)
    translated = _translate_times(translated, target_lang)

    # 4. Sort terms longest-first to prevent partial collisions
    sorted_terms = sorted(terms.items(), key=lambda x: len(x[0]), reverse=True)
    for en_phrase, nat_phrase in sorted_terms:
        if re.search(r"[\s\-_/&():.,]", en_phrase):
            translated = re.sub(re.escape(en_phrase), nat_phrase, translated, flags=re.IGNORECASE)
        else:
            translated = re.sub(r"\b" + re.escape(en_phrase) + r"\b", nat_phrase, translated, flags=re.IGNORECASE)

    # 5. Translate meteorological units (km/h, mb, mm, km)
    translated = _translate_units(translated, target_lang)

    # 6. Replace any remaining occurrences of English Indian city/state names
    loc_dict = INDIAN_LOCATIONS.get(target_lang) or INDIAN_LOCATIONS.get("hi", {})
    for en_loc, nat_loc in sorted(loc_dict.items(), key=lambda x: len(x[0]), reverse=True):
        translated = re.sub(r"\b" + re.escape(en_loc) + r"\b", nat_loc, translated, flags=re.IGNORECASE)

    # 7. Clean duplicate punctuation (like :. -> :)
    translated = re.sub(r":\.\s*", ": ", translated)

    return translated

# ─── Text to Speech (TTS) ─────────────────────────────────────────────────────

_tts_cache: dict[tuple, bytes] = {}
MAX_TTS_CACHE = 50


async def text_to_speech(text: str, language: str = "en") -> bytes:
    """TTS: text → mp3 audio bytes."""
    clean_text = _clean_text_for_tts(text)
    cache_key = (hash(clean_text), language)

    if cache_key in _tts_cache:
        return _tts_cache[cache_key]

    audio_bytes = None

    if _bhashini_available() and language != "en":
        try:
            audio_bytes = await _bhashini_tts(clean_text, language)
        except Exception as exc:
            logger.warning("Bhashini TTS failed (%s) — fast failover to gTTS", exc)
            _mark_bhashini_failure()

    if not audio_bytes:
        audio_bytes = await _gtts_fallback(clean_text, language)

    # Cache it
    if audio_bytes:
        if len(_tts_cache) >= MAX_TTS_CACHE:
            oldest = next(iter(_tts_cache))
            del _tts_cache[oldest]
        _tts_cache[cache_key] = audio_bytes

    return audio_bytes or b""


async def _bhashini_tts(text: str, language: str) -> bytes:
    payload = {
        "pipelineTasks": [{"taskType": "tts", "config": {"language": {"sourceLanguage": language}}}],
        "inputData": {"input": [{"source": text}]},
    }
    async with httpx.AsyncClient(timeout=FAST_TIMEOUT) as client:
        resp = await client.post(
            "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
            json=payload,
            headers={
                "userID": settings.bhashini_user_id,
                "ulcaApiKey": settings.bhashini_api_key,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        import base64
        audio_b64 = data["pipelineResponse"][0]["audio"][0]["audioContent"]
        return base64.b64decode(audio_b64)


async def _gtts_fallback(text: str, language: str) -> bytes:
    """gTTS fast-path fallback — instant audio synthesis."""
    try:
        from gtts import gTTS
        # gTTS supported Indian language codes
        gtts_map = {
            "hi": "hi", "ta": "ta", "te": "te", "kn": "kn", "ml": "ml",
            "bn": "bn", "gu": "gu", "mr": "mr", "pa": "pa", "ur": "ur",
            "ne": "ne", "en": "en"
        }
        gtts_lang = gtts_map.get(language, "hi" if language != "en" else "en")
        tts = gTTS(text=text, lang=gtts_lang, slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return buf.read()
    except Exception as exc:
        logger.error("gTTS fallback failed: %s", exc)
        return b""

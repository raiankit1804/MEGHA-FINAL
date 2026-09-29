# MEGHA SETU — AI Agent Memory File (CLAUDE.md)
> Read this file FIRST before making any change to this codebase.
> Last updated: 2026-09-26 | v2.4.0 | SIH26068

---

## 🔴 CRITICAL INVARIANTS — NEVER BREAK

### 1. Deterministic Separation of Concerns (DSOC)
- The LLM (Gemini) NEVER computes risk scores, rainfall amounts, or alert severities.
- `backend/core/risk_engine.py` is the single source of truth for all numeric risk values.
- Guardrail enforced at THREE levels:
  1. `backend/llm/prompts.py` COMMON_RULES → explicit ⛔ prohibitions
  2. `backend/core/synthesizer.py` synthesize_response() → asserts r.level before LLM call
  3. `backend/core/risk_engine.py` → computes all values deterministically
- `generate_deterministic_answer()` must always remain intact as full fallback.

### 2. Async-First LLM Calls (Updated 2026-09-26)
- Always use `await model.generate_content_async(...)` — NEVER sync `model.generate_content()`.
- The ModelWrapper in `backend/llm/gemini_client.py` supports both; always call async.

### 3. Zero-Breakdown Fallback Chain
- Gemini fails → generate_deterministic_answer()
- Bhashini fails → offline 90KB vocab dict
- Open-Meteo fails → GFS/ECMWF → wttr.in → synthetic climatological generator
- Redis fails → in-memory dict | PostgreSQL fails → SQLite

### 4. Dark-Only Modern Mode
- `modern-dark` is the DEFAULT and ONLY theme for Modern Mode.
- Never inject light theme CSS into Modern Mode.

### 5. Single WeatherCard Per Conversation Turn
- ChatWindow.tsx renders exactly ONE WeatherCard per turn. Never loop it.

---

## 🏗️ Key File Map

| File | Role |
|------|------|
| backend/core/synthesizer.py | LLM synthesis + deterministic fallback |
| backend/core/risk_engine.py | ALL numeric risk computation — LLM never touches this |
| backend/llm/gemini_client.py | Google GenAI SDK, multi-model fallback chain |
| backend/llm/prompts.py | System prompts with DSOC guardrails |
| backend/config.py | Pydantic settings (reads .env) |
| frontend/src/components/WeatherCard.tsx | Weather display + Apple-style canvas animations |
| frontend/src/components/ChatInput.tsx | Query input + mic + SOS button + domain mode |
| frontend/src/components/SosModal.tsx | Emergency helpline modal (8 services) |
| frontend/src/components/WeatherApp.tsx | Master state controller |
| frontend/src/theme/tokens.css | Design system CSS variables |

---

## 🛠️ Changes Made on 2026-09-26

### Obj 1 — AI Synthesis Engine (synthesizer.py + prompts.py)
- Switched to async: `model.generate_content()` → `await model.generate_content_async()` in BOTH synthesize_response() and generate_followup_chips()
- Added DSOC assertion: checks r.level on all risk records before every LLM call
- Rewrote COMMON_RULES in prompts.py with explicit ⛔ ABSOLUTE PROHIBITIONS block

### Obj 2 — Apple Weather Animations (WeatherCard.tsx)
- Canvas element injected as z-index:0, pointer-events:none absolute layer
- Card content wrapped at z-index:10 (typography always legible)
- Condition → animation mapping (weather_code + condition string fallback):
  - WMO 0 → sun (radial pulsing glow)
  - WMO 1-3 → cloud (drifting puffs)
  - WMO 45/48 → fog (ambient haze)
  - WMO 51-82 → rain (angled streaks, hardware-accelerated)
  - WMO 95+ → thunderstorm (fast rain + lightning flash)
  - WMO 71-77 → snow (drifting flakes with sine drift)
- Uses requestAnimationFrame + ResizeObserver (no layout thrashing)

### Obj 3 — SOS Button in ChatInput (ChatInput.tsx + WeatherApp.tsx)
- Added onOpenSos?: () => void prop to ChatInputProps
- Hero layout: red gradient pill (🚨 SOS) with sosPulse animation, left of Send
- Classic docked: red circular badge (🚨), adjacent to Send
- sosPulse @keyframes added to ChatInput.module.css
- WeatherApp.tsx: both ChatInput instances wired with onOpenSos={() => setShowSos(true)}

---

## 🧪 Quality Gate (run before every commit)
```bash
cd frontend && npx tsc --noEmit          # must exit 0
python -m py_compile backend/core/synthesizer.py backend/main.py  # must exit 0
```
Last run: ✅ 0 TypeScript errors | ✅ Python compiles clean

---

## 🚀 Local Dev
```bash
# Backend (Terminal 1)
cd "/Users/ankitrai/Documents/Megha Setu Final/backend"
source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (Terminal 2)
cd "/Users/ankitrai/Documents/Megha Setu Final/frontend" && npm run dev
```

## ⚠️ IMPORTANT
- **Do NOT push to GitHub until explicitly asked by the user.**
- Production: https://meghasetu.online | API: https://megha-backend-01bw.onrender.com

"""
WeatherGPT v2.0 — Developer & Hackathon Demo Endpoints
Allows 1-step simulation of primary weather API outage (Tier 1 GFS -> Tier 3 wttr.in failover).
"""
import logging
from typing import Optional
from fastapi import APIRouter, Query
from data.open_meteo import set_simulate_tier1_outage, get_simulate_tier1_outage
from db.redis_client import clear_all_caches

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dev", tags=["Developer Demo"])


@router.get("/toggle-outage")
async def toggle_outage(enable: Optional[bool] = Query(None, description="Explicitly set outage state (true/false)")):
    """
    1-Step Failover Simulator:
    - If enable is None: flips current state.
    - If enable is True: disables Open-Meteo (Tier 1), forcing failover to wttr.in (Tier 3).
    - If enable is False: restores normal Open-Meteo operation.
    Also clears cached weather data so the next query immediately demonstrates the active source.
    """
    current = get_simulate_tier1_outage()
    new_state = (not current) if enable is None else bool(enable)
    set_simulate_tier1_outage(new_state)

    # Purge Redis/in-memory weather caches so the very next user query reflects the new source
    try:
        await clear_all_caches()
    except Exception as exc:
        logger.debug("Cache purge error: %s", exc)

    source = "wttr.in (Tier 3 Fallback)" if new_state else "Open-Meteo (Tier 1 IMD-aligned)"
    status_msg = (
        "🔴 Primary Weather API (Tier 1) DISABLED. Next query will route to Tier 3 (wttr.in)!"
        if new_state
        else "🟢 Primary Weather API (Tier 1) RESTORED. Next query will use Open-Meteo!"
    )

    logger.info("🧪 [FAILOVER DEMO] %s", status_msg)

    return {
        "simulated_outage": new_state,
        "active_source": source,
        "message": status_msg,
    }


@router.get("/outage-status")
async def get_outage_status():
    """Check current simulation status."""
    is_outage = get_simulate_tier1_outage()
    return {
        "simulated_outage": is_outage,
        "active_source": "wttr.in (Tier 3 Fallback)" if is_outage else "Open-Meteo (Tier 1 IMD-aligned)",
    }

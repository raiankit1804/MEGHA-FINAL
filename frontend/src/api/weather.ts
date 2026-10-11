/**
 * Direct client-side fetch to Open-Meteo API.
 * Browsers have residential/cellular client IPs with zero rate-limit 429 issues,
 * allowing instant, unblocked Open-Meteo retrieval directly in the client.
 */
export async function fetchClientOpenMeteo(lat: number, lon: number): Promise<any | null> {
  try {
    const currentVars = [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'wind_speed_10m',
      'wind_direction_10m',
      'precipitation',
      'surface_pressure',
      'pressure_msl',
      'weather_code',
      'cloud_cover',
      'uv_index',
      'visibility',
      'is_day',
    ].join(',');

    const dailyVars = [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'weather_code',
      'sunrise',
      'sunset',
      'uv_index_max',
    ].join(',');

    const hourlyVars = [
      'temperature_2m',
      'precipitation',
      'precipitation_probability',
      'wind_speed_10m',
      'weather_code',
      'is_day',
    ].join(',');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${currentVars}&daily=${dailyVars}&hourly=${hourlyVars}&timezone=Asia%2FKolkata&forecast_days=7`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (err) {
    console.debug('Direct client Open-Meteo fetch skipped:', err);
    return null;
  }
}

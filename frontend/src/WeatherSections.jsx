export function WeatherHighlights({ weather, formatTemperature, formatSunTime, getUvDescription }) {
  return (
    <div className="weather-highlights">
      <div className="highlight-card">
        <span>☀️ Indeks UV</span>
        <strong>{weather.uv_index ?? '—'}</strong>
        <small>{getUvDescription(weather.uv_index)}</small>
      </div>
      <div className="highlight-card">
        <span>🌅 Matahari terbit</span>
        <strong>{formatSunTime(weather.sunrise)}</strong>
        <small>Waktu setempat</small>
      </div>
      <div className="highlight-card">
        <span>🌇 Matahari terbenam</span>
        <strong>{formatSunTime(weather.sunset)}</strong>
        <small>Waktu setempat</small>
      </div>
    </div>
  )
}

export function WeatherAlerts({ alerts }) {
  if (!alerts?.length) {
    return (
      <div className="no-weather-alerts" role="status">
        ✓ Tidak ada peringatan cuaca aktif yang dikirim untuk lokasi ini.
      </div>
    )
  }

  return (
    <section className="weather-alerts" aria-label="Peringatan cuaca aktif">
      <h3>⚠️ Peringatan cuaca</h3>
      {alerts.map((alert, index) => (
        <article className="weather-alert" key={`${alert.headline}-${index}`}>
          <div className="alert-heading">
            <strong>{alert.headline}</strong>
            {alert.severity && <span>{alert.severity}</span>}
          </div>
          {alert.areas && <p className="alert-areas">Area: {alert.areas}</p>}
          {alert.description && <p>{alert.description}</p>}
          {alert.instruction && <p><strong>Saran:</strong> {alert.instruction}</p>}
          {alert.expires && <small>Berlaku sampai {alert.expires}</small>}
        </article>
      ))}
    </section>
  )
}

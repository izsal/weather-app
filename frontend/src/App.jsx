import { useState, useEffect, useRef } from 'react'
import './WeatherFX.css'
import CuteScene from './CuteScene.jsx'
import { getWeatherVisual } from './weatherVisual.js'
import { getDayPhase } from './weatherTime.js'

const STORAGE_KEY = 'weather_favorite_cities'
const UNIT_STORAGE_KEY = 'weather_temperature_unit'
const MOTION_STORAGE_KEY = 'weather_background_motion'

function getInitialMotionPreference() {
  try {
    const savedPreference = localStorage.getItem(MOTION_STORAGE_KEY)
    if (savedPreference !== null) return savedPreference === 'on'
  } catch {
    return true
  }
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function formatTanggal(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
}

function getUvDescription(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Tidak tersedia'
  const index = Number(value)
  if (index < 3) return 'Rendah'
  if (index < 6) return 'Sedang'
  if (index < 8) return 'Tinggi'
  if (index < 11) return 'Sangat tinggi'
  return 'Ekstrem'
}

function formatSunTime(value) {
  const match = value?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return value || '—'
  let hour = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'PM') hour += 12
  return `${String(hour).padStart(2, '0')}:${match[2]}`
}

async function readApiResponse(response, fallbackMessage) {
  let data
  try {
    data = await response.json()
  } catch {
    if (!response.ok) {
      throw new Error(`Layanan cuaca sedang tidak tersedia (HTTP ${response.status}). Coba lagi nanti.`)
    }
    throw new Error('Respons server tidak valid.')
  }

  if (!response.ok) {
    throw new Error(data?.detail || fallbackMessage)
  }
  return data
}

export default function App() {
  const initialCity = new URLSearchParams(window.location.search).get('city')?.trim() || 'Jakarta'
  const [query, setQuery] = useState(initialCity)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionQuery, setSuggestionQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [error, setError] = useState('')
  const [canRetry, setCanRetry] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [selectedForecastHour, setSelectedForecastHour] = useState('')
  const [selectedForecastDay, setSelectedForecastDay] = useState('')
  const [clockNow, setClockNow] = useState(() => Date.now())
  const searchBoxRef = useRef(null)
  const lastWeatherRequestRef = useRef(null)
  const [backgroundMotion, setBackgroundMotion] = useState(getInitialMotionPreference)
  const [temperatureUnit, setTemperatureUnit] = useState(() => {
    try {
      return localStorage.getItem(UNIT_STORAGE_KEY) === 'fahrenheit' ? 'fahrenheit' : 'celsius'
    } catch {
      return 'celsius'
    }
  })

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : ['Jakarta', 'Bandung', 'Kota Bogor']
    } catch {
      return ['Jakarta', 'Bandung', 'Kota Bogor']
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    try {
      localStorage.setItem(UNIT_STORAGE_KEY, temperatureUnit)
    } catch {
      return
    }
  }, [temperatureUnit])

  useEffect(() => {
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, backgroundMotion ? 'on' : 'off')
    } catch {
      return
    }
  }, [backgroundMotion])

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  // Tutup dropdown autocomplete saat klik di luar form
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounce Autocomplete Pencarian Kota (300ms)
  useEffect(() => {
    if (!showDropdown || query.trim().length < 2) {
      setSuggestions([])
      setSuggestionQuery('')
      return
    }
    const controller = new AbortController()
    const searchQuery = query.trim()
    setSuggestions([])
    setSuggestionQuery('')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
          signal: controller.signal,
        })
        const data = await readApiResponse(res, 'Gagal mencari kota.')
        setSuggestions(data.results || [])
        setSuggestionQuery(searchQuery)
      } catch (err) {
        if (err.name !== 'AbortError') setSuggestions([])
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, showDropdown])

  const fetchWeather = async (targetCity, location = null, forceRefresh = false) => {
    if (!targetCity.trim() && !location) return
    lastWeatherRequestRef.current = { targetCity, location }
    setCanRetry(false)
    setLoading(true)
    setError('')
    setShareStatus('')
    setShareLink('')
    setShowDropdown(false)
    try {
      const url = location
        ? `/api/weather/coords?lat=${location.latitude}&lon=${location.longitude}&city=${encodeURIComponent(location.name)}&country=${encodeURIComponent(location.country || '')}&refresh=${forceRefresh}`
        : `/api/weather?city=${encodeURIComponent(targetCity)}&refresh=${forceRefresh}`
      const res = await fetch(url)
      const data = await readApiResponse(res, 'Gagal memuat data cuaca.')
      setWeather(data)
      setQuery(data.city)
      setSelectedForecastHour('')
      setSelectedForecastDay('')
    } catch (err) {
      setError(err.message)
      setCanRetry(true)
    } finally {
      setLoading(false)
    }
  }

  const retryWeather = () => {
    const request = lastWeatherRequestRef.current
    if (request) fetchWeather(request.targetCity, request.location, true)
  }

  const fetchWeatherByGPS = () => {
    if (!navigator.geolocation) {
      setError('Browser Anda tidak mendukung fitur deteksi lokasi GPS.')
      setCanRetry(false)
      return
    }
    setGpsLoading(true)
    setError('')
    setCanRetry(false)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          await fetchWeather('', { latitude, longitude, name: '', country: '' })
        } finally {
          setGpsLoading(false)
        }
      },
      () => {
        setGpsLoading(false)
        setError('Izin lokasi GPS ditolak atau tidak tersedia di browser.')
        setCanRetry(false)
      },
      { timeout: 8000 }
    )
  }

  useEffect(() => {
    fetchWeather(initialCity)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const searchQuery = query.trim()
    if (!searchQuery) return

    const queryIsCurrent = suggestionQuery.toLowerCase() === query.trim().toLowerCase()
    const matchingSuggestion = queryIsCurrent
      ? suggestions.find((item) => item.name.toLowerCase() === query.trim().toLowerCase()) || suggestions[0]
      : null
    if (showDropdown && matchingSuggestion) {
      fetchWeather(matchingSuggestion.name, matchingSuggestion)
      return
    }

    if (showDropdown && searchQuery.length >= 2) {
      fetchWeather(searchQuery)
      return
    }

    fetchWeather(query)
  }

  const handleSelectSuggestion = (item) => {
    setQuery(item.name)
    setShowDropdown(false)
    fetchWeather(item.name, item)
  }

  const isFavorite = weather && favorites.some((c) => c.toLowerCase() === weather.city.toLowerCase())

  const toggleFavorite = () => {
    if (!weather) return
    if (isFavorite) {
      setFavorites(favorites.filter((c) => c.toLowerCase() !== weather.city.toLowerCase()))
    } else {
      setFavorites([...favorites, weather.city])
    }
  }

  const removeFavorite = (e, cityToRemove) => {
    e.stopPropagation()
    setFavorites(favorites.filter((c) => c !== cityToRemove))
  }

  const formatTemperature = (value) => {
    if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) {
      return '—'
    }
    const celsius = Number(value)
    const temperature = temperatureUnit === 'fahrenheit' ? celsius * 9 / 5 + 32 : celsius
    const unit = temperatureUnit === 'fahrenheit' ? '°F' : '°C'
    return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(temperature)}${unit}`
  }

  const shareWeather = async () => {
    if (!weather) return

    const url = new URL(window.location.href)
    url.searchParams.set('city', weather.city)
    const link = url.toString()
    const shareData = {
      title: `Cuaca di ${weather.city}`,
      text: `${weather.condition}, ${formatTemperature(weather.temperature)} di ${weather.city}.`,
      url: link,
    }

    setShareStatus('')
    setShareLink('')
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setShareStatus('Prakiraan berhasil dibagikan.')
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareData.text}\n${link}`)
        setShareStatus('Prakiraan dan tautan disalin.')
      } else {
        setShareStatus('Salin tautan ini untuk membagikan prakiraan:')
        setShareLink(link)
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setShareStatus('Berbagi otomatis tidak tersedia. Salin tautan ini:')
      setShareLink(link)
    }
  }

  const visual = getWeatherVisual(weather?.condition, weather?.is_day ?? 1)
  const dayPhase = getDayPhase(weather, clockNow)
  const rainChance = Math.max(
    0,
    ...(weather?.hourly_forecast || [])
      .slice(0, 3)
      .map((hour) => Number(hour.precipitation_probability) || 0),
  )
  const [stageTheme, setStageTheme] = useState(visual.theme)
  const [transitionTheme, setTransitionTheme] = useState('')
  const [transitionVisible, setTransitionVisible] = useState(false)

  useEffect(() => {
    if (stageTheme === visual.theme) return undefined

    setTransitionTheme(visual.theme)
    setTransitionVisible(false)
    const frame = window.requestAnimationFrame(() => setTransitionVisible(true))
    const timer = window.setTimeout(() => {
      setStageTheme(visual.theme)
      setTransitionTheme('')
      setTransitionVisible(false)
    }, 1400)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [stageTheme, visual.theme])

  return (
    <div
      className={`weather-stage ${stageTheme}${backgroundMotion ? '' : ' motion-reduced'}`}
      style={{ '--twilight-opacity': dayPhase.twilight }}
    >
      {transitionTheme && (
        <div
          aria-hidden="true"
          className={`weather-theme-overlay ${transitionTheme}${transitionVisible ? ' is-visible' : ''}`}
        />
      )}
      {/* Ilustrasi Background Cute & Cozy */}
      <CuteScene
        visual={visual}
        dayPhase={dayPhase}
        rainChance={rainChance}
        windSpeed={weather?.wind_speed ?? 0}
        motionEnabled={backgroundMotion}
      />

      <div className="content-wrapper">
        <div className="app-header" style={{ marginBottom: '6px' }}>
          <h1 style={{ fontSize: '1.85rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            Weather Dashboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="motion-toggle"
              aria-pressed={backgroundMotion}
              onClick={() => setBackgroundMotion((enabled) => !enabled)}
              title="Nyalakan atau hentikan animasi latar"
            >
              {backgroundMotion ? '✨ Animasi: Nyala' : '✨ Animasi: Mati'}
            </button>
            <div className="unit-toggle" role="group" aria-label="Satuan suhu">
              <button
                type="button"
                aria-pressed={temperatureUnit === 'celsius'}
                onClick={() => setTemperatureUnit('celsius')}
              >
                °C
              </button>
              <button
                type="button"
                aria-pressed={temperatureUnit === 'fahrenheit'}
                onClick={() => setTemperatureUnit('fahrenheit')}
              >
                °F
              </button>
            </div>
            <button
              type="button"
              onClick={fetchWeatherByGPS}
              disabled={gpsLoading}
              style={{
                padding: '7px 13px',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.28)',
                background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(10px)',
                color: '#f8fafc',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {gpsLoading ? 'Mendeteksi...' : '📍 Lokasi Saya'}
            </button>
          </div>
        </div>

        {/* Bar Kota Favorit */}
        {favorites.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {favorites.map((favCity) => {
              const active = weather?.city.toLowerCase() === favCity.toLowerCase()
              return (
                <div
                  key={favCity}
                  className="fav-chip"
                  onClick={() => fetchWeather(favCity)}
                  style={{
                    background: active ? 'rgba(56, 189, 248, 0.45)' : 'rgba(15, 23, 42, 0.48)',
                    color: '#fff',
                    border: `1px solid ${active ? '#bae6fd' : 'rgba(255,255,255,0.22)'}`
                  }}
                >
                  <span>{favCity}</span>
                  <span
                    onClick={(e) => removeFavorite(e, favCity)}
                    title="Hapus dari favorit"
                    style={{ fontSize: '0.75rem', opacity: 0.8, paddingLeft: '2px' }}
                  >
                    ✕
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Form Pencarian + Autocomplete Dropdown */}
        <div ref={searchBoxRef} style={{ position: 'relative', marginBottom: '24px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={query}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowDropdown(true)
              }}
              placeholder="Ketik nama kota (mis. Bandung, Tokyo, Seoul)..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(12px)',
                color: '#f8fafc',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 22px',
                borderRadius: '14px',
                border: 'none',
                background: '#38bdf8',
                color: '#0f172a',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(56, 189, 248, 0.4)'
              }}
            >
              {loading ? '...' : 'Cari'}
            </button>
          </form>

          {showDropdown && suggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {suggestions.map((item) => (
                <div
                  key={item.id || `${item.latitude}-${item.longitude}`}
                  className="autocomplete-item"
                  onClick={() => handleSelectSuggestion(item)}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>{item.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {[item.admin1, item.country].filter(Boolean).join(', ')}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Pilih →</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <div>
              <strong>{error}</strong>
              {weather && <span>Menampilkan data cuaca terakhir yang berhasil dimuat.</span>}
            </div>
            {canRetry && (
              <button type="button" onClick={() => {
                const request = lastWeatherRequestRef.current
                if (request) fetchWeather(request.targetCity, request.location, true)
              }} disabled={loading}>
                {loading ? 'Memuat...' : 'Coba lagi'}
              </button>
            )}
          </div>
        )}

        {loading && !weather && (
          <div className="loading-state glass-card" role="status">
            <span className="loading-spinner" aria-hidden="true" />
            Memuat cuaca untuk {query || 'lokasi Anda'}...
          </div>
        )}

        {weather && (
          <div key={weather.city + weather.temperature}>
            {/* Kartu Cuaca Saat Ini */}
            <div className="glass-card" style={{ padding: '26px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1.6rem' }}>{weather.city}</h2>
                    <button
                      onClick={toggleFavorite}
                      style={{
                        padding: '4px 11px',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        border: '1px solid rgba(125, 211, 252, 0.55)',
                        background: isFavorite ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255,255,255,0.08)',
                        color: '#e0f2fe'
                      }}
                    >
                      {isFavorite ? '★ Tersimpan' : '☆ Simpan Kota'}
                    </button>
                  </div>
                  <div className="weather-meta">
                    <span>{weather.country}</span>
                    <span>
                      Diperbarui {weather.last_updated || '—'} (waktu lokal)
                    </span>
                    <span className="data-source">
                      {weather.source || 'WeatherAPI'}{weather.cached ? ' · dari cache' : ''}
                    </span>
                    <button type="button" onClick={retryWeather} disabled={loading}>
                      {loading ? 'Memuat...' : '↻ Perbarui'}
                    </button>
                  </div>
                </div>

                <span style={{ background: 'rgba(255,255,255,0.14)', padding: '6px 14px', borderRadius: '999px', fontSize: '0.85rem', color: '#f0f9ff', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.18)' }}>
                  {weather.condition}
                </span>
              </div>

              <button type="button" className="share-button" onClick={shareWeather}>
                Bagikan prakiraan
              </button>
              {shareStatus && (
                <div className="share-status" role="status">
                  {shareStatus}
                  {shareLink && (
                    <a href={shareLink} onClick={(event) => event.stopPropagation()}>
                      {shareLink}
                    </a>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0' }}>
                <div style={{ fontSize: '3.75rem', fontWeight: '700', letterSpacing: '-0.03em' }}>
                  {formatTemperature(weather.temperature)}
                </div>
                <span className="floating-icon" aria-hidden="true">
                  {visual.icon}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.16)', paddingTop: '16px' }}>
                <div>
                  <div style={{ color: 'rgba(248,250,252,0.75)', fontSize: '0.75rem' }}>Terasa Seperti</div>
                  <div style={{ fontWeight: '600', marginTop: '4px', fontSize: '1.05rem' }}>{formatTemperature(weather.apparent_temperature)}</div>
                </div>
                <div>
                  <div style={{ color: 'rgba(248,250,252,0.75)', fontSize: '0.75rem' }}>Kelembapan</div>
                  <div style={{ fontWeight: '600', marginTop: '4px', fontSize: '1.05rem' }}>{weather.humidity}%</div>
                </div>
                <div>
                  <div style={{ color: 'rgba(248,250,252,0.75)', fontSize: '0.75rem' }}>Angin</div>
                  <div style={{ fontWeight: '600', marginTop: '4px', fontSize: '1.05rem' }}>{weather.wind_speed} km/j</div>
                </div>
              </div>

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
            </div>

            {weather.alerts?.length > 0 ? (
              <section className="weather-alerts" aria-label="Peringatan cuaca aktif">
                <h3>⚠️ Peringatan cuaca</h3>
                {weather.alerts.map((alert, index) => (
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
            ) : (
              <div className="no-weather-alerts" role="status">
                ✓ Tidak ada peringatan cuaca aktif yang dikirim untuk lokasi ini.
              </div>
            )}

            {weather.hourly_forecast?.length > 0 && (
              <div className="glass-card" style={{ padding: '22px', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: 'rgba(248,250,252,0.95)' }}>
                  Prakiraan 24 Jam
                </h3>
                <div className="hourly-forecast">
                  {weather.hourly_forecast.map((hour, index) => {
                    const hourVisual = getWeatherVisual(hour.condition)
                    return (
                      <button
                        type="button"
                        className={`hourly-card${selectedForecastHour === hour.time ? ' is-selected' : ''}`}
                        key={hour.time}
                        style={{ '--stagger-index': index }}
                        aria-pressed={selectedForecastHour === hour.time}
                        onClick={() => {
                          setSelectedForecastHour(hour.time)
                          setSelectedForecastDay('')
                        }}
                      >
                        <span className="hourly-time">
                          {index === 0 ? 'Sekarang' : hour.time.split(/[T ]/)[1]?.slice(0, 5)}
                        </span>
                        <span className="hourly-icon" aria-hidden="true">{hourVisual.icon}</span>
                        <strong>{formatTemperature(hour.temperature)}</strong>
                        <span className="hourly-rain">
                          💧 {hour.precipitation_probability ?? '—'}%
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Kartu prakiraan harian */}
            {weather.forecast && weather.forecast.length > 0 && (
              <div className="glass-card" style={{ padding: '22px' }}>
                <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: 'rgba(248,250,252,0.95)' }}>
                  Prakiraan {weather.forecast.length} Hari ke Depan
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {weather.forecast.map((day, index) => {
                    const dayVisual = getWeatherVisual(day.condition, 1)
                    return (
                      <button
                        type="button"
                        key={day.date}
                        className={`forecast-row${selectedForecastDay === day.date ? ' is-selected' : ''}`}
                        style={{ '--stagger-index': index }}
                        aria-pressed={selectedForecastDay === day.date}
                        onClick={() => {
                          setSelectedForecastDay(day.date)
                          setSelectedForecastHour('')
                        }}
                      >
                        <span style={{ fontWeight: '600', color: '#f8fafc' }}>{formatTanggal(day.date)}</span>
                        <span style={{ color: '#e0f2fe', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{dayVisual.icon}</span>
                          <span>{day.condition}</span>
                        </span>
                        <span style={{ fontWeight: '600' }}>
                          <span style={{ color: 'rgba(248,250,252,0.68)' }}>{formatTemperature(day.temp_min)}</span> / <span style={{ color: '#fff' }}>{formatTemperature(day.temp_max)}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import './WeatherFX.css'
import CuteScene from './CuteScene.jsx'

const STORAGE_KEY = 'weather_favorite_cities'

function formatTanggal(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
}

function getWeatherVisual(condition = '', isDay = 1) {
  const text = condition.toLowerCase()
  if (text.includes('badai') || text.includes('petir')) {
    return { theme: 'theme-storm', icon: '⛈️', rain: true, clouds: true, sun: false }
  }
  if (text.includes('hujan') || text.includes('gerimis')) {
    return { theme: 'theme-rain', icon: '🌧️', rain: true, clouds: true, sun: false }
  }
  if (text.includes('mendung') || text.includes('berawan') || text.includes('kabut')) {
    return { theme: isDay === 0 ? 'theme-night' : 'theme-cloudy', icon: '⛅', rain: false, clouds: true, sun: false }
  }
  return { theme: isDay === 0 ? 'theme-night' : 'theme-clear', icon: isDay === 0 ? '🌙' : '☀️', rain: false, clouds: false, sun: true }
}

export default function App() {
  const [query, setQuery] = useState('Jakarta')
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [error, setError] = useState('')
  const searchBoxRef = useRef(null)

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
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setSuggestions(data.results || [])
      } catch {
        setSuggestions([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, showDropdown])

  const fetchWeather = async (targetCity) => {
    if (!targetCity.trim()) return
    setLoading(true)
    setError('')
    setShowDropdown(false)
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(targetCity)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Gagal memuat data cuaca')
      setWeather(data)
      setQuery(data.city)
    } catch (err) {
      setError(err.message)
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeatherByGPS = () => {
    if (!navigator.geolocation) {
      setError('Browser Anda tidak mendukung fitur deteksi lokasi GPS.')
      return
    }
    setGpsLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(`/api/weather/coords?lat=${latitude}&lon=${longitude}`)
          const data = await res.json()
          if (!res.ok) throw new Error(data.detail || 'Gagal mengambil cuaca lokasi Anda')
          setWeather(data)
          setQuery(data.city)
        } catch (err) {
          setError(err.message)
        } finally {
          setGpsLoading(false)
        }
      },
      () => {
        setGpsLoading(false)
        setError('Izin lokasi GPS ditolak atau tidak tersedia di browser.')
      },
      { timeout: 8000 }
    )
  }

  useEffect(() => {
    fetchWeather('Jakarta')
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    fetchWeather(query)
  }

  const handleSelectSuggestion = (item) => {
    setQuery(item.name)
    setShowDropdown(false)
    fetchWeather(item.name)
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

  const visual = getWeatherVisual(weather?.condition, weather?.is_day ?? 1)

  return (
    <div className={`weather-stage ${visual.theme}`}>
      {/* Ilustrasi Background Cute & Cozy */}
      <CuteScene visual={visual} isDay={weather?.is_day ?? 1} />

      <div className="content-wrapper">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h1 style={{ fontSize: '1.85rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            Weather Dashboard
          </h1>
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

        <p style={{ color: 'rgba(248,250,252,0.88)', marginTop: 0, marginBottom: '20px', fontSize: '0.9rem' }}>
          FastAPI + Redis Cache + React Vite • Autocomplete & GPS
        </p>

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
          <div style={{ padding: '14px 16px', borderRadius: '14px', background: 'rgba(127, 29, 29, 0.82)', backdropFilter: 'blur(10px)', color: '#fecaca', border: '1px solid rgba(248, 113, 113, 0.4)' }}>
            {error}
          </div>
        )}

        {weather && !error && (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ color: 'rgba(248,250,252,0.8)', fontSize: '0.875rem' }}>{weather.country}</span>
                    {weather.cached && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.25)', color: '#6ee7b7', border: '1px solid rgba(52, 211, 153, 0.35)' }}>
                        ⚡ Redis Cache
                      </span>
                    )}
                  </div>
                </div>

                <span style={{ background: 'rgba(255,255,255,0.14)', padding: '6px 14px', borderRadius: '999px', fontSize: '0.85rem', color: '#f0f9ff', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.18)' }}>
                  {weather.condition}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0' }}>
                <div style={{ fontSize: '3.75rem', fontWeight: '700', letterSpacing: '-0.03em' }}>
                  {weather.temperature}°C
                </div>
                <span className="floating-icon" aria-hidden="true">
                  {visual.icon}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.16)', paddingTop: '16px' }}>
                <div>
                  <div style={{ color: 'rgba(248,250,252,0.75)', fontSize: '0.75rem' }}>Terasa Seperti</div>
                  <div style={{ fontWeight: '600', marginTop: '4px', fontSize: '1.05rem' }}>{weather.apparent_temperature}°C</div>
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
            </div>

            {/* Kartu Prakiraan 5 Hari ke Depan */}
            {weather.forecast && weather.forecast.length > 0 && (
              <div className="glass-card" style={{ padding: '22px' }}>
                <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: 'rgba(248,250,252,0.95)' }}>
                  Prakiraan 5 Hari ke Depan
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {weather.forecast.map((day) => {
                    const dayVisual = getWeatherVisual(day.condition, 1)
                    return (
                      <div key={day.date} className="forecast-row">
                        <span style={{ fontWeight: '600', color: '#f8fafc' }}>{formatTanggal(day.date)}</span>
                        <span style={{ color: '#e0f2fe', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{dayVisual.icon}</span>
                          <span>{day.condition}</span>
                        </span>
                        <span style={{ fontWeight: '600' }}>
                          <span style={{ color: 'rgba(248,250,252,0.68)' }}>{day.temp_min}°</span> / <span style={{ color: '#fff' }}>{day.temp_max}°C</span>
                        </span>
                      </div>
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

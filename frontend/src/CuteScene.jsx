import React, { useMemo } from 'react'

function CuteCloudSVG({ mood = 'happy', tint = '#ffffff' }) {
  return (
    <svg viewBox="0 0 220 130" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.18))' }}>
      {/* Badan Awan Empuk */}
      <path
        d="M58 108H166C188.091 108 206 90.0914 206 68C206 47.4193 190.453 30.4716 170.449 28.2481C163.363 12.7478 147.721 2 129.5 2C108.532 2 90.8926 16.2248 85.8291 35.5681C81.8952 33.9145 77.5682 33 73 33C55.4391 33 41.0761 46.6317 40.058 63.9301C25.2768 67.5906 14 80.9351 14 96.8C14 103.005 22 108 58 108Z"
        fill={tint}
        fillOpacity="0.92"
      />
      {/* Mata Cute */}
      <circle cx="94" cy="70" r="4.5" fill="#334155" />
      <circle cx="132" cy="70" r="4.5" fill="#334155" />
      <circle cx="95.5" cy="68.5" r="1.5" fill="#ffffff" />
      <circle cx="133.5" cy="68.5" r="1.5" fill="#ffffff" />
      {/* Pipi Merona */}
      <ellipse cx="83" cy="77" rx="6" ry="3.5" fill="#fda4af" fillOpacity="0.75" />
      <ellipse cx="143" cy="77" rx="6" ry="3.5" fill="#fda4af" fillOpacity="0.75" />
      {/* Ekspresi Mulut */}
      {mood === 'rain' ? (
        <path d="M108 81C110 78 116 78 118 81" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path d="M107 77C110 82 116 82 119 77" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
      )}
    </svg>
  )
}

function CuteSunSVG() {
  return (
    <div className="cute-sun-wrap">
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Sinar Matahari Berputar */}
        <g className="cute-sun-rays">
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <rect
              key={deg}
              x="96"
              y="8"
              width="8"
              height="22"
              rx="4"
              fill="#fde047"
              fillOpacity="0.85"
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
        </g>
        {/* Aura Hangat */}
        <circle cx="100" cy="100" r="62" fill="#fef08a" fillOpacity="0.3" />
        {/* Wajah Matahari */}
        <circle cx="100" cy="100" r="48" fill="#facc15" />
        <circle cx="85" cy="94" r="4.5" fill="#713f12" />
        <circle cx="115" cy="94" r="4.5" fill="#713f12" />
        <circle cx="86.5" cy="92.5" r="1.5" fill="#ffffff" />
        <circle cx="116.5" cy="92.5" r="1.5" fill="#ffffff" />
        <ellipse cx="76" cy="102" rx="6" ry="3.5" fill="#fb7185" fillOpacity="0.65" />
        <ellipse cx="124" cy="102" rx="6" ry="3.5" fill="#fb7185" fillOpacity="0.65" />
        <path d="M93 103C96 109 104 109 107 103" stroke="#713f12" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function CuteScene({ visual, isDay = 1 }) {
  const rainDrops = useMemo(() => {
    return Array.from({ length: 65 }, (_, idx) => ({
      id: idx,
      left: `${(idx * 1.54) % 100}%`,
      duration: `${0.6 + (idx % 5) * 0.12}s`,
      delay: `${(idx % 8) * 0.2}s`
    }))
  }, [])

  const stars = useMemo(() => {
    return Array.from({ length: 28 }, (_, idx) => ({
      id: idx,
      top: `${(idx * 3.4) % 75}%`,
      left: `${(idx * 7.3) % 96}%`,
      size: `${2 + (idx % 3)}px`,
      delay: `${(idx % 6) * 0.4}s`
    }))
  }, [])

  const cloudTint = visual.rain ? '#cbd5e1' : '#ffffff'
  const cloudMood = visual.rain ? 'rain' : 'happy'

  return (
    <div className="cute-scene-layer" aria-hidden="true">
      {/* Malam Hari: Bintang Berkelip */}
      {isDay === 0 &&
        stars.map((s) => (
          <div
            key={s.id}
            className="star-twinkle"
            style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }}
          />
        ))}

      {/* Siang & Cerah: Matahari Tersenyum */}
      {visual.sun && isDay === 1 && <CuteSunSVG />}

      {/* Awan Cute Mengapung di Semua Kondisi (Lebih Banyak Saat Mendung/Hujan) */}
      <div className="cute-cloud-float-1">
        <CuteCloudSVG mood={cloudMood} tint={cloudTint} />
      </div>
      <div className="cute-cloud-float-2">
        <CuteCloudSVG mood={cloudMood} tint={cloudTint} />
      </div>
      {(visual.clouds || visual.rain) && (
        <div className="cute-cloud-float-3">
          <CuteCloudSVG mood={cloudMood} tint={cloudTint} />
        </div>
      )}

      {/* Partikel Rintik Hujan */}
      {visual.rain &&
        rainDrops.map((drop) => (
          <div
            key={drop.id}
            className="rain-drop"
            style={{ left: drop.left, animationDuration: drop.duration, animationDelay: drop.delay }}
          />
        ))}
    </div>
  )
}

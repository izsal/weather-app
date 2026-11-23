function parseClockMinutes(value) {
  const match = value?.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
  if (!match) return null
  let hour = Number(match[1])
  if (match[3]) {
    hour %= 12
    if (match[3].toUpperCase() === 'PM') hour += 12
  }
  return hour * 60 + Number(match[2])
}

export function getDayPhase(weather, now) {
  const fallbackPhase = Number(weather?.is_day) === 0 ? 'night' : 'day'
  const sunrise = parseClockMinutes(weather?.sunrise)
  const sunset = parseClockMinutes(weather?.sunset)
  if (sunrise === null || sunset === null) {
    return { phase: fallbackPhase, progress: 0.5, twilight: 0 }
  }

  let localMinutes = null
  if (weather.timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: weather.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date(now))
      const hour = Number(parts.find((part) => part.type === 'hour')?.value)
      const minute = Number(parts.find((part) => part.type === 'minute')?.value)
      if (Number.isFinite(hour) && Number.isFinite(minute)) localMinutes = hour * 60 + minute
    } catch {
      localMinutes = null
    }
  }
  localMinutes ??= parseClockMinutes(weather.local_time?.slice(11, 16))
  if (localMinutes === null) {
    return { phase: fallbackPhase, progress: 0.5, twilight: 0 }
  }

  const dawnStart = sunrise - 45
  const dawnEnd = sunrise + 25
  const duskStart = sunset - 25
  const duskEnd = sunset + 45
  if (localMinutes >= dawnStart && localMinutes < dawnEnd) {
    const progress = (localMinutes - dawnStart) / (dawnEnd - dawnStart)
    return { phase: 'dawn', progress: progress * 0.08, twilight: Math.sin(progress * Math.PI) }
  }
  if (localMinutes >= dawnEnd && localMinutes < duskStart) {
    const progress = (localMinutes - sunrise) / (sunset - sunrise)
    return { phase: 'day', progress: 0.08 + progress * 0.84, twilight: 0 }
  }
  if (localMinutes >= duskStart && localMinutes <= duskEnd) {
    const progress = (localMinutes - duskStart) / (duskEnd - duskStart)
    return { phase: 'dusk', progress: 0.92 + progress * 0.08, twilight: Math.sin(progress * Math.PI) }
  }
  return { phase: 'night', progress: 1, twilight: 0 }
}

export function getPersonalGreeting(dayPhase, city = '', condition = '') {
  const location = city ? ` di ${city}` : ''
  const text = String(condition ?? '').toLocaleLowerCase()
  const weatherCopy = text.includes('hujan')
    ? 'Payungmu bisa jadi teman baik hari ini.'
    : text.includes('snow') || text.includes('salju')
      ? 'Bawa hangat-hangat, suasananya terasa seperti dongeng.'
      : text.includes('badai') || text.includes('petir')
        ? 'Lebih aman menikmati langit dari tempat teduh.'
        : text.includes('berkabut') || text.includes('kabut') || text.includes('fog')
          ? 'Biar langkahmu pelan, kabut sedang menyapa.'
          : ''

  let timeCopy
  if (dayPhase.phase === 'night') timeCopy = `Waktunya pelan-pelan${location}. Malam ini milikmu untuk beristirahat.`
  else if (dayPhase.phase === 'dawn') timeCopy = `Selamat pagi${location}. Awali hari dengan napas yang segar.`
  else if (dayPhase.phase === 'dusk') timeCopy = `Sore yang hangat${location}. Nikmati momen golden hour sebentar.`
  else timeCopy = `Semoga harimu menyenangkan${location}. Ada cuaca baru yang bisa kamu rasakan.`

  return weatherCopy ? `${timeCopy} ${weatherCopy}` : timeCopy
}

export function getWeatherVisual(condition = '', isDay = 1) {
  const text = String(condition ?? '').toLocaleLowerCase()
  const night = Number(isDay) === 0

  if (['hujan es', 'hail', 'ice pellets'].some((term) => text.includes(term))) {
    return {
      theme: night ? 'theme-night-storm' : 'theme-storm',
      icon: '🌨️',
      rain: false,
      hail: true,
      clouds: true,
      sun: false,
    }
  }

  if (['salju', 'snow', 'sleet', 'blizzard', 'badai salju'].some((term) => text.includes(term))) {
    return {
      theme: night ? 'theme-night-snow' : 'theme-snow',
      icon: '❄️',
      rain: false,
      snow: true,
      clouds: true,
      sun: false,
    }
  }

  if (['badai', 'petir', 'thunder', 'lightning'].some((term) => text.includes(term))) {
    return {
      theme: night ? 'theme-night-storm' : 'theme-storm',
      icon: '⛈️',
      rain: true,
      clouds: true,
      sun: false,
      storm: true,
    }
  }

  if (['kabut', 'berkabut', 'fog', 'mist', 'haze', 'asap', 'debu', 'berdebu', 'sand'].some((term) => text.includes(term))) {
    return {
      theme: night ? 'theme-night-fog' : 'theme-fog',
      icon: '🌫️',
      rain: false,
      fog: true,
      clouds: true,
      sun: false,
    }
  }

  if (['hujan', 'gerimis', 'rintik', 'rain', 'drizzle', 'shower'].some((term) => text.includes(term))) {
    return {
      theme: night ? 'theme-night-rain' : 'theme-rain',
      icon: '🌧️',
      rain: true,
      clouds: true,
      sun: false,
    }
  }

  if ([
    'berawan sebagian',
    'cerah berawan',
    'cerah sebagian',
    'sebagian cerah',
    'partly cloudy',
    'partly sunny',
  ].some((term) => text.includes(term))) {
    return {
      theme: night ? 'theme-night' : 'theme-partly-cloudy',
      icon: night ? '☁️' : '🌤️',
      rain: false,
      clouds: true,
      partlyCloudy: true,
      sun: !night,
    }
  }

  if (['mendung', 'berawan', 'cloudy', 'overcast'].some((term) => text.includes(term))) {
    return {
      theme: night ? 'theme-night' : 'theme-cloudy',
      icon: '☁️',
      rain: false,
      clouds: true,
      sun: false,
    }
  }

  const clear = ['cerah', 'clear', 'sunny'].some((term) => text.includes(term))
  if (!clear) {
    return {
      theme: night ? 'theme-night' : 'theme-cloudy',
      icon: night ? '☁️' : '☁️',
      rain: false,
      clouds: true,
      sun: false,
    }
  }

  return {
    theme: night ? 'theme-night' : 'theme-clear',
    icon: night ? '🌙' : '☀️',
    rain: false,
    clouds: false,
    sun: !night,
  }
}

export function getWeatherPersonality(condition = '', isDay = 1) {
  const text = String(condition ?? '').toLocaleLowerCase()
  const night = Number(isDay) === 0

  if (['hujan es', 'hail', 'ice pellets'].some((term) => text.includes(term))) {
    return { label: 'Awas, hari ini penuh kejutan', copy: 'Ada es yang turun—lebih aman tetap di tempat teduh.' }
  }
  if (['salju', 'snow', 'sleet', 'blizzard', 'badai salju'].some((term) => text.includes(term))) {
    return { label: 'Sedikit ajaib dan dingin', copy: 'Bersiaplah untuk suasana putih yang terasa seperti dongeng.' }
  }
  if (['badai', 'petir', 'thunder', 'lightning'].some((term) => text.includes(term))) {
    return { label: 'Hari ini dramatis', copy: 'Langit sedang ramai—jaga diri dan hindari area terbuka.' }
  }
  if (['kabut', 'berkabut', 'fog', 'mist', 'haze', 'asap', 'debu', 'berdebu', 'sand'].some((term) => text.includes(term))) {
    return { label: 'Hening dan sedikit misterius', copy: 'Kawanan kabut sedang menyelimuti pemandangan hari ini.' }
  }
  if (['hujan', 'gerimis', 'rintik', 'rain', 'drizzle', 'shower'].some((term) => text.includes(term))) {
    return { label: 'Tenang dan cozy', copy: 'Rintiknya lembut—momen yang pas untuk membawa payung.' }
  }
  if ([
    'berawan sebagian',
    'cerah berawan',
    'cerah sebagian',
    'sebagian cerah',
    'partly cloudy',
    'partly sunny',
  ].some((term) => text.includes(term))) {
    return {
      label: night ? 'Damai dengan awan malam' : 'Cerita matahari dan awan',
      copy: night ? 'Langit sedikit ramai, tapi malam tetap bisa terasa nyaman.' : 'Matahari dan awan bergantian—hari yang penuh warna.',
    }
  }
  if (['mendung', 'berawan', 'cloudy', 'overcast'].some((term) => text.includes(term))) {
    return { label: 'Kalem dan santai', copy: 'Awan sedang berkumpul. Hari ini cocok berjalan pelan.' }
  }
  if (night) {
    return { label: 'Malam yang tenang', copy: 'Bersihkan napas, biarkan malam berjalan perlahan.' }
  }
  return { label: 'Cerah dan penuh semangat', copy: 'Hari tampak cerah—sempatkan menikmati sesuatu di luar.' }
}

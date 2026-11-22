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

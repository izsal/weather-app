import assert from 'node:assert/strict'
import test from 'node:test'

import { getWeatherPersonality, getWeatherVisual } from './weatherVisual.js'

test('maps snow, hail, and fog to matching animated scenes', () => {
  assert.equal(getWeatherVisual('Salju ringan').snow, true)
  assert.equal(getWeatherVisual('Hujan es').hail, true)
  assert.equal(getWeatherVisual('Berkabut').fog, true)
})

test('maps thunderstorms before ordinary rain', () => {
  const visual = getWeatherVisual('Hujan petir')
  assert.equal(visual.storm, true)
  assert.equal(visual.rain, true)
  assert.equal(visual.theme, 'theme-storm')
})

test('shows sun and clouds for partly cloudy daytime, moon scene at night', () => {
  const daytime = getWeatherVisual('Cerah sebagian', 1)
  assert.equal(daytime.theme, 'theme-partly-cloudy')
  assert.equal(daytime.sun, true)
  assert.equal(daytime.clouds, true)

  const nighttime = getWeatherVisual('Salju', 0)
  assert.equal(nighttime.theme, 'theme-night-snow')
  assert.equal(nighttime.sun, false)
})

test('uses a neutral cloudy scene instead of incorrectly defaulting unknown weather to sunny', () => {
  const visual = getWeatherVisual('Kondisi cuaca lain')
  assert.equal(visual.clouds, true)
  assert.equal(visual.sun, false)
  assert.equal(visual.icon, '☁️')
})

test('returns a distinct personality for rainy and snowy weather', () => {
  assert.equal(getWeatherPersonality('Hujan ringan').label, 'Tenang dan cozy')
  assert.match(getWeatherPersonality('Salju ringan').copy, /dongeng/)
})

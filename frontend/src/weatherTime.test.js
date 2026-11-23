import assert from 'node:assert/strict'
import test from 'node:test'

import { getDayPhase, getPersonalGreeting } from './weatherTime.js'

const jakartaWeather = {
  timezone: 'Asia/Jakarta',
  sunrise: '05:30 AM',
  sunset: '05:45 PM',
}

test('calculates daytime progress in the location timezone', () => {
  const phase = getDayPhase(jakartaWeather, '2026-11-22T05:00:00Z')

  assert.equal(phase.phase, 'day')
  assert.ok(phase.progress > 0.45 && phase.progress < 0.6)
})

test('marks dawn and dusk as twilight periods', () => {
  const dawn = getDayPhase(jakartaWeather, '2026-11-21T22:10:00Z')
  const dusk = getDayPhase(jakartaWeather, '2026-11-22T10:50:00Z')

  assert.equal(dawn.phase, 'dawn')
  assert.ok(dawn.twilight > 0)
  assert.equal(dusk.phase, 'dusk')
  assert.ok(dusk.twilight > 0)
})

test('falls back to the provider day flag when sun times are absent', () => {
  assert.deepEqual(getDayPhase({ is_day: 0 }, Date.now()), {
    phase: 'night',
    progress: 0.5,
    twilight: 0,
  })
})

test('adds weather-aware advice to the time and location greeting', () => {
  const greeting = getPersonalGreeting({ phase: 'dawn' }, 'Bandung', 'Hujan ringan')

  assert.match(greeting, /Selamat pagi di Bandung/)
  assert.match(greeting, /Payungmu/)
})

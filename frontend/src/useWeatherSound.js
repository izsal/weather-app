import { useEffect, useRef, useState } from 'react'

function getSoundProfile(visual) {
  if (visual.storm) return { highpass: 90, lowpass: 850, volume: 0.14 }
  if (visual.rain) return { highpass: 320, lowpass: 5200, volume: 0.085 }
  if (visual.snow) return { highpass: 100, lowpass: 1300, volume: 0.035 }
  if (visual.fog || visual.clouds) return { highpass: 140, lowpass: 1000, volume: 0.025 }
  return { highpass: 180, lowpass: 650, volume: 0.012 }
}

export default function useWeatherSound(visual) {
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState('')
  const soundRef = useRef(null)

  useEffect(() => {
    const sound = soundRef.current
    if (!enabled || !sound) return

    const profile = getSoundProfile(visual)
    const now = sound.context.currentTime
    sound.highpass.frequency.setTargetAtTime(profile.highpass, now, 0.6)
    sound.lowpass.frequency.setTargetAtTime(profile.lowpass, now, 0.6)
    sound.gain.gain.setTargetAtTime(profile.volume, now, 0.8)
  }, [enabled, visual])

  useEffect(() => () => {
    const sound = soundRef.current
    soundRef.current = null
    if (sound) {
      sound.source.stop()
      sound.context.close().catch((closeError) => {
        console.warn('Weather ambience audio context could not close.', closeError)
      })
    }
  }, [])

  const toggle = async () => {
    setError('')
    if (enabled) {
      const sound = soundRef.current
      soundRef.current = null
      if (sound) {
        sound.source.stop()
        await sound.context.close()
      }
      setEnabled(false)
      return
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) {
      setError('Browser ini belum mendukung suara cuaca.')
      return
    }

    let context
    try {
      context = new AudioContextClass()
      await context.resume()
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
      const samples = buffer.getChannelData(0)
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] = Math.random() * 2 - 1
      }

      const source = context.createBufferSource()
      source.buffer = buffer
      source.loop = true
      const highpass = context.createBiquadFilter()
      highpass.type = 'highpass'
      const lowpass = context.createBiquadFilter()
      lowpass.type = 'lowpass'
      const gain = context.createGain()
      gain.gain.value = 0.0001
      source.connect(highpass)
      highpass.connect(lowpass)
      lowpass.connect(gain)
      gain.connect(context.destination)
      source.start()
      soundRef.current = { context, source, highpass, lowpass, gain }
      setEnabled(true)
    } catch (audioError) {
      if (context && context.state !== 'closed') {
        await context.close()
      }
      console.error('Weather ambience could not be started.', audioError)
      setError('Suara cuaca tidak dapat diputar. Coba aktifkan kembali.')
    }
  }

  return { enabled, error, toggle }
}

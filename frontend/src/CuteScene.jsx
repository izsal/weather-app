import { useEffect, useRef, useState } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  Shape,
  ShapeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'

function makeCloud() {
  const cloud = new Group()
  const white = new MeshBasicMaterial({ color: '#ffffff' })
  const outline = new MeshBasicMaterial({ color: '#3a3f75' })
  const puffs = [
    [-0.48, -0.02, 0.39],
    [-0.19, 0.18, 0.5],
    [0.18, 0.16, 0.55],
    [0.48, -0.02, 0.4],
  ]

  puffs.forEach(([x, y, radius]) => {
    const border = new Mesh(new CircleGeometry(radius + 0.055, 32), outline)
    border.position.set(x, y, 0)
    const puff = new Mesh(new CircleGeometry(radius, 32), white)
    puff.position.set(x, y, 0.02)
    cloud.add(border, puff)
  })

  const baseOutline = new Mesh(new CircleGeometry(1, 32), outline)
  baseOutline.scale.set(0.82, 0.29, 1)
  baseOutline.position.set(0, -0.16, 0)
  const base = new Mesh(new CircleGeometry(1, 32), white)
  base.scale.set(0.75, 0.22, 1)
  base.position.set(0, -0.16, 0.03)
  cloud.add(baseOutline, base)

  const eyeMaterial = new MeshBasicMaterial({ color: '#334155' })
  const cheekMaterial = new MeshBasicMaterial({ color: '#fb91a8', transparent: true, opacity: 0.8 })
  const eyeGeometry = new CircleGeometry(0.045, 16)
  const cheekGeometry = new CircleGeometry(0.075, 16)
  const eyeLeft = new Mesh(eyeGeometry, eyeMaterial)
  const eyeRight = new Mesh(eyeGeometry, eyeMaterial)
  eyeLeft.position.set(-0.15, -0.01, 0.13)
  eyeRight.position.set(0.15, -0.01, 0.13)
  cloud.add(eyeLeft, eyeRight)

  const cheekLeft = new Mesh(cheekGeometry, cheekMaterial)
  const cheekRight = new Mesh(cheekGeometry, cheekMaterial)
  cheekLeft.position.set(-0.3, -0.13, 0.13)
  cheekRight.position.set(0.3, -0.13, 0.13)
  cloud.add(cheekLeft, cheekRight)

  const arms = [-1, 1].map((side) => {
    const arm = new Group()
    const armPoints = [
      new Vector3(0, 0, 0),
      new Vector3(side * 0.16, 0.13, 0),
    ]
    arm.add(new Line(
      new BufferGeometry().setFromPoints(armPoints),
      new LineBasicMaterial({ color: '#334155', linewidth: 2 }),
    ))
    const hand = new Mesh(
      new CircleGeometry(0.04, 12),
      new MeshBasicMaterial({ color: '#fb91a8' }),
    )
    hand.position.set(side * 0.16, 0.13, 0)
    arm.add(hand)
    arm.position.set(side * 0.59, -0.06, 0.16)
    cloud.add(arm)
    return arm
  })

  const smilePoints = []
  for (let index = 0; index <= 12; index += 1) {
    const x = -0.07 + (index / 12) * 0.14
    smilePoints.push(new Vector3(x, -0.1 - Math.sin((index / 12) * Math.PI) * 0.055, 0.14))
  }
  const smile = new Line(
    new BufferGeometry().setFromPoints(smilePoints),
    new LineBasicMaterial({ color: '#334155', linewidth: 2 }),
  )
  cloud.add(smile)
  cloud.userData.face = { eyes: [eyeLeft, eyeRight], arms }
  return cloud
}

function makeSun() {
  const sun = new Group()
  const rays = new Group()
  const rayMaterial = new MeshBasicMaterial({ color: '#fde047' })

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2
    const ray = new Mesh(new CircleGeometry(0.085, 20), rayMaterial)
    ray.position.set(Math.cos(angle) * 0.82, Math.sin(angle) * 0.82, 0)
    rays.add(ray)
  }
  sun.add(rays)

  const halo = new Mesh(
    new CircleGeometry(0.76, 48),
    new MeshBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0.24 }),
  )
  halo.position.z = -0.02
  const face = new Mesh(
    new CircleGeometry(0.57, 48),
    new MeshBasicMaterial({ color: '#facc15' }),
  )
  face.position.z = 0.03
  sun.add(halo, face)

  const eyeGeometry = new CircleGeometry(0.045, 16)
  const eyeMaterial = new MeshBasicMaterial({ color: '#713f12' })
  const leftEye = new Mesh(eyeGeometry, eyeMaterial)
  const rightEye = new Mesh(eyeGeometry, eyeMaterial)
  leftEye.position.set(-0.17, 0.06, 0.08)
  rightEye.position.set(0.17, 0.06, 0.08)
  sun.add(leftEye, rightEye)

  const smilePoints = []
  for (let index = 0; index <= 12; index += 1) {
    const angle = Math.PI + (index / 12) * Math.PI
    smilePoints.push(new Vector3(Math.cos(angle) * 0.12, -0.03 + Math.sin(angle) * 0.1, 0.09))
  }
  sun.add(new Line(
    new BufferGeometry().setFromPoints(smilePoints),
    new LineBasicMaterial({ color: '#713f12' }),
  ))
  return { sun, rays }
}

function makeHeart(color) {
  const shape = new Shape()
  shape.moveTo(0, -0.14)
  shape.bezierCurveTo(-0.35, 0.12, -0.22, 0.42, 0, 0.22)
  shape.bezierCurveTo(0.22, 0.42, 0.35, 0.12, 0, -0.14)
  return new Mesh(
    new ShapeGeometry(shape),
    new MeshBasicMaterial({ color, transparent: true, opacity: 0.72, side: DoubleSide }),
  )
}

function QwartsCloudMascot({ rainy = false }) {
  return (
    <svg viewBox="0 0 260 220" role="img" aria-label={rainy ? 'Maskot Qwarts Rainy' : 'Maskot Qwarts Cloud'}>
      <defs>
        <linearGradient id="qwarts-cloud-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={rainy ? '#b9dff5' : '#eef7ff'} />
        </linearGradient>
      </defs>
      <g filter="url(#qwarts-shadow)">
        <path
          d="M55 145c-25 0-43-19-43-43 0-22 16-40 37-43 4-35 29-53 57-53 31 0 55 19 60 50 27-3 49 15 49 42 0 27-21 47-48 47H55z"
          fill="url(#qwarts-cloud-body)"
          stroke={rainy ? '#6da6c8' : '#96a3b8'}
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <ellipse cx="89" cy="96" rx="9" ry="9" fill="#3f4a67" />
        <ellipse cx="150" cy="96" rx="9" ry="9" fill="#3f4a67" />
        <ellipse cx="86" cy="92" rx="2.5" ry="3" fill="#ffffff" />
        <ellipse cx="147" cy="92" rx="2.5" ry="3" fill="#ffffff" />
        <ellipse cx="63" cy="126" rx="17" ry="10" fill="#ffadc2" />
        <ellipse cx="176" cy="126" rx="17" ry="10" fill="#ffadc2" />
        <path d="M104 123c9 15 28 15 37 0" fill="none" stroke="#3f4a67" strokeWidth="5" strokeLinecap="round" />
        {rainy && (
          <g fill="#79bce4">
            <path d="M72 161c-2 11 2 18 10 18 8 0 12-7 10-18-3-10-17-10-20 0z" />
            <path d="M120 166c-2 11 2 18 10 18 8 0 12-7 10-18-3-10-17-10-20 0z" />
            <path d="M168 161c-2 11 2 18 10 18 8 0 12-7 10-18-3-10-17-10-20 0z" />
          </g>
        )}
      </g>
    </svg>
  )
}

function SunnyMascot() {
  return (
    <svg viewBox="0 0 260 260" role="img" aria-label="Maskot Qwarts Sunny">
      <g fill="#ffca28">
        <path d="M130 2l24 44-48 0z" />
        <path d="M130 258l24-44h-48z" />
        <path d="M2 130l44-24v48z" />
        <path d="M258 130l-44-24v48z" />
        <path d="M39 39l48 7-31 31z" />
        <path d="M221 39l-48 7 31 31z" />
        <path d="M39 221l48-7-31-31z" />
        <path d="M221 221l-48-7 31-31z" />
      </g>
      <circle cx="130" cy="130" r="82" fill="#ffc83d" stroke="#fff0a6" strokeWidth="8" />
      <ellipse cx="94" cy="126" rx="8" ry="12" fill="#5f4a28" />
      <ellipse cx="166" cy="126" rx="8" ry="12" fill="#5f4a28" />
      <ellipse cx="91" cy="122" rx="2" ry="3" fill="#ffffff" />
      <ellipse cx="163" cy="122" rx="2" ry="3" fill="#ffffff" />
      <ellipse cx="72" cy="158" rx="21" ry="14" fill="#ff9f91" />
      <ellipse cx="188" cy="158" rx="21" ry="14" fill="#ff9f91" />
      <path d="M112 158c8 12 28 12 36 0" fill="none" stroke="#5f4a28" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

function LunaMascot() {
  return (
    <svg viewBox="0 0 260 260" role="img" aria-label="Maskot Qwarts Luna">
      <defs>
        <linearGradient id="qwarts-moon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff8ba" />
          <stop offset="100%" stopColor="#f1b7df" />
        </linearGradient>
      </defs>
      <path
        d="M176 31c-57 8-96 59-84 116 12 58 69 94 126 75-24 4-50-2-70-17-44-32-54-94-22-138 15-21 35-31 50-36z"
        fill="url(#qwarts-moon)"
        stroke="#e99bc7"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path d="M118 153c9 10 27 10 36 0" fill="none" stroke="#6b4d78" strokeWidth="5" strokeLinecap="round" />
      <path d="M92 132c7-7 16-7 23 0" fill="none" stroke="#6b4d78" strokeWidth="5" strokeLinecap="round" />
      <path d="M157 132c7-7 16-7 23 0" fill="none" stroke="#6b4d78" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="83" cy="164" rx="16" ry="9" fill="#ffadca" />
      <ellipse cx="190" cy="164" rx="16" ry="9" fill="#ffadca" />
    </svg>
  )
}

export default function CuteScene({
  visual,
  isDay = 1,
  dayPhase = { phase: Number(isDay) === 0 ? 'night' : 'day', progress: 0.5, twilight: 0 },
  rainChance = 0,
  windSpeed = 0,
  motionEnabled = true,
}) {
  const canvasRef = useRef(null)
  const dayPhaseRef = useRef(dayPhase)
  dayPhaseRef.current = dayPhase
  const [webglUnavailable, setWebglUnavailable] = useState(false)
  const nighttime = dayPhase.phase === 'night'
  const terrainColors = visual.snow
    ? (nighttime ? ['#dbe7f6', '#b9c9e6'] : ['#f1f7ff', '#dcebf8'])
    : visual.storm
      ? (nighttime ? ['#40516e', '#34445f'] : ['#5aa383', '#438a6b'])
      : visual.rain
        ? (nighttime ? ['#48617b', '#3d5570'] : ['#79c49a', '#55ab7c'])
        : visual.fog
          ? (nighttime ? ['#69769d', '#58668b'] : ['#a9d9b5', '#8cc9a0'])
          : nighttime
            ? ['#668478', '#506b69']
            : ['#9be37f', '#6fcf6a']

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let renderer
    try {
      renderer = new WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'low-power',
      })
      setWebglUnavailable(false)
    } catch (error) {
      console.warn('Three.js background could not initialize WebGL.', error)
      setWebglUnavailable(true)
      return undefined
    }

    const scene = new Scene()
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 30)
    camera.position.z = 12
    const lowPowerDevice = window.matchMedia?.('(max-width: 560px)').matches
      || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1 : 1.5))
    renderer.setClearColor(0x000000, 0)

    let worldWidth = 8
    const cloudCount = visual.storm || visual.rain || visual.snow || visual.hail
      ? (lowPowerDevice ? 2 : 3)
      : (lowPowerDevice ? 3 : 4)
    const clouds = Array.from({ length: cloudCount }, (_, index) => {
      const group = makeCloud()
      const scale = 0.72 + ((index * 7) % 4) * 0.12
      const face = group.userData.face
      group.scale.setScalar(scale)
      group.position.set(-worldWidth + index * (worldWidth * 0.58), 2.8 - index * 1.15, 0)
      group.userData = {
        speed: 0.11 + (index % 3) * 0.055,
        bob: 0.12 + (index % 2) * 0.05,
        phase: index * 1.7,
        baseY: group.position.y,
        baseScale: scale,
        travel: 0,
        eyes: face.eyes,
        arms: face.arms,
      }
      scene.add(group)
      return group
    })

    const { sun, rays } = makeSun()
    const initialSolarProgress = Math.min(Math.max(dayPhase.progress, 0), 1)
    sun.position.set(
      (initialSolarProgress - 0.5) * worldWidth * 1.28,
      -0.15 + Math.sin(initialSolarProgress * Math.PI) * 2.45,
      0.3,
    )
    sun.scale.setScalar(0.8)
    sun.visible = visual.sun && dayPhase.phase !== 'night'
    scene.add(sun)

    const moon = new Mesh(
      new CircleGeometry(0.52, 48),
      new MeshBasicMaterial({ color: '#fef3a6', transparent: true }),
    )
    moon.position.set(2.55, 2.35, 0.2)
    moon.visible = dayPhase.phase === 'night' || dayPhase.phase === 'dusk'
    scene.add(moon)

    const fogBanks = Array.from({ length: visual.fog ? 4 : 0 }, (_, index) => {
      const fog = new Mesh(
        new CircleGeometry(1, 48),
        new MeshBasicMaterial({
          color: '#f1f5f9',
          transparent: true,
          opacity: 0.1,
          depthWrite: false,
        }),
      )
      fog.scale.set(worldWidth * 1.25, 0.42 + index * 0.08, 1)
      fog.position.set(0, -1.6 + index * 1.05, -0.35)
      fog.userData.phase = index * 1.8
      scene.add(fog)
      return fog
    })

    const lightning = new Mesh(
      new PlaneGeometry(2, 2),
      new MeshBasicMaterial({
        color: '#e0e7ff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    )
    lightning.scale.set(worldWidth, 4, 1)
    lightning.position.z = 1.5
    lightning.visible = Boolean(visual.storm)
    lightning.userData.nextFlash = 2 + Math.random() * 5
    scene.add(lightning)

    const starCount = lowPowerDevice ? 14 : 24
    const stars = Array.from({ length: starCount }, (_, index) => {
      const star = new Mesh(
        new CircleGeometry(0.018 + (index % 3) * 0.008, 8),
        new MeshBasicMaterial({ color: '#fef08a', transparent: true }),
      )
      star.position.set(
        ((index * 1.731) % 2 - 1) * worldWidth,
        ((index * 0.817) % 7.2) - 0.2,
        -0.2,
      )
      star.userData.phase = index * 0.8
      const phaseOpacity = dayPhase.phase === 'night'
        ? 1
        : dayPhase.phase === 'dawn' || dayPhase.phase === 'dusk'
          ? dayPhase.twilight
          : 0
      star.visible = phaseOpacity > 0.02
      star.material.opacity = phaseOpacity
      scene.add(star)
      return star
    })

    const sparkleCount = visual.sun && !nighttime ? (lowPowerDevice ? 5 : 8) : 0
    const sparkles = Array.from({ length: sparkleCount }, (_, index) => {
      const sparkle = new Mesh(
        new PlaneGeometry(0.12, 0.12),
        new MeshBasicMaterial({
          color: '#fff4bd',
          transparent: true,
          opacity: 0.7,
          side: DoubleSide,
        }),
      )
      sparkle.position.set(((index * 2.173) % 2 - 1) * worldWidth, ((index * 1.37) % 7.4) - 0.3, -0.1)
      sparkle.userData.phase = index * 1.3
      scene.add(sparkle)
      return sparkle
    })

    const heartCount = visual.sun && !nighttime ? (lowPowerDevice ? 2 : 3) : 0
    const hearts = Array.from({ length: heartCount }, (_, index) => {
      const heart = makeHeart(index % 2 ? '#fda4af' : '#fbcfe8')
      heart.position.set(((index * 1.413) % 2 - 1) * worldWidth, -4.5 - index * 0.9, -0.15)
      heart.scale.setScalar(0.55 + (index % 3) * 0.14)
      heart.userData = {
        speed: 0.18 + (index % 3) * 0.07,
        phase: index * 1.4,
        startX: heart.position.x,
      }
      scene.add(heart)
      return heart
    })

    const isRain = visual.rain && !visual.snow && !visual.hail
    const safeRainChance = Math.min(Math.max(Number(rainChance) || 0, 0), 100)
    const safeWindSpeed = Math.min(Math.max(Number(windSpeed) || 0, 0), 100)
    const nominalParticleCount = visual.hail
      ? 24
      : visual.snow
        ? 48
        : isRain
          ? Math.round((visual.storm ? 22 : 18) + safeRainChance * (visual.storm ? 0.22 : 0.35))
          : 0
    const particleCount = lowPowerDevice
      ? Math.round(nominalParticleCount * 0.55)
      : nominalParticleCount
    const particleGeometry = new BufferGeometry()
    const particlePositions = new Float32Array(particleCount * (isRain ? 18 : 3))
    const particleHeads = isRain ? new Float32Array(particleCount * 2) : null
    const particleSpeeds = new Float32Array(particleCount)

    const writeRainDrop = (index) => {
      const x = particleHeads[index * 2]
      const y = particleHeads[index * 2 + 1]
      const width = 0.014
      const length = 0.24
      const z = 0.12
      const windDrift = safeWindSpeed * 0.0015
      particlePositions.set([
        x - width, y, z,
        x + width, y, z,
        x - windDrift, y - length, z,
        x + width, y, z,
        x + width - windDrift, y - length, z,
        x - windDrift, y - length, z,
      ], index * 18)
    }

    for (let index = 0; index < particleCount; index += 1) {
      const x = (Math.random() * 2 - 1) * worldWidth
      const y = Math.random() * 8 - 4
      if (isRain) {
        particleHeads[index * 2] = x
        particleHeads[index * 2 + 1] = y
        writeRainDrop(index)
      } else {
        particlePositions[index * 3] = x
        particlePositions[index * 3 + 1] = y
        particlePositions[index * 3 + 2] = 0.1
      }
      particleSpeeds[index] = isRain
        ? 2.3 + safeRainChance * 0.018 + Math.random() * 1.1
        : visual.snow
          ? 0.45 + Math.random() * 0.75
          : 2.2 + Math.random() * 1.3
    }
    particleGeometry.setAttribute('position', new BufferAttribute(particlePositions, 3))
    const particles = isRain
      ? new Mesh(
        particleGeometry,
        new MeshBasicMaterial({
          color: '#dbeafe',
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
          side: DoubleSide,
        }),
      )
      : new Points(
        particleGeometry,
        new PointsMaterial({
          color: visual.snow ? '#e0f2fe' : '#bae6fd',
          size: visual.snow ? 0.075 : 0.065,
          transparent: true,
          opacity: 0.75,
          sizeAttenuation: true,
        }),
      )
    scene.add(particles)

    const resize = () => {
      const width = Math.max(window.innerWidth, 1)
      const height = Math.max(window.innerHeight, 1)
      const aspect = width / height
      worldWidth = aspect * 4
      camera.left = -worldWidth
      camera.right = worldWidth
      camera.top = 4
      camera.bottom = -4
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      const solarProgress = Math.min(Math.max(dayPhaseRef.current.progress, 0), 1)
      sun.position.x = (solarProgress - 0.5) * worldWidth * 1.28
      sun.position.y = -0.15 + Math.sin(solarProgress * Math.PI) * 2.45
      clouds.forEach((cloud, index) => {
        const startX = ((index * 1.47) % 2 - 1) * worldWidth
        cloud.position.x = startX
        cloud.userData.travel = startX + worldWidth + 1.8
      })
      stars.forEach((star, index) => {
        star.position.x = ((index * 1.731) % 2 - 1) * worldWidth
      })
      sparkles.forEach((sparkle, index) => {
        sparkle.position.x = ((index * 2.173) % 2 - 1) * worldWidth
      })
      hearts.forEach((heart, index) => {
        heart.position.x = ((index * 1.413) % 2 - 1) * worldWidth
        heart.userData.startX = heart.position.x
      })
      fogBanks.forEach((fog) => {
        fog.scale.x = worldWidth * 1.25
      })
      lightning.scale.x = worldWidth
      for (let index = 0; index < particleCount; index += 1) {
        const x = (Math.random() * 2 - 1) * worldWidth
        if (isRain) {
          particleHeads[index * 2] = x
          particleHeads[index * 2 + 1] = Math.random() * 8 - 4
          writeRainDrop(index)
        } else {
          particlePositions[index * 3] = x
        }
      }
      particleGeometry.attributes.position.needsUpdate = true
    }
    resize()
    window.addEventListener('resize', resize)
    const handleContextLost = (event) => {
      event.preventDefault()
      setWebglUnavailable(true)
    }
    canvas.addEventListener('webglcontextlost', handleContextLost)

    let animationFrame = 0
    let previousTime = 0
    let lastRenderTime = 0
    const animate = (time) => {
      if (document.hidden) {
        animationFrame = window.requestAnimationFrame(animate)
        return
      }
      if (time - lastRenderTime < 33) {
        animationFrame = window.requestAnimationFrame(animate)
        return
      }
      lastRenderTime = time

      const elapsed = Math.min((time - previousTime) / 1000, 0.05)
      previousTime = time
      const seconds = time / 1000
      if (!motionEnabled) {
        renderer.render(scene, camera)
        return
      }

      animationFrame = window.requestAnimationFrame(animate)
      clouds.forEach((cloud) => {
        cloud.userData.travel += cloud.userData.speed * elapsed
        const travelRange = worldWidth * 2 + 3.6
        if (cloud.userData.travel > travelRange) cloud.userData.travel -= travelRange
        cloud.position.x = -worldWidth - 1.8 + cloud.userData.travel
          + Math.sin(seconds * 0.32 + cloud.userData.phase) * 0.22
        cloud.position.y = cloud.userData.baseY + Math.sin(seconds + cloud.userData.phase) * cloud.userData.bob
        cloud.rotation.z = Math.sin(seconds * 0.42 + cloud.userData.phase) * 0.025
        cloud.scale.setScalar(
          cloud.userData.baseScale
            * (1 + Math.sin(seconds * 0.8 + cloud.userData.phase) * 0.018),
        )
        const blinkPhase = (seconds + cloud.userData.phase) % 6.4
        const blinkScale = blinkPhase < 0.13
          ? 0.12
          : blinkPhase < 0.25
            ? 0.12 + ((blinkPhase - 0.13) / 0.12) * 0.88
            : 1
        cloud.userData.eyes.forEach((eye) => {
          eye.scale.y = blinkScale
        })
        cloud.userData.arms.forEach((arm, index) => {
          const direction = index === 0 ? -1 : 1
          arm.rotation.z = direction * Math.max(0, Math.sin(seconds * 1.8 + cloud.userData.phase)) * 0.52
        })
      })
      const currentDayPhase = dayPhaseRef.current
      const solarProgress = Math.min(Math.max(currentDayPhase.progress, 0), 1)
      sun.visible = visual.sun && currentDayPhase.phase !== 'night'
      sun.position.x = (solarProgress - 0.5) * worldWidth * 1.28
      sun.position.y = -0.15 + Math.sin(solarProgress * Math.PI) * 2.45
      rays.rotation.z = seconds * 0.12
      sun.position.y += Math.sin(seconds * 0.55) * 0.06
      moon.visible = currentDayPhase.phase === 'night' || currentDayPhase.phase === 'dusk'
      moon.material.opacity = currentDayPhase.phase === 'dusk'
        ? Math.min(currentDayPhase.twilight + 0.2, 1)
        : 1
      sparkles.forEach((sparkle) => {
        sparkle.rotation.z = seconds * 0.22 + sparkle.userData.phase
        sparkle.material.opacity = 0.2 + (Math.sin(seconds * 1.2 + sparkle.userData.phase) + 1) * 0.3
      })
      stars.forEach((star) => {
        const phaseOpacity = currentDayPhase.phase === 'night'
          ? 1
          : currentDayPhase.phase === 'dawn' || currentDayPhase.phase === 'dusk'
            ? currentDayPhase.twilight
            : 0
        star.visible = phaseOpacity > 0.02
        star.material.opacity = phaseOpacity
          * (0.25 + (Math.sin(seconds * 1.8 + star.userData.phase) + 1) * 0.35)
      })
      hearts.forEach((heart) => {
        heart.position.y += heart.userData.speed * elapsed
        heart.position.x = heart.userData.startX + Math.sin(seconds * 0.7 + heart.userData.phase) * 0.22
        if (heart.position.y > 4.5) heart.position.y = -4.5
        heart.material.opacity = 0.35 + (Math.sin(seconds + heart.userData.phase) + 1) * 0.2
      })
      fogBanks.forEach((fog) => {
        fog.position.x = Math.sin(seconds * 0.12 + fog.userData.phase) * worldWidth * 0.12
      })
      if (visual.storm) {
        const flashTime = time / 1000
        lightning.material.opacity = flashTime < lightning.userData.nextFlash
          ? 0
          : flashTime < lightning.userData.nextFlash + 0.08
            ? 0.22
            : flashTime < lightning.userData.nextFlash + 0.2
              ? 0
              : flashTime < lightning.userData.nextFlash + 0.27
                ? 0.18
                : 0
        if (flashTime >= lightning.userData.nextFlash + 0.55) {
          lightning.userData.nextFlash = flashTime + 4 + Math.random() * 7
        }
      }
      for (let index = 0; index < particleCount; index += 1) {
        if (isRain) {
          particleHeads[index * 2] += (
            safeWindSpeed * 0.0015 + Math.sin(seconds * 0.7 + index) * 0.08
          ) * elapsed
          particleHeads[index * 2 + 1] -= particleSpeeds[index] * elapsed
          if (particleHeads[index * 2 + 1] < -4.2) {
            particleHeads[index * 2] = (Math.random() * 2 - 1) * worldWidth
            particleHeads[index * 2 + 1] = 4.2
          }
          writeRainDrop(index)
        } else {
          const positionIndex = index * 3
          particlePositions[positionIndex + 1] -= particleSpeeds[index] * elapsed
          if (visual.snow) {
            particlePositions[positionIndex] += Math.sin(seconds + index) * elapsed * 0.16
          }
          if (particlePositions[positionIndex + 1] < -4.2) {
            particlePositions[positionIndex + 1] = 4.2
            particlePositions[positionIndex] = (Math.random() * 2 - 1) * worldWidth
          }
        }
      }
      particleGeometry.attributes.position.needsUpdate = true
      renderer.render(scene, camera)
    }
    if (motionEnabled) {
      animationFrame = window.requestAnimationFrame(animate)
    } else {
      renderer.render(scene, camera)
    }

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      scene.traverse((object) => {
        object.geometry?.dispose()
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose())
        else object.material?.dispose()
      })
      renderer.dispose()
    }
  }, [
    dayPhase.phase,
    isDay,
    motionEnabled,
    rainChance,
    visual.fog,
    visual.hail,
    visual.rain,
    visual.snow,
    visual.storm,
    visual.sun,
    windSpeed,
  ])

  return (
    <div className="cute-scene-layer" aria-hidden="true">
      <svg className="cute-scene-terrain" viewBox="0 0 1440 300" preserveAspectRatio="none">
        <path d="M0 128C180 68 315 86 510 158c178 66 302 68 470-2 188-79 296-65 460-9v153H0z" fill={terrainColors[0]} />
        <path d="M0 199c173-72 346-78 541-18 194 59 335 62 524-4 139-48 254-35 375 16v107H0z" fill={terrainColors[1]} />
        <g fill={visual.snow ? '#ffffff' : '#6fcf7a'} stroke={visual.snow ? '#cbdcf1' : '#3a3f75'} strokeWidth="5" strokeLinejoin="round">
          <path d="M183 210v-39h12v39zm-14-35 20-31 20 31z" />
          <path d="M1210 231v-48h13v48zm-19-42 25-39 25 39z" />
          <path d="M1282 224v-35h11v35zm-14-32 19-30 20 30z" />
        </g>
      </svg>
      <canvas
        className="cute-scene-canvas"
        ref={canvasRef}
        style={{ visibility: webglUnavailable ? 'hidden' : 'visible' }}
      />
      {webglUnavailable && (
        <div className="cute-scene-fallback">
          <span className="cute-fallback-cloud cute-fallback-cloud-1">☁️</span>
          <span className="cute-fallback-cloud cute-fallback-cloud-2">☁️</span>
          {visual.sun && dayPhase.phase !== 'night' && <span className="cute-fallback-sun">☀️</span>}
          {(dayPhase.phase === 'night' || dayPhase.phase === 'dusk') && <span className="cute-fallback-moon">🌙</span>}
          {visual.sun && !visual.rain && !visual.storm && !visual.snow && (
            <>
              <span className="cute-fallback-heart cute-fallback-heart-1">♥</span>
              <span className="cute-fallback-heart cute-fallback-heart-2">♥</span>
            </>
          )}
          {visual.rain && Array.from({ length: 14 }, (_, index) => (
            <span
              key={`rain-${index}`}
              className="rain-drop"
              style={{ left: `${(index * 4.7) % 100}%`, animationDelay: `${(index % 8) * 0.16}s` }}
            />
          ))}
          {visual.snow && Array.from({ length: 14 }, (_, index) => (
            <span
              key={`snow-${index}`}
              className="snowflake"
              style={{ left: `${(index * 7.3) % 100}%`, animationDelay: `${-index * 0.7}s` }}
            >
              ❄
            </span>
          ))}
          {visual.hail && Array.from({ length: 10 }, (_, index) => (
            <span
              key={`hail-${index}`}
              className="hailstone"
              style={{
                left: `${(index * 7.3) % 100}%`,
                animationDelay: `${-index * 0.4}s`,
                width: '7px',
                height: '7px',
              }}
            />
          ))}
          {visual.fog && (
            <div className="fog-banks">
              {[0, 1, 2, 3].map((bank) => (
                <span className={`fog-bank fog-bank-${bank + 1}`} key={bank} />
              ))}
            </div>
          )}
          {visual.storm && <span className="storm-flash" />}
        </div>
      )}
      <div className={`qwarts-mascot qwarts-mascot-${dayPhase.phase}`} aria-hidden="true">
        {dayPhase.phase === 'night'
          ? <LunaMascot />
          : visual.sun
            ? <SunnyMascot />
            : visual.rain || visual.snow || visual.hail || visual.storm
              ? <QwartsCloudMascot rainy />
              : <QwartsCloudMascot />}
        <span className="qwarts-mascot-shadow" />
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'
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
  const puffs = [
    [-0.48, -0.02, 0.39],
    [-0.19, 0.18, 0.5],
    [0.18, 0.16, 0.55],
    [0.48, -0.02, 0.4],
  ]

  puffs.forEach(([x, y, radius]) => {
    const puff = new Mesh(new CircleGeometry(radius, 32), white)
    puff.position.set(x, y, 0)
    cloud.add(puff)
  })

  const base = new Mesh(new CircleGeometry(1, 32), white)
  base.scale.set(0.75, 0.22, 1)
  base.position.set(0, -0.16, 0.02)
  cloud.add(base)

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

export default function CuteScene({ visual, isDay = 1, motionEnabled = true }) {
  const canvasRef = useRef(null)

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
    } catch (error) {
      console.warn('Three.js background could not initialize WebGL.', error)
      return undefined
    }

    const scene = new Scene()
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 30)
    camera.position.z = 12
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setClearColor(0x000000, 0)

    let worldWidth = 8
    const clouds = Array.from({ length: 5 }, (_, index) => {
      const group = makeCloud()
      const scale = 0.72 + ((index * 7) % 4) * 0.12
      group.scale.setScalar(scale)
      group.position.set(-worldWidth + index * (worldWidth * 0.58), 2.8 - index * 1.15, 0)
      group.userData = {
        speed: 0.11 + (index % 3) * 0.055,
        bob: 0.12 + (index % 2) * 0.05,
        phase: index * 1.7,
        baseY: group.position.y,
      }
      scene.add(group)
      return group
    })

    const { sun, rays } = makeSun()
    sun.position.set(2.55, 2.35, 0.3)
    sun.scale.setScalar(0.8)
    sun.visible = visual.sun && isDay === 1
    scene.add(sun)

    const moon =     new Mesh(
      new CircleGeometry(0.52, 48),
      new MeshBasicMaterial({ color: '#fef3a6' }),
    )
    moon.position.set(2.55, 2.35, 0.2)
    moon.visible = isDay === 0
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

    const stars = Array.from({ length: 36 }, (_, index) => {
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
      star.visible = isDay === 0
      scene.add(star)
      return star
    })

    const sparkles = Array.from({ length: 24 }, (_, index) => {
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

    const hearts = Array.from({ length: 8 }, (_, index) => {
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

    const particleCount = visual.hail ? 32 : visual.snow ? 64 : visual.rain ? 100 : 0
    const particleGeometry = new BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)
    const particleSpeeds = new Float32Array(particleCount)
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = (Math.random() * 2 - 1) * worldWidth
      particlePositions[index * 3 + 1] = Math.random() * 8 - 4
      particlePositions[index * 3 + 2] = 0.1
      particleSpeeds[index] = visual.snow
        ? 0.45 + Math.random() * 0.75
        : visual.hail
          ? 2.2 + Math.random() * 1.3
          : 2.8 + Math.random() * 1.6
    }
    particleGeometry.setAttribute('position', new BufferAttribute(particlePositions, 3))
    const particles = new Points(
      particleGeometry,
      new PointsMaterial({
        color: visual.snow ? '#e0f2fe' : visual.hail ? '#bae6fd' : '#bfdbfe',
        size: visual.snow ? 0.075 : visual.hail ? 0.065 : 0.035,
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
      clouds.forEach((cloud, index) => {
        cloud.position.x = ((index * 1.47) % 2 - 1) * worldWidth
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
        particlePositions[index * 3] = (Math.random() * 2 - 1) * worldWidth
      }
      particleGeometry.attributes.position.needsUpdate = true
    }
    resize()
    window.addEventListener('resize', resize)

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animationFrame = 0
    let previousTime = 0
    const animate = (time) => {
      if (document.hidden) {
        animationFrame = window.requestAnimationFrame(animate)
        return
      }

      const elapsed = Math.min((time - previousTime) / 1000, 0.05)
      previousTime = time
      const seconds = time / 1000
      if (!motionEnabled || motionQuery.matches) {
        renderer.render(scene, camera)
        return
      }

      animationFrame = window.requestAnimationFrame(animate)
      clouds.forEach((cloud) => {
        cloud.position.x += cloud.userData.speed * elapsed
        if (cloud.position.x > worldWidth + 1.8) cloud.position.x = -worldWidth - 1.8
        cloud.position.y = cloud.userData.baseY + Math.sin(seconds + cloud.userData.phase) * cloud.userData.bob
      })
      rays.rotation.z = seconds * 0.12
      sun.position.y = 2.35 + Math.sin(seconds * 0.55) * 0.09
      sparkles.forEach((sparkle) => {
        sparkle.rotation.z = seconds * 0.22 + sparkle.userData.phase
        sparkle.material.opacity = 0.2 + (Math.sin(seconds * 1.2 + sparkle.userData.phase) + 1) * 0.3
      })
      stars.forEach((star) => {
        star.material.opacity = 0.25 + (Math.sin(seconds * 1.8 + star.userData.phase) + 1) * 0.35
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
            ? 0.32
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
      particleGeometry.attributes.position.needsUpdate = true
      renderer.render(scene, camera)
    }
    const handleMotionChange = () => {
      if (!motionEnabled || motionQuery.matches) {
        window.cancelAnimationFrame(animationFrame)
        animationFrame = 0
        renderer.render(scene, camera)
      } else if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(animate)
      }
    }
    motionQuery.addEventListener('change', handleMotionChange)
    if (motionEnabled && !motionQuery.matches) {
      animationFrame = window.requestAnimationFrame(animate)
    } else {
      renderer.render(scene, camera)
    }

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
      motionQuery.removeEventListener('change', handleMotionChange)
      scene.traverse((object) => {
        object.geometry?.dispose()
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose())
        else object.material?.dispose()
      })
      renderer.dispose()
    }
  }, [
    isDay,
    motionEnabled,
    visual.fog,
    visual.hail,
    visual.rain,
    visual.snow,
    visual.storm,
    visual.sun,
  ])

  return (
    <div className="cute-scene-layer" aria-hidden="true">
      <canvas className="cute-scene-canvas" ref={canvasRef} />
    </div>
  )
}

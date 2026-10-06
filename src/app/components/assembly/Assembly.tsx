import { Canvas, useFrame, type RootState, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import {
  CatmullRomCurve3,
  Color,
  type Group,
  MeshPhysicalMaterial,
  PMREMGenerator,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

import type { Piece } from './pieces'

const RADIUS = 0.27

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

const LACQUER = new Color('#3a1a14')
const LACQUER_LIGHT = new Color('#5a2a20')
const GOLD = new Color('#d9a441')

interface Materials {
  lacquer: MeshPhysicalMaterial
  gold: MeshPhysicalMaterial
  warm: MeshPhysicalMaterial
}

function makeMaterials(): Materials {
  const lacquer = new MeshPhysicalMaterial({
    color: LACQUER,
    roughness: 0.22,
    metalness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    sheen: 0.4,
    sheenColor: LACQUER_LIGHT,
  })
  const gold = new MeshPhysicalMaterial({
    color: GOLD,
    roughness: 0.32,
    metalness: 0.92,
    emissive: GOLD,
    emissiveIntensity: 0.18,
  })
  // Hovered: lacquer with a gold sheen, before a tap commits.
  const warm = new MeshPhysicalMaterial({
    color: LACQUER_LIGHT,
    roughness: 0.2,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    sheen: 1,
    sheenColor: GOLD,
    emissive: GOLD,
    emissiveIntensity: 0.06,
  })
  return { lacquer, gold, warm }
}

function PieceMesh({
  piece,
  tRef,
  highlighted,
  materials,
  onSelect,
}: {
  piece: Piece
  tRef: MutableRefObject<number>
  highlighted: boolean
  materials: Materials
  onSelect: (index: number) => void
}) {
  const group = useRef<Group>(null)
  const geometry = useMemo(() => {
    const tubes = piece.strokes.map((pts) => {
      const curve = new CatmullRomCurve3(
        pts.map(([x, y]) => new Vector3(x, y, 0)),
        false,
        'centripetal',
        0.5,
      )
      return new TubeGeometry(curve, Math.max(12, pts.length * 2), RADIUS, 10, false)
    })
    const caps = piece.strokes.flatMap((pts) => [pts[0]!, pts[pts.length - 1]!])
    return { tubes, caps, sphere: new SphereGeometry(RADIUS, 12, 12) }
  }, [piece])
  useEffect(
    () => () => {
      geometry.tubes.forEach((g) => g.dispose())
      geometry.sphere.dispose()
    },
    [geometry],
  )
  useFrame(() => {
    const g = group.current
    if (!g) return
    const e = 1 - easeOut(tRef.current)
    g.position.set(piece.explode[0] * e, piece.explode[1] * e, piece.explode[2] * e)
    g.rotation.set(piece.tilt[0] * e, piece.tilt[1] * e, 0)
  })
  const [hover, setHover] = useState(false)
  const material = highlighted ? materials.gold : hover ? materials.warm : materials.lacquer
  return (
    <group
      ref={group}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onSelect(piece.index)
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
    >
      {geometry.tubes.map((geo, i) => (
        <mesh key={i} geometry={geo} material={material} />
      ))}
      {geometry.caps.map(([x, y], i) => (
        <mesh key={`c${i}`} geometry={geometry.sphere} material={material} position={[x, y, 0]} />
      ))}
    </group>
  )
}

function Tween({
  tRef,
  targetRef,
  idleRef,
}: {
  tRef: MutableRefObject<number>
  targetRef: MutableRefObject<number>
  idleRef: MutableRefObject<Group | null>
}) {
  useFrame((state, delta) => {
    const d = Math.min(1, delta * 4.5)
    tRef.current += (targetRef.current - tRef.current) * d
    if (Math.abs(targetRef.current - tRef.current) < 0.002) tRef.current = targetRef.current
    const g = idleRef.current
    if (g) {
      const time = state.clock.elapsedTime
      g.rotation.y = Math.sin(time * 0.5) * 0.16
      g.rotation.x = Math.cos(time * 0.37) * 0.07
    }
  })
  return null
}

export interface AssemblyProps {
  pieces: Piece[]
  highlighted: number | undefined
  onSelect: (index: number | undefined) => void
  /** True while the pieces should float apart. */
  exploded: boolean
  onExplodedChange: (exploded: boolean) => void
}

/**
 * The kanji as lacquered pieces in space: one per KanjiVG component. Dragging sideways scrubs
 * them together or apart; tapping a piece names it. Rendering pauses off-screen.
 */
export function Assembly({
  pieces,
  highlighted,
  onSelect,
  exploded,
  onExplodedChange,
}: AssemblyProps) {
  const tRef = useRef(exploded ? 0 : 1)
  const targetRef = useRef(exploded ? 0 : 1)
  const idleRef = useRef<Group>(null)
  const materials = useMemo(() => makeMaterials(), [])
  const host = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(true)
  const drag = useRef<{ x: number; start: number; moved: boolean } | undefined>(undefined)
  const studio = useRef<{ dispose: () => void } | undefined>(undefined)

  /**
   * A neutral studio environment so the clearcoat has something to reflect. Built a moment after
   * the first frame: prefiltering costs tens of milliseconds on a phone GPU and seconds on a
   * software renderer, and the pieces should be on screen before that work starts.
   */
  function onCreated({ gl, scene }: RootState) {
    const id = window.setTimeout(() => {
      const pmrem = new PMREMGenerator(gl)
      const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      scene.environment = texture
      scene.environmentIntensity = 0.55
      studio.current = {
        dispose() {
          scene.environment = null
          texture.dispose()
          pmrem.dispose()
        },
      }
    }, 400)
    studio.current = { dispose: () => window.clearTimeout(id) }
  }

  useEffect(() => () => studio.current?.dispose(), [])

  useEffect(() => {
    targetRef.current = exploded ? 0 : 1
  }, [exploded])

  useEffect(
    () => () => {
      materials.lacquer.dispose()
      materials.gold.dispose()
      materials.warm.dispose()
      document.body.style.cursor = ''
    },
    [materials],
  )

  useEffect(() => {
    const el = host.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setActive(Boolean(entry?.isIntersecting)))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={host}
      style={{ width: '100%', height: '100%', touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, start: tRef.current, moved: false }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        const dx = e.clientX - d.x
        if (!d.moved && Math.abs(dx) < 8) return
        d.moved = true
        const width = host.current?.clientWidth ?? 320
        const next = Math.max(0, Math.min(1, d.start + dx / (width * 0.6)))
        tRef.current = next
        targetRef.current = next
      }}
      onPointerUp={() => {
        const d = drag.current
        drag.current = undefined
        if (!d?.moved) return
        const snap = tRef.current >= 0.5
        targetRef.current = snap ? 1 : 0
        onExplodedChange(!snap)
      }}
      onPointerCancel={() => {
        drag.current = undefined
      }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 22], fov: 36 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        frameloop={active ? 'always' : 'never'}
        onCreated={onCreated}
        onPointerMissed={() => onSelect(undefined)}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.55} color="#ffe6c8" />
        <directionalLight position={[5, 8, 10]} intensity={2.4} color="#ffe2b0" />
        <directionalLight position={[-6, -3, 4]} intensity={0.8} color="#d9a441" />
        <pointLight position={[0, 6, -8]} intensity={18} color="#f0c56b" />
        <Tween tRef={tRef} targetRef={targetRef} idleRef={idleRef} />
        <group ref={idleRef}>
          {pieces.map((piece) => (
            <PieceMesh
              key={piece.index}
              piece={piece}
              tRef={tRef}
              highlighted={highlighted === piece.index}
              materials={materials}
              onSelect={(i) => onSelect(highlighted === i ? undefined : i)}
            />
          ))}
        </group>
      </Canvas>
    </div>
  )
}

export default Assembly

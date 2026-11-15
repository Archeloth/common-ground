import { useCallback, useEffect, useRef, useState } from 'react'
import { loadScenario, neighborhoodById, scenarioBounds } from '../game/scenario'
import { blobPoints } from '../game/blob'
import type { Point } from '../game/geometry'
import { pointInPolygon } from '../game/geometry'
import { loadProjects, projectById } from '../game/projects'
import type { Camera } from './render/camera'
import { cameraThatFits, clampZoom, panBy, screenToWorld, worldToScreen, zoomAt } from './render/camera'
import { HOVER_LIFT } from './render/draw'
import { NEED_COLORS } from './render/colors'
import { districtLook } from './render/scene/district'
import type { DistrictLook } from './render/scene/district'
import { drawFrame, FLOAT_MS, POP_MS } from './render/scene/frame'
import type { Floater, Pop } from './render/scene/frame'
import type { VisualId } from './render/sprites/decorations'
import { t } from './i18n'
import type { ExpiryBubble } from './expiryBubbles'
import HoverChip from './HoverChip'
import type { GameState } from '../game/types'
import './TownMap.css'

// Pointer travel below this counts as a click, above it as a drag-pan.
const DRAG_THRESHOLD_PX = 4
// More than this many new projects at once is a loaded save, not a build:
// no pop-in animation then.
const MAX_POPS_AT_ONCE = 3
const FLY_MS = 700
const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug')

// Scenario content is static data (not save state), so load it once.
const scenario = loadScenario()
const projects = loadProjects()

export interface FocusRequest {
  id: string
  nonce: number // a new request for the same district flies again
}

interface TownMapProps {
  selectedId: string | null
  onSelectionChange: (id: string | null) => void
  pulseIds: string[] // neighborhood ids the tutorial wants highlighted
  expiredIds: string[] // neighbourhoods with a project that ran its course
  bubbles: ExpiryBubble[] // expiry popups pinned above their district
  onRenew: (bubble: ExpiryBubble) => void
  onDismiss: (key: string) => void
  onShow: (id: string) => void // "Show" in a bubble: select and fly there
  state: GameState
  reducedMotion: boolean // a still town: no living layer, no fly-to
  focus: FocusRequest | null
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

// Canvas view of the town (Milestone 9: drawn districts, a living layer and
// smooth camera moves). The camera and interaction state live in refs so
// panning and zooming never re-render React. The loop runs every frame while
// the town is animated; under reduced motion it draws only when dirty.
export default function TownMap({
  selectedId,
  onSelectionChange,
  pulseIds,
  expiredIds,
  bubbles,
  onRenew,
  onDismiss,
  onShow,
  state,
  reducedMotion,
  focus,
}: TownMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 })
  const dirtyRef = useRef(true)
  const pointsCacheRef = useRef(new Map<string, Point[]>())
  const hoverIdRef = useRef<string | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; cam: Camera; moved: boolean } | null>(null)
  const pointersRef = useRef(new Map<number, Point>())
  const pinchRef = useRef<{ dist: number; x: number; y: number } | null>(null)
  const busLinesRef = useRef<Array<[string, string]>>([])
  const pulseIdsRef = useRef<string[]>([])
  const reducedMotionRef = useRef(reducedMotion)
  const expiredIdsRef = useRef<string[]>([])
  const looksRef = useRef(new Map<string, DistrictLook>())
  const liftsRef = useRef(new Map<string, number>())
  const popsRef = useRef<Pop[]>([])
  const floatersRef = useRef<Floater[]>([])
  const previousProjectsRef = useRef<GameState['projects'] | null>(null)
  const flightRef = useRef<{ from: Camera; to: Camera; start: number } | null>(null)
  const statsRef = useRef({ frames: 0, ms: 0, last: 0, fps: 0, avgMs: 0 })
  // Expiry bubbles are DOM nodes pinned to world positions; the draw loop
  // moves them with the camera so they follow pans and zooms without React.
  const bubbleElsRef = useRef(new Map<string, HTMLDivElement>())
  const bubbleAnchorsRef = useRef(new Map<string, string>())

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hovered = hoveredId ? neighborhoodById(scenario, hoveredId) : null

  const pointsFor = useCallback((id: string): Point[] => {
    let points = pointsCacheRef.current.get(id)
    if (!points) {
      const n = neighborhoodById(scenario, id)
      points = blobPoints(n.shape.seed, n.shape.x, n.shape.y, n.shape.radius)
      pointsCacheRef.current.set(id, points)
    }
    return points
  }, [])

  const toLocal = useCallback((clientX: number, clientY: number): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const hitTest = useCallback(
    (sx: number, sy: number): string | null => {
      const world = screenToWorld(cameraRef.current, sx, sy)
      for (const n of scenario.neighborhoods) {
        if (pointInPolygon(pointsFor(n.id), world.x, world.y)) return n.id
      }
      return null
    },
    [pointsFor],
  )

  // Pin each expiry bubble just above its district - or below it when there
  // is no room above (top row) - and keep it inside the map horizontally.
  const placeBubbles = useCallback((cssWidth: number) => {
    const cam = cameraRef.current
    const margin = 8
    for (const [key, el] of bubbleElsRef.current) {
      const id = bubbleAnchorsRef.current.get(key)
      if (!id) continue
      const n = neighborhoodById(scenario, id)
      const lift = liftsRef.current.get(id) ?? 0
      const above = worldToScreen(cam, n.shape.x, n.shape.y - n.shape.radius * 0.55)
      const below = worldToScreen(cam, n.shape.x, n.shape.y + n.shape.radius * 0.45)
      const width = el.offsetWidth
      const height = el.offsetHeight
      const flip = above.y - lift - height < margin
      const x = Math.min(Math.max(above.x, width / 2 + margin), cssWidth - width / 2 - margin)
      const top = flip ? below.y : above.y - lift - height
      el.classList.toggle('below', flip)
      el.style.transform = `translate(${Math.round(x - width / 2)}px, ${Math.round(top)}px)`
    }
  }, [])

  // Size the canvas to the container. The whole town is framed only on the
  // first size; later resizes keep the player's view (same zoom, same point in
  // the middle). Re-framing on every resize made the camera jump back to the
  // centre whenever anything nudged the layout - e.g. opening a panel after
  // panning away (playtest bug).
  const sizeRef = useRef<{ width: number; height: number } | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const width = container.clientWidth
      const height = container.clientHeight
      if (width === 0 || height === 0) return
      const previous = sizeRef.current
      if (previous && previous.width === width && previous.height === height) return
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      if (!previous) {
        cameraRef.current = cameraThatFits(scenarioBounds(scenario), width, height)
      } else {
        const cam = cameraRef.current
        const centre = screenToWorld(cam, previous.width / 2, previous.height / 2)
        cameraRef.current = { x: centre.x - width / 2 / cam.zoom, y: centre.y - height / 2 / cam.zoom, zoom: cam.zoom }
      }
      sizeRef.current = { width, height }
      dirtyRef.current = true
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // The look of every district follows the simulation. New projects pop in
  // with sparkles and a floating label of what they will improve.
  useEffect(() => {
    const looks = new Map<string, DistrictLook>()
    for (const n of scenario.neighborhoods) looks.set(n.id, districtLook(state, n))
    looksRef.current = looks
    busLinesRef.current = state.busLines

    const before = previousProjectsRef.current
    previousProjectsRef.current = state.projects
    if (before && before !== state.projects && !reducedMotionRef.current) {
      const fresh: Array<{ neighborhood: string; slot: number; projectId: string }> = []
      for (const n of scenario.neighborhoods) {
        const now = state.projects[n.id] ?? []
        const was = before[n.id] ?? []
        now.forEach((id, slot) => {
          if (id !== null && was[slot] !== id) fresh.push({ neighborhood: n.id, slot, projectId: id })
        })
      }
      if (fresh.length > 0 && fresh.length <= MAX_POPS_AT_ONCE) {
        const born = performance.now()
        for (const item of fresh) {
          const def = projectById(projects, item.projectId)
          popsRef.current.push({ neighborhood: item.neighborhood, slot: item.slot, visual: def.visual as VisualId, born })
          def.effects.forEach((effect, index) => {
            floatersRef.current.push({
              neighborhood: item.neighborhood,
              slot: item.slot,
              text: `+${Math.round(effect.change * 100)}% ${t(`need.${effect.need}`)}`,
              colour: NEED_COLORS[effect.need],
              born,
              row: index,
            })
          })
        }
      }
    }
    dirtyRef.current = true
  }, [state])

  useEffect(() => {
    selectedIdRef.current = selectedId
    dirtyRef.current = true
  }, [selectedId])

  useEffect(() => {
    reducedMotionRef.current = reducedMotion
    dirtyRef.current = true
  }, [reducedMotion])

  useEffect(() => {
    pulseIdsRef.current = pulseIds
    dirtyRef.current = true
  }, [pulseIds])

  useEffect(() => {
    expiredIdsRef.current = expiredIds
    bubbleAnchorsRef.current = new Map(bubbles.map((b) => [b.key, b.neighborhoodId]))
    dirtyRef.current = true
  }, [expiredIds, bubbles])

  // Fly the camera to a district (Show buttons). Reduced motion jumps instead.
  useEffect(() => {
    if (!focus) return
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const width = canvas.width / dpr
    const height = canvas.height / dpr
    const n = neighborhoodById(scenario, focus.id)
    const from = cameraRef.current
    const zoom = clampZoom(Math.max(from.zoom, 1.15))
    // Centre the district in the part of the map the side panel leaves free.
    const freeWidth = width > 760 ? width - 400 : width
    const sheet = width <= 760 // the panel is a bottom sheet there
    const to: Camera = {
      x: n.shape.x - freeWidth / 2 / zoom,
      y: n.shape.y - (sheet ? height * 0.22 : height / 2) / zoom,
      zoom,
    }
    if (reducedMotionRef.current) cameraRef.current = to
    else flightRef.current = { from, to, start: performance.now() }
    dirtyRef.current = true
  }, [focus])

  // Esc closes the panel (an overlay above handles Esc first and marks it).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onSelectionChange(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSelectionChange])

  // The render loop.
  useEffect(() => {
    let frame = 0
    const loop = () => {
      frame = requestAnimationFrame(loop)
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const now = performance.now()
      const reduced = reducedMotionRef.current

      // Camera flight.
      const flight = flightRef.current
      if (flight) {
        const k = Math.min(1, (now - flight.start) / FLY_MS)
        const e = easeInOutCubic(k)
        cameraRef.current = {
          x: flight.from.x + (flight.to.x - flight.from.x) * e,
          y: flight.from.y + (flight.to.y - flight.from.y) * e,
          zoom: flight.from.zoom + (flight.to.zoom - flight.from.zoom) * e,
        }
        if (k >= 1) flightRef.current = null
        dirtyRef.current = true
      }

      // Smooth hover lift: ease toward the target instead of snapping.
      let lifting = false
      for (const n of scenario.neighborhoods) {
        const target = hoverIdRef.current === n.id ? HOVER_LIFT : 0
        const current = liftsRef.current.get(n.id) ?? 0
        const next = reduced ? target : current + (target - current) * 0.25
        const settled = Math.abs(next - target) < 0.05 ? target : next
        if (settled !== current) lifting = true
        liftsRef.current.set(n.id, settled)
      }

      // Drop finished pops and labels.
      if (popsRef.current.length) popsRef.current = popsRef.current.filter((p) => now - p.born < POP_MS + 50)
      if (floatersRef.current.length) floatersRef.current = floatersRef.current.filter((f) => now - f.born < FLOAT_MS)

      const animating = !reduced
      if (!animating && !dirtyRef.current && !lifting) return
      dirtyRef.current = false

      const start = performance.now()
      const dpr = window.devicePixelRatio || 1
      const cssWidth = canvas.width / dpr
      const cssHeight = canvas.height / dpr
      drawFrame(ctx, {
        scenario,
        cam: cameraRef.current,
        cssWidth,
        cssHeight,
        dpr,
        now,
        reducedMotion: reduced,
        looks: looksRef.current,
        lifts: liftsRef.current,
        busLines: busLinesRef.current,
        selectedId: selectedIdRef.current,
        pulseIds: pulseIdsRef.current,
        expiredIds: expiredIdsRef.current,
        pops: popsRef.current,
        floaters: floatersRef.current,
      })
      placeBubbles(cssWidth)

      if (DEBUG) {
        // Dev only (?debug): let automated checks read the camera.
        ;(window as unknown as { __cam?: Camera }).__cam = cameraRef.current
        const stats = statsRef.current
        stats.frames++
        stats.ms += performance.now() - start
        if (now - stats.last > 1000) {
          stats.fps = (stats.frames * 1000) / (now - stats.last)
          stats.avgMs = stats.ms / Math.max(1, stats.frames)
          stats.frames = 0
          stats.ms = 0
          stats.last = now
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(cssWidth - 150, 8, 142, 22)
        ctx.fillStyle = '#fff'
        ctx.font = '12px monospace'
        ctx.fillText(`${stats.fps.toFixed(0)} fps  ${stats.avgMs.toFixed(2)} ms`, cssWidth - 142, 23)
      }
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [placeBubbles])

  // Pointer + wheel input: hover lift, drag-pan, click-select, wheel and pinch
  // zoom (development plan, "Input and controls": pointer events, not mouse).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      flightRef.current = null
      const local = toLocal(e.clientX, e.clientY)
      cameraRef.current = zoomAt(cameraRef.current, Math.exp(-e.deltaY * 0.0015), local.x, local.y)
      dirtyRef.current = true
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      flightRef.current = null
      const local = toLocal(e.clientX, e.clientY)
      pointersRef.current.set(e.pointerId, local)
      if (pointersRef.current.size === 2) {
        const [a, b] = [...pointersRef.current.values()]
        pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        // A pinch is never a click: mark the gesture as moved.
        if (dragRef.current) dragRef.current.moved = true
      } else if (pointersRef.current.size === 1) {
        dragRef.current = { startX: local.x, startY: local.y, cam: cameraRef.current, moved: false }
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const local = toLocal(e.clientX, e.clientY)
      pointersRef.current.set(e.pointerId, local)
      const pointers = [...pointersRef.current.values()]
      if (pointers.length === 2 && pinchRef.current) {
        const [a, b] = pointers
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        cameraRef.current = zoomAt(cameraRef.current, dist / pinchRef.current.dist, pinchRef.current.x, pinchRef.current.y)
        pinchRef.current = { dist, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        dirtyRef.current = true
        return
      }
      const drag = dragRef.current
      if (drag && pointers.length === 1) {
        const dx = local.x - drag.startX
        const dy = local.y - drag.startY
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) drag.moved = true
        if (drag.moved) {
          cameraRef.current = panBy(drag.cam, dx, dy)
          dirtyRef.current = true
        }
        return
      }
      // Hover (mouse and pen only; touch has no hover).
      if (e.pointerType === 'touch') return
      const id = hitTest(local.x, local.y)
      if (id !== hoverIdRef.current) {
        hoverIdRef.current = id
        setHoveredId(id)
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      const drag = dragRef.current
      if (drag && !drag.moved && pointersRef.current.size === 1) {
        const local = toLocal(e.clientX, e.clientY)
        const id = hitTest(local.x, local.y)
        onSelectionChange(id)
        // On touch, a tap shows the district's stats card briefly.
        if (e.pointerType === 'touch') {
          hoverIdRef.current = id
          setHoveredId(id)
        }
        dirtyRef.current = true
      }
      pointersRef.current.delete(e.pointerId)
      if (pointersRef.current.size < 2) pinchRef.current = null
      if (pointersRef.current.size === 0) dragRef.current = null
    }

    const onPointerCancel = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId)
      if (pointersRef.current.size < 2) pinchRef.current = null
      if (pointersRef.current.size === 0) dragRef.current = null
    }

    const onPointerLeave = (e: PointerEvent) => {
      if (pointersRef.current.size === 0 && e.pointerType !== 'touch') {
        hoverIdRef.current = null
        setHoveredId(null)
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
    canvas.addEventListener('pointerleave', onPointerLeave)
    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
      canvas.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [toLocal, hitTest, onSelectionChange])

  // The touch stats card hides itself after a few seconds.
  useEffect(() => {
    if (!hoveredId || !matchMedia('(hover: none)').matches) return
    const timer = window.setTimeout(() => {
      hoverIdRef.current = null
      setHoveredId(null)
    }, 3500)
    return () => window.clearTimeout(timer)
  }, [hoveredId])

  return (
    <div ref={containerRef} className="town-map">
      <canvas ref={canvasRef} className="town-map-canvas" aria-label={t('map.label')} />
      {bubbles.map((bubble) => (
        <div
          key={bubble.key}
          className="expiry-bubble"
          role="alert"
          ref={(el) => {
            if (el) bubbleElsRef.current.set(bubble.key, el)
            else bubbleElsRef.current.delete(bubble.key)
          }}
        >
          <p>
            <span aria-hidden="true">{'⌛'} </span>
            {bubble.text}
          </p>
          <div className="expiry-bubble-actions">
            <button
              type="button"
              className="expiry-renew"
              data-sound="none"
              disabled={!bubble.canRenew}
              onClick={() => onRenew(bubble)}
            >
              {bubble.renewLabel}
            </button>
            <button type="button" onClick={() => onShow(bubble.neighborhoodId)}>
              {t('expiry.open')}
            </button>
            <button type="button" onClick={() => onDismiss(bubble.key)}>
              {t('expiry.dismiss')}
            </button>
          </div>
        </div>
      ))}
      {hovered && <HoverChip neighborhood={hovered} state={state} />}
    </div>
  )
}

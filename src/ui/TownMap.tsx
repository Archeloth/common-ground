import { useCallback, useEffect, useRef, useState } from 'react'
import { bridgeBetween, loadScenario, neighborhoodById, scenarioBounds } from '../game/scenario'
import { blobPoints } from '../game/blob'
import type { Point } from '../game/geometry'
import { pointInPolygon } from '../game/geometry'
import type { Camera } from './render/camera'
import { cameraThatFits, panBy, screenToWorld, worldToScreen, zoomAt } from './render/camera'
import { buildPath2D, drawBadge, drawBridge, drawBusLine, drawPulseRing, drawRaisedBlob, drawRiver, HOVER_LIFT } from './render/draw'
import { COLORS, KIND_COLORS, shade } from './render/colors'
import { t } from './i18n'
import type { ExpiryBubble } from './expiryBubbles'
import HoverChip from './HoverChip'
import type { GameState } from '../game/types'
import './TownMap.css'

// Pointer travel below this counts as a click, above it as a drag-pan.
const DRAG_THRESHOLD_PX = 4

// Scenario content is static data (not save state), so load it once at module
// level. No ref means reads during render are lint-clean.
const scenario = loadScenario()

interface TownMapProps {
  selectedId: string | null
  onSelectionChange: (id: string | null) => void
  busLines: Array<[string, string]>
  pulseIds: string[] // neighborhood ids the tutorial wants highlighted
  expiredIds: string[] // neighbourhoods with a project that ran its course
  bubbles: ExpiryBubble[] // expiry popups pinned above their district
  onRenew: (bubble: ExpiryBubble) => void
  onDismiss: (key: string) => void
  state: GameState // read only by the hover chip
}

// Canvas view of the town. The camera and interaction state live in refs so
// panning and zooming never re-render React; the rAF loop redraws only when a
// dirty flag is set (performance playbook: a paused town costs almost nothing).
export default function TownMap({
  selectedId,
  onSelectionChange,
  busLines,
  pulseIds,
  expiredIds,
  bubbles,
  onRenew,
  onDismiss,
  state,
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
  const expiredIdsRef = useRef<string[]>([])
  // Expiry bubbles are DOM nodes pinned to world positions; the draw loop
  // moves them with the camera so they follow pans and zooms without React.
  const bubbleElsRef = useRef(new Map<string, HTMLDivElement>())
  const bubbleAnchorsRef = useRef(new Map<string, string>())

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const hovered = hoveredId ? neighborhoodById(scenario, hoveredId) : null
  // The hover chip follows the pointer; the selection opens the side panel.
  const label = hovered

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

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const cssWidth = canvas.width / dpr
    const cssHeight = canvas.height / dpr
    const cam = cameraRef.current

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = COLORS.ground
    ctx.fillRect(0, 0, cssWidth, cssHeight)

    drawRiver(ctx, cam, scenario.river.points, scenario.river.halfDepth)
    // Milestone 8.5: the two fixed bridges, the only river crossings.
    for (const bridge of scenario.bridges) drawBridge(ctx, cam, bridge.point, scenario.river.halfDepth)

    // Milestone 7: dashed bus links between the blob centres (via the bridge
    // when the link crosses the river).
    for (const [a, b] of busLinesRef.current) {
      const from = neighborhoodById(scenario, a).shape
      const to = neighborhoodById(scenario, b).shape
      const bridge = bridgeBetween(scenario, a, b)
      drawBusLine(ctx, cam, bridge ? [from, bridge.point, to] : [from, to])
    }

    for (const n of scenario.neighborhoods) {
      const path = buildPath2D(pointsFor(n.id).map((p) => worldToScreen(cam, p.x, p.y)))
      const top = KIND_COLORS[n.kind]
      const lift = hoverIdRef.current === n.id ? HOVER_LIFT : 0
      drawRaisedBlob(ctx, path, top, shade(top, -25), lift)
      if (selectedIdRef.current === n.id) {
        ctx.strokeStyle = COLORS.selectedStroke
        ctx.lineWidth = 3
        ctx.stroke(path)
      }
    }

    // Milestone 8.5: an hourglass on districts with a lapsed project.
    for (const id of expiredIdsRef.current) {
      const n = neighborhoodById(scenario, id)
      drawBadge(ctx, cam, n.shape, n.shape.radius, '⌛')
    }

    // Pin each expiry bubble just above its district - or below it when there
    // is no room above (top row) - and keep it inside the map horizontally.
    const margin = 8
    for (const [key, el] of bubbleElsRef.current) {
      const id = bubbleAnchorsRef.current.get(key)
      if (!id) continue
      const n = neighborhoodById(scenario, id)
      const above = worldToScreen(cam, n.shape.x, n.shape.y - n.shape.radius * 0.55)
      const below = worldToScreen(cam, n.shape.x, n.shape.y + n.shape.radius * 0.45)
      const width = el.offsetWidth
      const height = el.offsetHeight
      const flip = above.y - height < margin
      const x = Math.min(Math.max(above.x, width / 2 + margin), cssWidth - width / 2 - margin)
      const top = flip ? below.y : above.y - height
      el.classList.toggle('below', flip)
      el.style.transform = `translate(${Math.round(x - width / 2)}px, ${Math.round(top)}px)`
    }

    // Milestone 8: pulsing rings point at the tutorial's target neighbourhoods.
    const now = performance.now()
    for (const id of pulseIdsRef.current) {
      const n = neighborhoodById(scenario, id)
      drawPulseRing(ctx, cam, n.shape, n.shape.radius, now)
    }
  }, [pointsFor])

  // Size the canvas to the container and frame the whole town.
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const width = container.clientWidth
      const height = container.clientHeight
      if (width === 0 || height === 0) return
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      cameraRef.current = cameraThatFits(scenarioBounds(scenario), width, height)
      dirtyRef.current = true
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Mirror the controlled selection into a ref the draw loop can read without a
  // re-render, and redraw so the outline matches the panel.
  useEffect(() => {
    selectedIdRef.current = selectedId
    dirtyRef.current = true
  }, [selectedId])

  // Tutorial pulse targets come from App; mirror them the same way.
  useEffect(function syncPulseIds() {
    pulseIdsRef.current = pulseIds
    dirtyRef.current = true
  }, [pulseIds])

  // Expired districts and bubbles change with sim state; redraw to place them.
  useEffect(() => {
    expiredIdsRef.current = expiredIds
    bubbleAnchorsRef.current = new Map(bubbles.map((b) => [b.key, b.neighborhoodId]))
    dirtyRef.current = true
  }, [expiredIds, bubbles])

  // Bus lines are sim state; mirror them into the draw loop and redraw.
  useEffect(() => {
    busLinesRef.current = busLines
    dirtyRef.current = true
  }, [busLines])

  // Esc closes the panel (the plan's controls: Esc to cancel/escape).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // An overlay above (lexicon, drawer) handles Esc first and marks it.
      if (e.key === 'Escape' && !e.defaultPrevented) onSelectionChange(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSelectionChange])

  // Render loop: draw only when something changed.
  useEffect(() => {
    let frame = 0
    const loop = () => {
      if (dirtyRef.current) {
        drawScene()
        dirtyRef.current = false
      }
      // Keep the pulse rings breathing while the tutorial highlights targets.
      if (pulseIdsRef.current.length !== 0) dirtyRef.current = true
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [drawScene])

  // Pointer + wheel input: hover lift, drag-pan, click-select, wheel and pinch
  // zoom (development plan, "Input and controls": pointer events, not mouse).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const local = toLocal(e.clientX, e.clientY)
      cameraRef.current = zoomAt(cameraRef.current, Math.exp(-e.deltaY * 0.0015), local.x, local.y)
      dirtyRef.current = true
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      const local = toLocal(e.clientX, e.clientY)
      pointersRef.current.set(e.pointerId, local)

      if (pointersRef.current.size === 2) {
        const [a, b] = [...pointersRef.current.values()]
        pinchRef.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        }
        // A pinch is never a click, and the first pointer must not select on
        // release, so mark the gesture as moved.
        if (dragRef.current) dragRef.current.moved = true
      } else if (pointersRef.current.size === 1) {
        dragRef.current = { startX: local.x, startY: local.y, cam: cameraRef.current, moved: false }
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const local = toLocal(e.clientX, e.clientY)
      pointersRef.current.set(e.pointerId, local)
      const pointers = [...pointersRef.current.values()]

      // Two fingers: pinch-zoom about their midpoint.
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

      // Hover: lift the neighborhood under the pointer.
      const id = hitTest(local.x, local.y)
      if (id !== hoverIdRef.current) {
        hoverIdRef.current = id
        setHoveredId(id)
        dirtyRef.current = true
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      const drag = dragRef.current
      if (drag && !drag.moved && pointersRef.current.size === 1) {
        const local = toLocal(e.clientX, e.clientY)
        onSelectionChange(hitTest(local.x, local.y))
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

    const onPointerLeave = () => {
      if (pointersRef.current.size === 0) {
        hoverIdRef.current = null
        setHoveredId(null)
        dirtyRef.current = true
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

  return (
    <div ref={containerRef} className="town-map">
      <canvas ref={canvasRef} className="town-map-canvas" aria-label="Willowbrook town map" />
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
            <button type="button" className="expiry-renew" disabled={!bubble.canRenew} onClick={() => onRenew(bubble)}>
              {bubble.renewLabel}
            </button>
            <button type="button" onClick={() => onSelectionChange(bubble.neighborhoodId)}>
              {t('expiry.open')}
            </button>
            <button type="button" onClick={() => onDismiss(bubble.key)}>
              {t('expiry.dismiss')}
            </button>
          </div>
        </div>
      ))}
      {label && <HoverChip neighborhood={label} state={state} />}
    </div>
  )
}


import { useCallback, useEffect, useRef, useState } from 'react'
import { loadScenario, neighborhoodById, scenarioBounds } from '../game/scenario'
import { blobPoints } from '../game/blob'
import type { Point } from '../game/geometry'
import { pointInPolygon } from '../game/geometry'
import type { Camera } from './render/camera'
import { cameraThatFits, panBy, screenToWorld, worldToScreen, zoomAt } from './render/camera'
import { buildPath2D, drawRaisedBlob, drawRiver, HOVER_LIFT } from './render/draw'
import { COLORS, KIND_COLORS, shade } from './render/colors'
import './TownMap.css'

// Pointer travel below this counts as a click, above it as a drag-pan.
const DRAG_THRESHOLD_PX = 4
// The river runs between the second and third rows of the 4x4 Willowbrook
// layout; hand-tuned against the scenario shapes.
const RIVER_Y = 340
const RIVER_HALF_DEPTH = 34

// Scenario content is static data (not save state), so load it once at module
// level. No ref means reads during render are lint-clean.
const scenario = loadScenario()

// Canvas view of the town. The camera and interaction state live in refs so
// panning and zooming never re-render React; the rAF loop redraws only when a
// dirty flag is set (performance playbook: a paused town costs almost nothing).
export default function TownMap() {
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

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const hovered = hoveredId ? neighborhoodById(scenario, hoveredId) : null
  const selected = selectedId ? neighborhoodById(scenario, selectedId) : null
  const label = hovered ?? selected

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
    const bounds = scenarioBounds(scenario)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = COLORS.ground
    ctx.fillRect(0, 0, cssWidth, cssHeight)

    drawRiver(ctx, cam, bounds.minX, bounds.minX + bounds.width, RIVER_Y, RIVER_HALF_DEPTH)

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

  // Render loop: draw only when something changed.
  useEffect(() => {
    let frame = 0
    const loop = () => {
      if (dirtyRef.current) {
        drawScene()
        dirtyRef.current = false
      }
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
        const id = hitTest(local.x, local.y)
        selectedIdRef.current = id
        setSelectedId(id)
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

    canvas.addEventListener('wheel', onWheel)
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
  }, [toLocal, hitTest])

  return (
    <div ref={containerRef} className="town-map">
      <canvas ref={canvasRef} className="town-map-canvas" aria-label="Willowbrook town map" />
      {label && (
        <div className="neighborhood-chip" role="status">
          <strong>{label.name}</strong>
          <span>
            {label.kind.replaceAll('_', ' ')} · {label.residents.toLocaleString('en-GB')} residents
          </span>
        </div>
      )}
    </div>
  )
}


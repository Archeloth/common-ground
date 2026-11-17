import { useEffect, useRef } from 'react'
import { SKY_POSES, drawSpecies } from './render/sprites/wildlife'

const WIDTH = 72
const HEIGHT = 56
const SKY_SCALE = 3.8 // birds in flight (wide wings)
const GROUND_SCALE = 4.2

// A still picture of a journal species, drawn with the same sprite as on the
// map. Species not spotted yet show as a soft silhouette.
export default function SpeciesThumb({ id, found }: { id: string; found: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = WIDTH * dpr
    canvas.height = HEIGHT * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    const sky = SKY_POSES[id]
    if (sky) {
      // Centre the bird in the frame by dropping its ground point below it.
      drawSpecies(ctx, id, WIDTH / 2 + sky.dx * SKY_SCALE, HEIGHT / 2 + sky.lift * SKY_SCALE, SKY_SCALE, sky.t)
    } else {
      if (found) {
        ctx.beginPath()
        ctx.ellipse(WIDTH / 2, HEIGHT * 0.82, WIDTH * 0.42, 6, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#d6e8cc'
        ctx.fill()
      }
      // The bumblebee hovers above its ground point; bring it into frame.
      const groundY = id === 'bumblebee' ? HEIGHT * 0.95 : HEIGHT * 0.8
      drawSpecies(ctx, id, WIDTH / 2 - (id === 'badger' || id === 'hedgehog' ? 3 : 0), groundY, GROUND_SCALE, 0)
    }
    if (!found) {
      ctx.globalCompositeOperation = 'source-atop'
      ctx.fillStyle = '#9aa394'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      ctx.globalCompositeOperation = 'source-over'
    }
  }, [id, found])
  return <canvas ref={ref} className="species-thumb" style={{ width: WIDTH, height: HEIGHT }} aria-hidden="true" />
}

import { audioContext, audioLevels } from './audio'
import { getSettings } from './settings'

// Generated ambience (Milestone 9): a soft wind bed and synthesised birdsong,
// made with Web Audio (no files, no licences). Birds sing more often as the
// town gets greener, so a greener town literally sounds livelier. Volume
// follows the "Music and ambience" slider; while paused it drops to a hush.

const BASE_LEVEL = 0.22 // the whole bed stays well under the effects
const WIND_LEVEL = 0.5
const PAUSED_FACTOR = 0.35

interface Running {
  master: GainNode
  noise: AudioBufferSourceNode
  lfo: OscillatorNode
  birdTimer: number | null
}

let running: Running | null = null
let green = 0.5
let isPaused = false

function targetLevel(): number {
  return BASE_LEVEL * audioLevels(getSettings()).music * (isPaused ? PAUSED_FACTOR : 1)
}

function brownNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

// One little phrase: two to four quick rising-and-falling notes.
function chirp(ctx: AudioContext, out: AudioNode): void {
  const notes = 2 + Math.floor(Math.random() * 3)
  const base = 2200 + Math.random() * 1600
  let t = ctx.currentTime + 0.02
  for (let n = 0; n < notes; n++) {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'sine'
    const top = base * (1 + Math.random() * 0.35)
    osc.frequency.setValueAtTime(base, t)
    osc.frequency.exponentialRampToValueAtTime(top, t + 0.045)
    osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.09)
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(0.18, t + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
    osc.connect(env).connect(out)
    osc.start(t)
    osc.stop(t + 0.12)
    t += 0.11 + Math.random() * 0.08
  }
}

function scheduleBirds(): void {
  const state = running
  const ctx = audioContext()
  if (!state || !ctx) return
  // A bare town: a bird every ~12 s; a green one: every ~2.5 s.
  const mean = 12000 - 9500 * Math.min(1, Math.max(0, green))
  const wait = mean * (0.5 + Math.random())
  state.birdTimer = window.setTimeout(() => {
    if (!running) return
    if (!isPaused || Math.random() < 0.3) chirp(ctx, running.master)
    scheduleBirds()
  }, wait)
}

export function startAmbience(): void {
  const ctx = audioContext()
  if (!ctx || running) return
  const master = ctx.createGain()
  master.gain.value = 0.0001
  master.connect(ctx.destination)

  const noise = ctx.createBufferSource()
  noise.buffer = brownNoise(ctx, 4)
  noise.loop = true
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 420
  const wind = ctx.createGain()
  wind.gain.value = WIND_LEVEL
  // A slow swell, like a breeze coming and going.
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.07
  const lfoDepth = ctx.createGain()
  lfoDepth.gain.value = WIND_LEVEL * 0.45
  lfo.connect(lfoDepth).connect(wind.gain)
  noise.connect(lowpass).connect(wind).connect(master)
  noise.start()
  lfo.start()

  running = { master, noise, lfo, birdTimer: null }
  refreshAmbience()
  scheduleBirds()
}

export function stopAmbience(): void {
  const state = running
  const ctx = audioContext()
  if (!state || !ctx) return
  running = null
  if (state.birdTimer !== null) window.clearTimeout(state.birdTimer)
  state.master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3)
  window.setTimeout(() => {
    state.noise.stop()
    state.lfo.stop()
    state.master.disconnect()
  }, 1500)
}

// Re-read the volume settings and the town's mood (fades smoothly).
export function refreshAmbience(mood?: { green?: number; paused?: boolean }): void {
  if (mood?.green !== undefined) green = mood.green
  if (mood?.paused !== undefined) isPaused = mood.paused
  const ctx = audioContext()
  if (!running || !ctx) return
  running.master.gain.setTargetAtTime(Math.max(0.0001, targetLevel()), ctx.currentTime, 0.8)
}

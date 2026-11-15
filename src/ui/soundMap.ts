// Which file plays for which moment (Milestone 9). One table so sounds can be
// re-mapped by ear without touching code elsewhere. Several files per id are
// picked at random, so repeated clicks do not sound mechanical.
//
// `gain` compensates for how quietly each source file was recorded (their peaks
// range from 5% to 29% of full scale); 1 = unchanged. `rate` shifts the pitch
// (1 = as recorded). `category` picks the volume slider: interface sounds
// (clicks, tabs, drawers) or game sounds (things happening in the town).
// Files: public/audio/, "Interface Sounds Starter Pack" (OpenGameArt,
// CC-BY-SA 3.0, trimmed; see LICENSES.md).

export type SoundId =
  | 'click' // ordinary buttons, tabs, toolbar
  | 'toggle' // speed buttons, checkboxes
  | 'open' // a drawer, panel or the lexicon opens
  | 'close'
  | 'refuse' // an action was refused
  | 'build' // a project starts (and again when it is finished)
  | 'remove' // a project is removed
  | 'renew' // a project is renewed, or a bus line starts
  | 'research' // a technology is researched
  | 'reward' // a resident request is fulfilled
  | 'meeting' // a town meeting is held
  | 'milestone' // a chapter is completed
  | 'expire' // a project ran its course

export type SoundCategory = 'interface' | 'game'

export interface SoundDef {
  files: string[]
  gain: number
  rate?: number
  category: SoundCategory
}

// The bright "message" chime is kept for completed chapters only: playtesters
// found it grating as the sound of every volunteer spent or gained.
export const SOUND_MAP: Record<SoundId, SoundDef> = {
  click: { files: ['click.wav', 'click2.wav', 'click3.wav'], gain: 2.2, category: 'interface' },
  toggle: { files: ['click4.wav', 'click7.wav'], gain: 1.4, category: 'interface' },
  open: { files: ['snap2.wav'], gain: 1.6, category: 'interface' },
  close: { files: ['click5.wav'], gain: 1.2, category: 'interface' },
  refuse: { files: ['click5.wav'], gain: 1.4, rate: 0.75, category: 'interface' },
  build: { files: ['snap.wav', 'snap1.wav'], gain: 1.8, category: 'game' },
  remove: { files: ['dustbin.wav'], gain: 3.5, category: 'game' },
  renew: { files: ['drop.wav'], gain: 2, category: 'game' },
  research: { files: ['appear-online.wav'], gain: 3, category: 'game' },
  reward: { files: ['drop.wav'], gain: 2, rate: 1.2, category: 'game' },
  meeting: { files: ['click6.wav'], gain: 1.6, category: 'game' },
  milestone: { files: ['message.wav'], gain: 1.8, category: 'game' },
  expire: { files: ['cut.wav'], gain: 1.8, category: 'game' },
}

// Which file plays for which moment (Milestone 9). One table so sounds can be
// re-mapped by ear without touching code elsewhere. Several files per id are
// picked at random, so repeated clicks do not sound mechanical.
//
// `gain` compensates for how quietly each source file was recorded (their peaks
// range from 5% to 29% of full scale); 1 = unchanged. Files: public/audio/,
// "Interface Sounds Starter Pack" (OpenGameArt, CC-BY-SA 3.0, trimmed; see
// LICENSES.md).

export type SoundId =
  | 'click' // ordinary buttons, tabs, toolbar
  | 'toggle' // speed buttons, checkboxes
  | 'open' // a drawer, panel or the lexicon opens
  | 'close'
  | 'build' // a project starts
  | 'remove' // a project is removed
  | 'renew' // a project is renewed, or a bus line starts
  | 'research' // a technology is researched
  | 'reward' // a resident request is fulfilled, a town meeting is held
  | 'milestone' // a chapter is completed
  | 'expire' // a project ran its course
  | 'refuse' // an action was refused

export interface SoundDef {
  files: string[]
  gain: number
}

export const SOUND_MAP: Record<SoundId, SoundDef> = {
  click: { files: ['click.wav', 'click2.wav', 'click3.wav'], gain: 2.2 },
  toggle: { files: ['click4.wav', 'click7.wav'], gain: 1.4 },
  open: { files: ['snap2.wav'], gain: 1.6 },
  close: { files: ['click5.wav'], gain: 1.2 },
  build: { files: ['snap.wav', 'snap1.wav'], gain: 1.8 },
  remove: { files: ['dustbin.wav'], gain: 3.5 },
  renew: { files: ['drop.wav'], gain: 2 },
  research: { files: ['appear-online.wav'], gain: 3 },
  reward: { files: ['message.wav'], gain: 1.6 },
  milestone: { files: ['message.wav'], gain: 2 },
  expire: { files: ['click6.wav'], gain: 1.6 },
  refuse: { files: ['cut.wav'], gain: 1.8 },
}

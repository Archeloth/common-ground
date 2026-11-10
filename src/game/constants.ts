// All simulation balance numbers live here, with a comment saying why each
// exists (plan coding standard 7: "numbers have names"). Tune these in
// playtests; the tests reference the constants, not magic numbers.
//
// Time model (plan section 3): one tick is one in-game day; 30 ticks make a
// month. The fixed-timestep loop in store.ts turns ticks into wall time.

export const TICK_MS = 1000 // one tick per second at speed 1x (plan loop snippet)
export const MAX_TICKS_PER_FRAME = 200 // guard against a catch-up spiral
export const TICKS_PER_MONTH = 30 // in-game days per month

// Monthly Budget income from local taxes (plan: "about 0.25 per resident" —
// Willowbrook's ~11,800 residents give ~2,950/month, close to the plan's ~3,000).
export const BUDGET_PER_RESIDENT_PER_MONTH = 0.25

// Monthly Community-time regeneration (plan: "regenerates from the average
// engagement"). A baseline plus an engagement-scaled share keeps it gentle.
export const COMMUNITY_TIME_BASE_PER_MONTH = 1
export const COMMUNITY_TIME_ENGAGEMENT_FACTOR = 5 // engagement 100 adds 5/month

// Needs move 2% of the way to their target each tick, so a project's advertised
// effect materialises over 2-3 in-game months instead of instantly (the panel
// explains the change while it happens).
export const NEED_DRIFT_PER_TICK = 0.02

// The plan's display smoothing: "move 5% toward the target each tick".
export const SATISFACTION_SMOOTH_PER_TICK = 0.05

// How many shortfalls the panel's reasons list stores (plan: "the three largest").
export const TOP_REASONS = 3
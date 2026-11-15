// All simulation balance numbers live here, with a comment saying why each
// exists (plan coding standard 7: "numbers have names"). Tune these in
// playtests; the tests reference the constants, not magic numbers.
//
// Time model (plan section 3): one tick is one in-game day; 30 ticks make a
// month. The fixed-timestep loop in store.ts turns ticks into wall time.

export const TICK_MS = 1000 // one tick per second at speed 1x (plan loop snippet)
export const MAX_TICKS_PER_FRAME = 200 // guard against a catch-up spiral
export const TICKS_PER_MONTH = 30 // in-game days per month

// Monthly Budget income from local taxes, per resident (balance pass): a base
// plus a share that grows with town satisfaction - a happy town keeps its
// shops and residents, so good play pays. Willowbrook's ~11,800 residents give
// ~2,970/month at satisfaction 60 (close to the plan's ~3,000), ~3,250 at 80
// and ~2,690 at 40.
export const TAX_BASE_PER_RESIDENT = 0.13
export const TAX_SATISFACTION_PER_RESIDENT = 0.14 // x town satisfaction / 100

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

// --- Milestone 7: organizer mechanics ---------------------------------------

// Town meeting: costs one Community time and raises one neighborhood's
// engagement by 10 (plan: "raises one neighborhood's engagement by 10").
export const TOWN_MEETING_TIME = 1
export const TOWN_MEETING_ENGAGEMENT = 10
// Residents need time between meetings: one per district every two months
// (playtest: meetings could be repeated back to back, so engagement was
// spammable).
export const TOWN_MEETING_COOLDOWN_DAYS = 60

// Undo (plan: "undo makes experimenting feel safe"): the last undoable
// action can be taken back within this many real-time milliseconds.
export const UNDO_WINDOW_MS = 8000

// Town history (one point per month) is capped at 20 years so saves stay small.
export const HISTORY_MAX_POINTS = 240
export const ENGAGEMENT_MAX = 100

// Projects finish faster in engaged neighborhoods: Community-time cost is
// multiplied by (1 - engagement / divisor). 200 => engagement 100 halves the
// cost; the plan: "high engagement ... complete grassroots projects faster".
export const PROJECT_TIME_ENGAGEMENT_DIVISOR = 200

// Food surplus flows to adjacent neighborhoods at 70% efficiency (transport
// losses), per the plan's "Links between neighborhoods" section.
export const FOOD_SHARE_EFFICIENCY = 0.7
// Bus lines: budget cost, mobility bonus to both linked neighborhoods
// (plan's starter-project table: "1,000 | 0 | Mobility +0.20 in both links").
export const BUS_LINE_COST = 1000
export const BUS_MOBILITY_BONUS = 0.2

// --- Milestone 8.5: applied technologies -------------------------------------

// A small monthly Knowledge trickle from the town's school and library (the
// plan names them as Knowledge sources). Without it, a player who never runs
// workshops could stall: milestones pay Knowledge only after research-gated
// goals are met. Workshops add their own knowledgePerMonth on top.
export const KNOWLEDGE_BASE_PER_MONTH = 1

// Volunteer-run projects can be renewed in their last three months (and any
// time after they expire), so the reminder arrives before the effects stop.
export const RENEW_WINDOW_MONTHS = 3

// --- Balance pass: scarcity ----------------------------------------------------

// Every running project costs upkeep each month (the plan's "about 3% of cost
// per month", a little higher so it bites): materials, staff time and repairs.
// Lapsed projects cost nothing. A busy town runs ~2,000/month, so money keeps mattering.
export const UPKEEP_RATE = 0.05
// A bus line's running cost per month (drivers, fuel or charging).
export const BUS_LINE_UPKEEP = 60

// Volunteers who are given nothing to do drift away: the pool holds at most a
// base plus two months of new volunteers. It stops hoarding and makes the
// engagement lever (which raises monthly volunteers) also raise the cap.
export const VOLUNTEER_CAP_BASE = 6
export const VOLUNTEER_CAP_MONTHS = 2
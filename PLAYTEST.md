# Milestone 8 - first playtest

The plan's Milestone 8 exit test is human: give the game to five people without
saying anything, watch, take notes and do not help. At least 3 of 5 must reach
the first milestone ("First steps") and say they would keep playing.

## Session script

1. Send each tester the game at a local URL (`yarn dev`) or a deployed link.
2. Say only: "Here is a game about a small town. Try it out. There is no wrong
   way to play."
3. Do not answer questions about mechanics. Answer only practical ones
   ("how do I zoom?" - "scroll").
4. Sit next to them (or screen-share) and note what happens, without comment.
5. Stop them after 20-25 minutes and ask the questions below.

## Note template (one per tester)

- Tester: initials / date
- Reached the tutorial "Building retrofits" research step? yes / no
- Reached the "First steps" milestone? which day?
- Started the resident-request project without being told? yes / no
- Used the "What next?" button? never / once / often
- First confusion (what and when)
- Where they looked first
- Anything that delighted them
- "Would you keep playing?" yes / no / maybe - quote

## Success criteria

- At least 3 of 5 reach "First steps".
- At least 3 of 5 say they would keep playing.
- No tester needed more than a hint to find the neighborhood panel.

## After the playtest

Collate the notes and act on them:

- Cut or reword tutorial text that confused more than one tester (texts live in
  `src/ui/i18n.ts` under `tutorial.*`).
- If testers never used the "What next?" button, move it somewhere more visible
  (the top bar) next iteration.
- Tune the tutorial pacing by editing the step conditions in
  `src/game/tutorial.ts`.
## Round 2 (Milestone 8.5) - check the feedback fixes

Use the same session script. Watch these in particular:

- Did the tester read the Lexicon welcome page, and press Start playing or Play?
- Could they say what Volunteers are, without help?
- Did they open the Town overview, and did it help them choose what to do?
- Did hovering a district tell them enough to pick one?
- Did research feel worth it (did they build what it unlocked)?
- When a project ran its course, did they notice the bubble, and did they renew it?
- Did they read the date as a year, month and day?
- Did any panel stay open when they expected it to close?
- Did they notice that bus lines only cross the river at the bridges?
- Did they find Continue and the Menu button, and trust that their town was kept?
- Did they look at the goal tracker without being prompted?
- Did the speed buttons read as one control? Did anyone try Space?

## Round 3 (Milestone 9) - the exit test

The plan's Milestone 9 exit test: **a stranger describes the game as
"relaxing" or "cozy" unprompted, and it runs well on an older phone.** Same
session script as round 1; turn the sound on.

- Note the words testers use to describe it, unprompted. "Relaxing", "cozy",
  "cute" or "calm" count.
- Did they notice their projects appearing on the map (panels on roofs, the
  garden, the turbine)? Did they say anything about it?
- Did the sounds feel pleasant, or did anyone mute them? Which ones grated?
- Did anyone open Settings? What did they change?
- Phone check: play ten minutes on the oldest phone available. Does panning
  stay smooth? Is the text readable? Can every button be tapped comfortably?
- Open the game with `?debug` on that phone and note the fps while time runs.

## After the balance pass

- Does money pressure feel fair, not stressful? Did anyone hit 0 and feel stuck?
- Did testers notice upkeep (the per-month figure, the red chip) before it surprised them?
- Did anyone hit the volunteer cap? Did "keep them busy" make sense?
- Did testers find workshops when research felt slow (the What next? hint)?

## Round 4 - music, undo, construction, history and seasons

- Does the music feel calm over a long session? Did anyone turn it down or off,
  and was the Music slider easy to find?
- Is any sound still annoying after twenty minutes? Which one?
- Did testers discover undo (the toast, or Z)? Did they use it to fix a misclick?
- Do build times feel like anticipation or like waiting? Was the scaffolding
  clear ("being built, ready on ...")?
- Did anyone open the history chart? Could they say how their town changed?
- Did anyone notice the seasons? Did the snowy start (a new game opens in
  January) read as cosy or as gloomy?
- Did the 60-day meeting cooldown ever feel like a wall?
- Did testers notice engagement fading? Did looking after it feel like a
  gentle chore or like busywork?
- Did anyone use Renew all? Did "Renew 12 of 17" make sense?
- Did anyone find the need highlight (hover a town-wide need in the Town overview)?

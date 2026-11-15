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

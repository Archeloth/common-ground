# src/ui — React components and rendering

Everything the player sees and touches.

Rules for this folder:

- **Function components and hooks only** (your explicit decision).
- **The UI only dispatches commands.** It never edits game state directly, and each
  component reads the smallest slice of state it needs (separate from the
  high-frequency renderer in Milestone 1+).
- **Every visible string goes through one `t("key")` function** from day one, so
  contributors can translate the game later.

Current layout: `TownMap.tsx` (the interactive canvas — render loop, camera in a
ref, pointer input), and `render/` with the flat colour palette (`colors.ts`),
the pure camera maths (`camera.ts`), and the Canvas drawing helpers
(`draw.ts`). The 2.5D blob renderer lives here, kept fully separate from the
simulation in `../game`.

# D3.a: Core mechanics

## Steps

### Planning / cleanup

- [x] Create PLAN.md in repo root and commit it.

- [x] Copy src/main.ts → src/reference.ts for later reference.

- [x] Clear src/main.ts and rebuild from scratch (importing only what is needed).

### Map setup

- [x] Import Leaflet and base CSS into main.ts / style.css.

- [x] Initialize Leaflet map centered on fixed classroom coordinates.

### Player + bounds

- [x] Define a constant for player position (classroom lat/lng).

- [x] Ensure visible map bounds show cells beyond the interactable radius

### Grid + cells

- [x] Decide cell size (e.g. 0.0001 degrees lat/lng).

- [x] Implement function to convert arbitrary lat/lng to cell coordinates (row/col).

- [x] Implement function to convert cell coordinates back to lat/lng bounds.

- [x] Use loops to generate a grid of cells covering the visible map region.

### Token spawning

- [x] Import or implement the provided luck-based hashing function.

- [x] For each cell, compute a deterministic seed from its coordinates.

### Interaction constraints

- [x] Implement helper to compute distance (in cells) between player cell and target cell.

- [x] Only allow clicking/interacting with cells within ~3 cells of player.

- [x] Provide visual feedback for interactable vs non-interactable cells

### Inventory (single token)

- [x] Add a simple on-screen HUD showing whether the player is holding a token and its value.

- [x] When clicking an interactable cell with a token and empty hand:

      - Pick up that token (store value in inventory).

      - Update HUD.

      - Update cell to “empty.”

      - Prevent picking up a second token if already holding one.

### Crafting

- [x] When clicking an interactable cell that contains a token with the same value as held token:

      - Remove token from cell.

      - Replace with a token of double value.

      - Clear or update player inventory.

      - Refresh HUD and cell display after crafting.

### Win condition / feedback

- [x] Choose target token value.

- [x] Detect when any cell reaches target value.

- [x] Display clear “success” message on screen.

# D3.b: Globe-spanning Gameplay

## Steps

### Map + scrolling

- [] Add zooming and moving the camera.

- [] Add a player marker independent of map center.

  - [] Render marker; update only on player movement (not on map pan).

- [] Allow mapscrolling without moving the player (pan to scout).

- [] Fill viewport with cells.

- [] Change global coords to (0,0).

### UI controls

- [] Add fixed UI buttons: `North`, `South`, `East`, `West`

### Crafting + win condition

- [] Add HUD line and progress feedback.

- [] Show clear “Victory” when any crafted token meets/exceeds target.

### Rendering polish

- [] Draw token glyph/value in cell.

- [] Highlight player cell and interaction ring.

## Acceptance criteria

- [] Implementing farming (enable memoryless behavior).

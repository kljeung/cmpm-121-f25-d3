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

- [~] Ensure visible map bounds show cells beyond the interactable radius

### Grid + cells

- [x] Decide cell size (e.g. 0.0001 degrees lat/lng).

- [x] Implement function to convert arbitrary lat/lng to cell coordinates (row/col).

- [x] Implement function to convert cell coordinates back to lat/lng bounds.

- [] Use loops to generate a grid of cells covering the visible map region.

### Token spawning

- [x] Import or implement the provided luck-based hashing function.

- [] For each cell, compute a deterministic seed from its coordinates.

### Interaction constraints

- [] Implement helper to compute distance (in cells) between player cell and target cell.

- [] Only allow clicking/interacting with cells within ~3 cells of player.

- [] Provide visual feedback for interactable vs non-interactable cells

### Inventory (single token)

- [] Add a simple on-screen HUD showing whether the player is holding a token and its value.

- [] When clicking an interactable cell with a token and empty hand:

      - Pick up that token (store value in inventory).

      - Update HUD.

      - Update cell to “empty.”

      - Prevent picking up a second token if already holding one.

### Crafting

- [] When clicking an interactable cell that contains a token with the same value as held token:

      - Remove token from cell.

      - Replace with a token of double value.

      - Clear or update player inventory

      - Refresh HUD and cell display after crafting.

### Win condition / feedback

- [x] Choose target token value

- [] Detect when any cell reaches target value

- [] Display clear “success” message on screen

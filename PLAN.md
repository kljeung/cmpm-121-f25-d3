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

- [x] Add zooming and moving the camera.

- [x] Add a player marker independent of map center.

  - [x] Render marker; update only on player movement (not on map pan).

- [x] Allow mapscrolling without moving the player (pan to scout).

- [x] Fill viewport with cells.

- [x] Change global coords to (0,0).

### UI controls

- [x] Add fixed UI buttons: `North`, `South`, `East`, `West`

### Crafting + win condition

- [x] Add HUD line and progress feedback.

- [x] Show clear “Victory” when any crafted token meets/exceeds target.

### Rendering polish

- [x] Draw token glyph/value in cell.

- [x] Highlight player cell and interaction ring.

## Acceptance criteria

- [x] Implementing farming (enable memoryless behavior).

# D3.c: Object Persistence

## Steps

### Flyweight cells

- [x] Remove / avoid any data structure that stores every cell in memory at once.

- [x] Introduce a `Map<string, CellState>` that only stores modified cells.

- [x] Update cell rendering so visible cells are rebuilt each frame:

  - [x] Convert viewport lat/lng → cell coords.

  - [x] For each visible cell:

    - [x] Compute deterministic default token using luck hash from `(i, j)`.

    - [x] If `Map` has an entry for this cell, use that stored `CellState` instead.

### Memento pattern for modified cells

- [x] Define `createCellMemento(cellState: CellState)`

- [x] Wrap all gameplay changes in helpers:

  - [x] `updateCellState(coord, updaterFn)` that:

    - [x] Looks up or constructs the current `CellState`.

    - [x] Applies the change.

    - [x] Stores the new state back into the `Map`.

### Integrated with existing code

- [x] Replace any code that directly mutates cell objects with `updateCellState`.

- [x] When a cell is emptied (token picked up), ensure its `CellState` in the `Map` reflects this change.

- [x] When crafting doubles a token:

  - [x] Read existing `CellState`, double its value, and write back via `updateCellState`.

- [x] Ensure HUD and cell visuals always read from `CellState`, not from stale view objects.

### Rendering / redraw loop

- [x] Refactor drawing so that panning/zooming always:

  - [x] Clears all existing cell layers from the map.

  - [x] Recomputes visible cell coords.

  - [x] Rebuilds cell rectangles and tokens.

- [x] Confirm no attempt is made to keep old Leaflet layers when they scroll off-screen.

# D3.d: Gameplay Across Real-world Space and Time

## Steps

### Movement

- [] Player movement can be controlled via buttons or device geolocation, selected by query string or runtime toggle.

- [] All game logic that reacts to player movement uses the `MovementController` interface

  - [] Call a shared `setPlayerPosition` / `movePlayerByCells` helper instead of using player state directly.

  - [] On position update, compute movement relative to initial fix and call shared movement helpers.

- [] Ensure core game code only responds to movement callbacks.

### Geolocation behavior

- [] Map real world motion to grid cells.

### Movement mode switching

- [] Create UI that allows user to switch modes at the beginning of the game.

- [] When mode changes, update HUD text so player knows which control scheme is active.

- [] Persist the currently selected movement mode in storage so it’s restored on reload.

- [] If geolocation is unavailable or denied, the game clearly indicates this and remains playable.

### Game state persistence

- [] Implement game states:

  - [] Player position (lat/lng or cell coordinates).

  - [] Player inventory.

  - [] Modified cells.

  - [] Current movement mode (buttons / geolocation).

  - [] Any other necessary flags or progress.

- [] Implement saving game state:

  - [] Call after important events automatically: player move, token pickup, crafting, mode switch, new game.

- [] Make sure save/load only persists logical game state, not Leaflet layer objects.

### New game flow

- [] Add a “New Game” button to the control panel.

- [] When clicked:

  - [] Show confirmation dialog.

  - [] Clear the storage key for game state.

  - [] Clears previous progress and starts from a clean state.

  - [] Reset movement controller.

  - [] Re-render HUD, player marker, and visible grid.

- [] After starting a new game, call `saveGameState()` immediately to establish the new baseline.

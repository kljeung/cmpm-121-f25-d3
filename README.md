# CMPM 121 D3 Project

This project is a Leaflet-based grid game where you move around the world, collect tokens, and craft them into higher-value tokens. Movement can be controlled by on-screen buttons or device geolocation, and progress is saved with `localStorage`.

## Overview

- World is a grid of cells anchored at `(0, 0)` (Null Island).
- Each cell deterministically has a token or is empty (via `_luck`).
- You can only interact with cells within a fixed radius.
- Matching tokens can be combined into a higher-value token.
- Game state (player, inventory, modified cells, movement mode) persists across reloads.
- Win by creating a token with value `2048` (in hand or on any cell).

## How to Play

- Pan/zoom to move the map.
- Use the **Movement** panel:
  - `N`, `S`, `E`, `W` buttons move the player one cell at a time.
  - `Center on Player` recenters the camera.
- Hover cells to see token values; click nearby highlighted cells to:
  - Pick up a token if your hands are empty.
  - Craft a new token if the cell’s token matches the one you’re holding.
- When a token reaches `2048`, a win message appears in the control panel.

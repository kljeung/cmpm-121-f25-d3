import leaflet from "leaflet";
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function
import _luck from "./_luck.ts";

// ui
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// const definitions
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const INTERACT_RADIUS = 3;
const GRID_MARGIN = 5;
const TOKEN_SPAWN_PROBABILITY = 0.5;
const TARGET_TOKEN_VALUE = 32;

// map and tiles
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// player bounds
const PLAYER_LATLNG = CLASSROOM_LATLNG;
const playerMarker = leaflet.marker(PLAYER_LATLNG);
playerMarker.bindTooltip("YOU ARE HERE");
playerMarker.addTo(map);

// lat/lng to cell coords
function latLngToCell(latlng: leaflet.LatLng) {
  const i = Math.floor((latlng.lat - CLASSROOM_LATLNG.lat) / TILE_DEGREES);
  const j = Math.floor((latlng.lng - CLASSROOM_LATLNG.lng) / TILE_DEGREES);
  return { i, j };
}

function _cellToBounds(i: number, j: number): leaflet.LatLngBounds {
  const south = CLASSROOM_LATLNG.lat + i * TILE_DEGREES;
  const west = CLASSROOM_LATLNG.lng + j * TILE_DEGREES;
  const north = south + TILE_DEGREES;
  const east = west + TILE_DEGREES;
  return leaflet.latLngBounds([[south, west], [north, east]]);
}

// grid and cells
type cellKey = string;

interface cellData {
  i: number;
  j: number;
  rect: leaflet.Rectangle;
  tokenValue: number | null;
}

const cells = new Map<cellKey, cellData>();

function cellKey(i: number, j: number): cellKey {
  return `${i}, ${j}`;
}

// deterministic token value
function _generateTokenValue(i: number, j: number): number | null {
  const spawnRoll = _luck(`${i},${j},spawn`);
  if (spawnRoll >= TOKEN_SPAWN_PROBABILITY) {
    return null;
  }

  const valueRoll = _luck(`${i},${j},value`);
  const options = [1, 2, 4];
  const index = Math.floor(valueRoll * options.length) % options.length;
  return options[index];
}

// create a cell handler
function createCell(i: number, j: number) {
  const bounds = _cellToBounds(i, j);
  const tokenValue = _generateTokenValue(i, j);

  const rect = leaflet.rectangle(bounds, {
    weight: 1,
    color: "#444",
    fillOpacity: 0.2,
  }).addTo(map);

  const data: cellData = { i, j, rect, tokenValue };
  const key = cellKey(i, j);
  cells.set(key, data);

  _styleCell(data);

  rect.on("click", () => {
    handleCellClick(data);
  });
}

//fill grid
function computeGrid() {
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const minCell = latLngToCell(sw);
  const maxCell = latLngToCell(ne);

  for (let i = minCell.i - GRID_MARGIN; i <= maxCell.i + GRID_MARGIN; i++) {
    for (let j = minCell.j - GRID_MARGIN; j <= maxCell.j + GRID_MARGIN; j++) {
      const key = cellKey(i, j);
      if (!cells.has(key)) {
        createCell(i, j);
      }
    }
  }
}

// interaction constraints
function _cellDistanceFromPlayer(cell: cellData): number {
  const playerCell = latLngToCell(PLAYER_LATLNG);
  const di = Math.abs(cell.i - playerCell.i);
  const dj = Math.abs(cell.j - playerCell.j);
  return Math.max(di, dj);
}

function _isInteractable(cell: cellData): boolean {
  return _cellDistanceFromPlayer(cell) <= INTERACT_RADIUS;
}

// visual feedback for interactables and show token values
function _styleCell(cell: cellData) {
  const interactable = _isInteractable(cell);
  const hasToken = cell.tokenValue !== null;
  let fillColor = "#00000000";
  if (hasToken && interactable) {
    fillColor = "#b8860bcc";
  } else if (hasToken && !interactable) {
    fillColor = "#3355bb55";
  } else if (!hasToken && interactable) {
    fillColor = "#11662266";
  }

  cell.rect.setStyle({
    fill: true,
    fillColor,
    color: interactable ? "#ffffffaa" : "#44444466",
    weight: interactable ? 1.5 : 1,
  });

  if (hasToken) {
    const labelPrefix = interactable ? "Token" : "Token (out of reach)";
    cell.rect.bindTooltip(
      `${labelPrefix}: [${cell.tokenValue}]`,
      { sticky: true },
    );
  } else {
    cell.rect.unbindTooltip();
  }
}

// inventory
let heldToken: number | null = null;

function _updateHUD(message?: string) {
  const base = heldToken === null
    ? "Hands: (empty)"
    : `Hands: holding token [${heldToken}]`;
  statusPanelDiv.textContent = message ? `${base} | ${message}` : base;
}
_updateHUD(
  "Hover cells to see values. Click nearby highlighted cells to interact.",
);

// crafting and interaction
function handleCellClick(cell: cellData) {
  if (!_isInteractable(cell)) {
    _updateHUD("Your arms cannot reach that far. Move closer, would you?");
    return;
  }

  const hasToken = cell.tokenValue !== null;
  if (hasToken && heldToken === null) {
    heldToken = cell.tokenValue;
    cell.tokenValue = null;
    _styleCell(cell);
    _updateHUD(`Picked up token [${heldToken}].`);
    return;
  }
  if (hasToken && heldToken !== null && cell.tokenValue === heldToken) {
    const newValue = heldToken * 2;
    heldToken = null;
    cell.tokenValue = newValue;
    _styleCell(cell);
    _updateHUD(`Crafted new token [${newValue}].`);
    _checkWinCondition();
    return;
  }

  if (hasToken && heldToken !== null && cell.tokenValue !== heldToken) {
    _updateHUD(
      `Cannot craft that, buddy. Cell has [${cell.tokenValue}] but you're holding [${heldToken}]. Do you happen to have a third hand?`,
    );
    return;
  }

  if (!hasToken && heldToken !== null) {
    _updateHUD(
      "Why are you trying to pick up nothing? You're already holding a token.",
    );
    return;
  }

  _updateHUD("Nothing to do here.");
}

// win condition/feedback
function _checkWinCondition() {
  if (heldToken !== null && heldToken >= TARGET_TOKEN_VALUE) {
    controlPanelDiv.innerHTML =
      `<div id="win"><h2>Success!</h2><p>You’re holding a legendary token [${heldToken}]!</p></div>`;
    return;
  }

  for (const cell of cells.values()) {
    if (cell.tokenValue !== null && cell.tokenValue >= TARGET_TOKEN_VALUE) {
      controlPanelDiv.innerHTML =
        `<div id="win"><h2>Success!</h2><p>Crafted token [${cell.tokenValue}]!</p></div>`;
      return;
    }
  }
}
computeGrid();
map.on("moveend", computeGrid);

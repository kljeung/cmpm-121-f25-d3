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

const GRID_ANCHOR = leaflet.latLng(0, 0);

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
const TARGET_TOKEN_VALUE = 8;

// map and tiles
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: 17,
  maxZoom: 21,
  zoomControl: true,
  scrollWheelZoom: true,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 21,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// player bounds
let PLAYER_LATLNG = CLASSROOM_LATLNG;
const playerMarker = leaflet.marker(PLAYER_LATLNG);
playerMarker.bindTooltip("YOU ARE HERE", { permanent: true, direction: "top" });
playerMarker.addTo(map);

let interactRing: leaflet.Rectangle | null = null;

function _updateInteractRing() {
  const pCell = latLngToCell(PLAYER_LATLNG);
  const south = GRID_ANCHOR.lat + (pCell.i - INTERACT_RADIUS) * TILE_DEGREES;
  const west = GRID_ANCHOR.lng + (pCell.j - INTERACT_RADIUS) * TILE_DEGREES;
  const north = GRID_ANCHOR.lat +
    (pCell.i + INTERACT_RADIUS + 1) * TILE_DEGREES;
  const east = GRID_ANCHOR.lng + (pCell.j + INTERACT_RADIUS + 1) * TILE_DEGREES;
  const bounds = leaflet.latLngBounds([[south, west], [north, east]]);
  if (!interactRing) {
    interactRing = leaflet.rectangle(bounds, {
      color: "#ffff00aa",
      weight: 1.5,
      fill: false,
    }).addTo(map);
  } else {
    interactRing.setBounds(bounds);
  }
}

// ui buttons for movement + actual implementation
controlPanelDiv.innerHTML = `
  <div class="controls">
    <button id="btnN">North</button>
    <button id="btnS">South</button>
    <button id="btnW">West</button>
    <button id="btnE">East</button>
    <button id="btnCenter">Center on Player</button>
  </div>
`;

function movePlayer(di: number, dj: number) {
  const pCell = latLngToCell(PLAYER_LATLNG);
  const ni = pCell.i + di;
  const nj = pCell.j + dj;
  const center = cellCenterLatLng(ni, nj);
  PLAYER_LATLNG = center;
  playerMarker.setLatLng(PLAYER_LATLNG);
  _updateInteractRing();

  for (const c of cells.values()) _styleCell(c);

  _updateHUD("Moved.");
  _checkWinCondition();
}
(document.getElementById("btnN") as HTMLButtonElement).onclick = () =>
  movePlayer(1, 0);
(document.getElementById("btnS") as HTMLButtonElement).onclick = () =>
  movePlayer(-1, 0);
(document.getElementById("btnW") as HTMLButtonElement).onclick = () =>
  movePlayer(0, -1);
(document.getElementById("btnE") as HTMLButtonElement).onclick = () =>
  movePlayer(0, 1);
(document.getElementById("btnCenter") as HTMLButtonElement).onclick = () =>
  map.panTo(PLAYER_LATLNG);

// lat/lng to cell coords
function latLngToCell(latlng: leaflet.LatLng) {
  const i = Math.floor((latlng.lat - GRID_ANCHOR.lat) / TILE_DEGREES);
  const j = Math.floor((latlng.lng - GRID_ANCHOR.lng) / TILE_DEGREES);
  return { i, j };
}

function cellTopLeft(i: number, j: number): leaflet.LatLng {
  return leaflet.latLng(
    GRID_ANCHOR.lat + i * TILE_DEGREES,
    GRID_ANCHOR.lng + j * TILE_DEGREES,
  );
}

function _cellToBounds(i: number, j: number): leaflet.LatLngBounds {
  const tl = cellTopLeft(i, j);
  const br = leaflet.latLng(
    tl.lat + TILE_DEGREES,
    tl.lng + TILE_DEGREES,
  );
  return leaflet.latLngBounds([tl, br]);
}

function cellCenterLatLng(i: number, j: number): leaflet.LatLng {
  const b = _cellToBounds(i, j);
  return b.getCenter();
}

type cellKey = string;

interface cellData {
  i: number;
  j: number;
  rect: leaflet.Rectangle;
}

interface CellState {
  tokenValue: number | null;
}

type CellMemento = Readonly<CellState>;

const cells = new Map<cellKey, cellData>();
const cellStates = new Map<cellKey, CellMemento>();

function makeCellKey(i: number, j: number): cellKey {
  return `${i},${j}`;
}

// deterministic token value
function _generateTokenValue(i: number, j: number): number | null {
  const spawnRoll = _luck(`${i},${j},spawn`);
  if (spawnRoll >= TOKEN_SPAWN_PROBABILITY) return null;

  const valueRoll = _luck(`${i},${j},value`);
  const options = [1, 2, 4];
  const index = Math.floor(valueRoll * options.length) % options.length;
  return options[index];
}

// memento helpers
function createCellMemento(state: CellState): CellMemento {
  return { tokenValue: state.tokenValue };
}

function restoreCellFromMemento(memento: CellMemento): CellState {
  return { tokenValue: memento.tokenValue };
}

// reates a base state for untouched cells
function _baseCellState(i: number, j: number): CellState {
  return { tokenValue: _generateTokenValue(i, j) };
}

// eads token value for any cell
function getCellTokenValue(cell: cellData): number | null {
  const key = makeCellKey(cell.i, cell.j);
  const stored = cellStates.get(key);
  if (stored) return stored.tokenValue;
  const base = _baseCellState(cell.i, cell.j);
  return base.tokenValue;
}

function updateCellState(
  cell: cellData,
  updaterFn: (state: CellState) => void,
) {
  const key = makeCellKey(cell.i, cell.j);
  const existing = cellStates.get(key);
  const working = existing
    ? restoreCellFromMemento(existing)
    : _baseCellState(cell.i, cell.j);

  updaterFn(working);

  const memento = createCellMemento(working);
  cellStates.set(key, memento);
}

// no token value gets stored
function createCell(i: number, j: number) {
  const bounds = _cellToBounds(i, j);

  const rect = leaflet.rectangle(bounds, {
    weight: 1,
    color: "#444",
    fillOpacity: 0.2,
  }).addTo(map);

  const data: cellData = { i, j, rect };
  const key = makeCellKey(i, j);
  cells.set(key, data);

  _styleCell(data);

  rect.on("click", () => handleCellClick(data));
}

// now clears and rebuilds all cells in view
function computeGrid() {
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const minCell = latLngToCell(sw);
  const maxCell = latLngToCell(ne);

  for (const cell of cells.values()) {
    cell.rect.remove();
  }
  cells.clear();
  for (let i = minCell.i - GRID_MARGIN; i <= maxCell.i + GRID_MARGIN; i++) {
    for (let j = minCell.j - GRID_MARGIN; j <= maxCell.j + GRID_MARGIN; j++) {
      createCell(i, j);
    }
  }

  _updateInteractRing();
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
  const tokenValue = getCellTokenValue(cell);
  const hasToken = tokenValue !== null;
  const p = latLngToCell(PLAYER_LATLNG);
  const isPlayerCell = cell.i === p.i && cell.j === p.j;

  let fillColor = "#00000000";
  if (hasToken && interactable) fillColor = "#b8860bcc";
  else if (hasToken && !interactable) fillColor = "#3355bb55";
  else if (!hasToken && interactable) fillColor = "#11662266";

  cell.rect.setStyle({
    fill: true,
    fillColor,
    color: isPlayerCell
      ? "#ffea00"
      : (interactable ? "#ffffffaa" : "#44444466"),
    weight: isPlayerCell ? 2.5 : (interactable ? 1.5 : 1),
    dashArray: isPlayerCell ? "4 2" : undefined,
  });
  cell.rect.unbindTooltip();
  if (hasToken) {
    const labelPrefix = interactable ? "" : "out ";
    cell.rect.bindTooltip(`${labelPrefix}[${tokenValue}]`, {
      permanent: false,
      sticky: true,
      direction: "auto",
      className: "cellHover",
      opacity: 1,
    });
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

// interaction updates model
function handleCellClick(cell: cellData) {
  if (!_isInteractable(cell)) {
    _updateHUD("Your arms cannot reach that far. Move closer, would you?");
    return;
  }

  const tokenValue = getCellTokenValue(cell);
  const hasToken = tokenValue !== null;

  if (hasToken && heldToken === null) {
    heldToken = tokenValue;
    updateCellState(cell, (state) => {
      state.tokenValue = null;
    });
    _styleCell(cell);
    _updateHUD(`Picked up token [${heldToken}].`);
    return;
  }

  if (hasToken && heldToken !== null && tokenValue === heldToken) {
    const newValue = heldToken * 2;
    heldToken = null;
    updateCellState(cell, (state) => {
      state.tokenValue = newValue;
    });
    _styleCell(cell);
    _updateHUD(`Crafted new token [${newValue}].`);
    _checkWinCondition();
    return;
  }

  if (hasToken && heldToken !== null && tokenValue !== heldToken) {
    _updateHUD(
      `Cannot craft that, buddy. Cell has [${tokenValue}] but you're holding [${heldToken}]. Do you happen to have a third hand?`,
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

// win condition
function _checkWinCondition() {
  if (heldToken !== null && heldToken >= TARGET_TOKEN_VALUE) {
    controlPanelDiv.innerHTML =
      `<div id="win"><h2>Congrats!</h2><p>You're rich with a shiny new token worth: [${heldToken}]!</p></div>`;
    return;
  }

  // check visible cells from model
  for (const cell of cells.values()) {
    const tokenValue = getCellTokenValue(cell);
    if (tokenValue !== null && tokenValue >= TARGET_TOKEN_VALUE) {
      controlPanelDiv.innerHTML =
        `<div id="win"><h2>Congrats!</h2><p>You're rich with a shiny new token worth: [${tokenValue}]!</p></div>`;
      return;
    }
  }

  // check modified cell states off screen
  for (const memento of cellStates.values()) {
    if (
      memento.tokenValue !== null && memento.tokenValue >= TARGET_TOKEN_VALUE
    ) {
      controlPanelDiv.innerHTML =
        `<div id="win"><h2>Congrats!</h2><p>You're rich with a shiny new token worth: [${memento.tokenValue}]!</p></div>`;
      return;
    }
  }
}

map.on("moveend", computeGrid);
computeGrid();
_updateInteractRing();

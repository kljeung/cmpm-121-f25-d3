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

// updated UI
controlPanelDiv.innerHTML = `
  <div id="controlPanelInner">
    <div class="cp-section">
      <div class="cp-header">
        <h2 class="cp-title">Movement</h2>
      </div>
      <div class="cp-button-grid">
        <button id="btnN" class="cp-btn cp-btn-main">N</button>
        <button id="btnW" class="cp-btn cp-btn-main">W</button>
        <button id="btnE" class="cp-btn cp-btn-main">E</button>
        <button id="btnS" class="cp-btn cp-btn-main">S</button>
      </div>
      <button id="btnCenter" class="cp-btn cp-btn-secondary">
        Center on Player
      </button>
    </div>

    <div class="cp-section">
      <div class="cp-header">
        <h2 class="cp-title">Game</h2>
      </div>
      <div class="cp-row">
        <label for="movementModeSelect" class="cp-label">Movement mode</label>
        <select id="movementModeSelect" class="cp-select">
          <option value="buttons">Buttons</option>
          <option value="geolocation">Geolocation</option>
        </select>
      </div>
      <button id="btnNewGame" class="cp-btn cp-btn-danger">
        New Game
      </button>
    </div>

    <div id="winPanel" class="cp-section cp-win"></div>
  </div>
`;

// const definitions
const GRID_ANCHOR = leaflet.latLng(0, 0);

const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const INTERACT_RADIUS = 3;
const GRID_MARGIN = 5;
const TOKEN_SPAWN_PROBABILITY = 0.5;
const TARGET_TOKEN_VALUE = 2048;

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

// creates a base state for untouched cells
function _baseCellState(i: number, j: number): CellState {
  return { tokenValue: _generateTokenValue(i, j) };
}

// reads token value for any cell
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

// inventory
let heldToken: number | null = null;

function _updateHUD(message?: string) {
  const base = heldToken === null
    ? "Hands: (empty)"
    : `Hands: holding token [${heldToken}]`;
  statusPanelDiv.textContent = message ? `${base} | ${message}` : base;
}

type MovementMode = "buttons" | "geolocation";

interface MovementController {
  readonly mode: MovementMode;
  start(): void;
  stop(): void;
}

interface SerializedCellState {
  key: cellKey;
  tokenValue: number | null;
}

interface GameState {
  playerLat: number;
  playerLng: number;
  heldToken: number | null;
  cellStates: SerializedCellState[];
  movementMode: MovementMode;
}

const STORAGE_KEY = "globeGameState_v1";

function getMovementModeFromQueryString(): MovementMode | null {
  const params = new URLSearchParams(globalThis.location.search);
  const mode = params.get("movement");
  if (mode === "buttons" || mode === "geolocation") return mode;
  return null;
}

const requestedModeFromQuery = getMovementModeFromQueryString();

let currentMovementMode: MovementMode = requestedModeFromQuery ?? "buttons";

let currentMovementController: MovementController | null = null;
let buttonController: MovementController | null = null;
let geoController: MovementController | null = null;

function setPlayerLatLng(newLatLng: leaflet.LatLng, centerMap = false) {
  PLAYER_LATLNG = newLatLng;
  playerMarker.setLatLng(PLAYER_LATLNG);
  _updateInteractRing();

  for (const c of cells.values()) _styleCell(c);

  if (centerMap) {
    map.panTo(PLAYER_LATLNG);
  }

  _checkWinCondition();
  saveGameState();
}

function movePlayerByCells(di: number, dj: number) {
  const pCell = latLngToCell(PLAYER_LATLNG);
  const ni = pCell.i + di;
  const nj = pCell.j + dj;
  const center = cellCenterLatLng(ni, nj);
  setPlayerLatLng(center);
  _updateHUD("Moved.");
}

class ButtonMovementController implements MovementController {
  readonly mode: MovementMode = "buttons";

  start() {
    const btnN = document.getElementById("btnN") as HTMLButtonElement | null;
    const btnS = document.getElementById("btnS") as HTMLButtonElement | null;
    const btnW = document.getElementById("btnW") as HTMLButtonElement | null;
    const btnE = document.getElementById("btnE") as HTMLButtonElement | null;
    if (!btnN || !btnS || !btnW || !btnE) return;

    btnN.onclick = () => movePlayerByCells(1, 0);
    btnS.onclick = () => movePlayerByCells(-1, 0);
    btnW.onclick = () => movePlayerByCells(0, -1);
    btnE.onclick = () => movePlayerByCells(0, 1);
  }

  stop() {
    const btnN = document.getElementById("btnN") as HTMLButtonElement | null;
    const btnS = document.getElementById("btnS") as HTMLButtonElement | null;
    const btnW = document.getElementById("btnW") as HTMLButtonElement | null;
    const btnE = document.getElementById("btnE") as HTMLButtonElement | null;
    if (btnN) btnN.onclick = null;
    if (btnS) btnS.onclick = null;
    if (btnW) btnW.onclick = null;
    if (btnE) btnE.onclick = null;
  }
}

class GeoMovementController implements MovementController {
  readonly mode: MovementMode = "geolocation";
  private watchId: number | null = null;

  start() {
    if (!("geolocation" in navigator)) {
      _updateHUD(
        "Geolocation not supported in this browser. Staying on buttons.",
      );
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newLatLng = leaflet.latLng(latitude, longitude);
        setPlayerLatLng(newLatLng, true);
        _updateHUD(
          "Geolocation updated. Go walk if you wish to accomplish anything",
        );
      },
      (err) => {
        _updateHUD(
          `Geolocation error: ${err.message} (game still playable with buttons).`,
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      },
    );
  }

  stop() {
    if (this.watchId !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

function saveGameState() {
  try {
    const serializedCells: SerializedCellState[] = [];
    for (const [key, memento] of cellStates.entries()) {
      serializedCells.push({ key, tokenValue: memento.tokenValue });
    }

    const state: GameState = {
      playerLat: PLAYER_LATLNG.lat,
      playerLng: PLAYER_LATLNG.lng,
      heldToken,
      cellStates: serializedCells,
      movementMode: currentMovementMode,
    };

    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save game state", err);
  }
}

function loadGameState() {
  let restored = false;
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      PLAYER_LATLNG = leaflet.latLng(parsed.playerLat, parsed.playerLng);
      playerMarker.setLatLng(PLAYER_LATLNG);
      heldToken = parsed.heldToken;

      cellStates.clear();
      for (const entry of parsed.cellStates ?? []) {
        const memento: CellMemento = createCellMemento({
          tokenValue: entry.tokenValue,
        });
        cellStates.set(entry.key, memento);
      }

      if (
        !requestedModeFromQuery &&
        (parsed.movementMode === "buttons" ||
          parsed.movementMode === "geolocation")
      ) {
        currentMovementMode = parsed.movementMode;
      }

      restored = true;
    }
  } catch (err) {
    console.error("Failed to load game state", err);
  }

  computeGrid();
  _updateInteractRing();

  if (restored) {
    _updateHUD("Game state loaded. Continue where you left off.");
  } else {
    _updateHUD(
      "Hover cells to see values. Click nearby highlighted cells to interact.",
    );
  }

  _checkWinCondition();
}

function applyMovementMode(mode: MovementMode) {
  if (currentMovementController && currentMovementController.mode === mode) {
    return;
  }

  if (currentMovementController) {
    currentMovementController.stop();
  }

  currentMovementMode = mode;

  if (mode === "buttons") {
    if (!buttonController) buttonController = new ButtonMovementController();
    currentMovementController = buttonController;
  } else {
    if (!geoController) geoController = new GeoMovementController();
    currentMovementController = geoController;
  }

  currentMovementController.start();
  saveGameState();
}

function startNewGame() {
  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear saved game state", err);
  }

  PLAYER_LATLNG = CLASSROOM_LATLNG;
  playerMarker.setLatLng(PLAYER_LATLNG);

  heldToken = null;
  cellStates.clear();

  computeGrid();
  _updateInteractRing();
  _updateHUD("New game started.");

  if (currentMovementController) {
    currentMovementController.stop();
  }
  applyMovementMode(currentMovementMode);
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
    saveGameState();
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
    saveGameState();
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

const winPanelDiv = document.getElementById("winPanel") as
  | HTMLDivElement
  | null;

function _showWin(value: number) {
  if (!winPanelDiv) return;
  winPanelDiv.innerHTML = `
    <div class="cp-win-inner">
      <h2 class="cp-win-title">Congrats!</h2>
      <p class="cp-win-text">
        You're rich with a shiny new token worth: [${value}]!
      </p>
    </div>
  `;
}

// win condition
function _checkWinCondition() {
  if (heldToken !== null && heldToken >= TARGET_TOKEN_VALUE) {
    _showWin(heldToken);
    return;
  }

  for (const cell of cells.values()) {
    const tokenValue = getCellTokenValue(cell);
    if (tokenValue !== null && tokenValue >= TARGET_TOKEN_VALUE) {
      _showWin(tokenValue);
      return;
    }
  }

  for (const memento of cellStates.values()) {
    if (
      memento.tokenValue !== null && memento.tokenValue >= TARGET_TOKEN_VALUE
    ) {
      _showWin(memento.tokenValue);
      return;
    }
  }
}

// shared UI controls
const centerBtn = document.getElementById("btnCenter") as
  | HTMLButtonElement
  | null;
if (centerBtn) {
  centerBtn.onclick = () => map.panTo(PLAYER_LATLNG);
}

const movementSelect = document.getElementById("movementModeSelect") as
  | HTMLSelectElement
  | null;
if (movementSelect) {
  movementSelect.onchange = () => {
    const value = movementSelect.value === "geolocation"
      ? "geolocation"
      : "buttons";
    applyMovementMode(value);
    _updateHUD(
      value === "geolocation"
        ? "Movement mode: Geolocation (Go walk outside)."
        : "Movement mode: Buttons (Lazy mode).",
    );
  };
}

const btnNewGame = document.getElementById("btnNewGame") as
  | HTMLButtonElement
  | null;
if (btnNewGame) {
  btnNewGame.onclick = () => {
    if (
      globalThis.confirm(
        "Start a new game? This will erase your current progress.",
      )
    ) {
      startNewGame();
    }
  };
}

// map/grid initialization
map.on("moveend", computeGrid);

loadGameState();

const movementSelectInit = document.getElementById("movementModeSelect") as
  | HTMLSelectElement
  | null;
if (movementSelectInit) {
  movementSelectInit.value = currentMovementMode;
}

applyMovementMode(currentMovementMode);

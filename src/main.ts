import leaflet from "leaflet";
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function
import _luck from "./_luck.ts";

//ui
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);
const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);
const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

//const definitions
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const _INTERACT_RADIUS = 3;
const _GRID_MARGIN = 2;
const _TOKEN_SPAWN_PROBABILITY = 0.18;
const _TARGET_TOKEN_VALUE = 32;

//map and tiles
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

//player bounds
const PLAYER_LATLNG = CLASSROOM_LATLNG;
const playerMarker = leaflet.marker(PLAYER_LATLNG);
playerMarker.bindTooltip("YOU ARE HERE");
playerMarker.addTo(map);

//lat/lng to cell coords
function _latLngToCell(latlng: leaflet.LatLng) {
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

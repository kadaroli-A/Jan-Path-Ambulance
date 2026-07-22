export const API_BASE_URL = "http://127.0.0.1:8000";
export const POLLING_INTERVAL = 2000;
export const AMBULANCE_ID = "AMB001";
export const ETA_RED_THRESHOLD = 30;
export const ETA_YELLOW_THRESHOLD = 60;
export const CONGESTION_THRESHOLD = 7;

export const MAP_CONFIG = {
  center: [13.0827, 80.2707],
  zoom: 13,
};

export const AMBULANCE_POSITION = {
  lat: 13.0150,
  lon: 80.2100,
};

export const JUNCTIONS = {
  J1: { id: "J1", name: "Guindy", coords: [13.0067, 80.2206] },
  J2: { id: "J2", name: "Kathipara", coords: [13.0112, 80.2156] },
  J3: { id: "J3", name: "Teynampet", coords: [13.0418, 80.2541] },
};

export const INITIAL_AMBULANCE_DATA = {
  ambulance_id: AMBULANCE_ID,
  emergency_mode: true,
  latitude: AMBULANCE_POSITION.lat,
  longitude: AMBULANCE_POSITION.lon,
  speed_kmph: 45,
  route: ["J2", "J3"],
};

console.log("CONFIG_FILE_LOADED_20000");
console.log("CONFIG POLLING =", POLLING_INTERVAL);

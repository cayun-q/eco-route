const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;
const ORS_DIRECTIONS_URL =
  "https://api.openrouteservice.org/v2/directions/driving-car/geojson";

// Average petrol passenger car, g CO₂ per km (UK DEFRA / EEA-style factor).
const CO2_G_PER_KM = 171;

const statusEl = document.getElementById("status");
const statsEl = document.getElementById("stats");
const distanceEl = document.getElementById("distance");
const durationEl = document.getElementById("duration");
const co2El = document.getElementById("co2");
const errorEl = document.getElementById("error");
const resetBtn = document.getElementById("reset");

const map = L.map("map").setView([51.505, -0.09], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

let startMarker = null;
let endMarker = null;
let routeLayer = null;
let startLatLng = null;
let endLatLng = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function setError(message) {
  if (!message) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    return;
  }
  errorEl.hidden = false;
  errorEl.textContent = message;
}

function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${minutes} min`;
}

function calculateCo2Kg(distanceMeters) {
  const distanceKm = distanceMeters / 1000;
  return (distanceKm * CO2_G_PER_KM) / 1000;
}

function formatCo2(kg) {
  if (kg < 0.1) {
    return `${Math.round(kg * 1000)} g`;
  }
  return `${kg.toFixed(2)} kg`;
}

function clearRouteDrawing() {
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
}

function resetRoute() {
  clearRouteDrawing();
  if (startMarker) {
    map.removeLayer(startMarker);
    startMarker = null;
  }
  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }
  startLatLng = null;
  endLatLng = null;
  statsEl.hidden = true;
  resetBtn.hidden = true;
  setError("");
  setStatus("Click the map to set a start point.");
}

async function fetchRoute(start, end) {
  if (!ORS_API_KEY) {
    throw new Error(
      "Missing VITE_ORS_API_KEY. Copy .env.example to .env and add your OpenRouteService key.",
    );
  }

  const response = await fetch(ORS_DIRECTIONS_URL, {
    method: "POST",
    headers: {
      Authorization: ORS_API_KEY,
      "Content-Type": "application/json",
      Accept:
        "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
    },
    body: JSON.stringify({
      coordinates: [
        [start.lng, start.lat],
        [end.lng, end.lat],
      ],
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      payload?.error?.message ||
      payload?.message ||
      `OpenRouteService request failed (${response.status})`;
    throw new Error(detail);
  }

  const feature = payload?.features?.[0];
  if (!feature) {
    throw new Error("No route returned for these points.");
  }

  return feature;
}

function showRoute(feature) {
  clearRouteDrawing();

  const latLngs = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  routeLayer = L.polyline(latLngs, {
    color: "#0f766e",
    weight: 5,
    opacity: 0.9,
  }).addTo(map);

  map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });

  const summary = feature.properties?.summary ?? {};
  const distance = summary.distance ?? 0;
  const duration = summary.duration ?? 0;
  const co2Kg = calculateCo2Kg(distance);

  distanceEl.textContent = formatDistance(distance);
  durationEl.textContent = formatDuration(duration);
  co2El.textContent = formatCo2(co2Kg);
  statsEl.hidden = false;
  resetBtn.hidden = false;
  setStatus("Route loaded from OpenRouteService.");
}

async function onMapClick(event) {
  setError("");

  if (!startLatLng) {
    startLatLng = event.latlng;
    startMarker = L.marker(startLatLng).addTo(map).bindPopup("Start").openPopup();
    setStatus("Click the map to set a destination.");
    resetBtn.hidden = false;
    return;
  }

  if (!endLatLng) {
    endLatLng = event.latlng;
    endMarker = L.marker(endLatLng).addTo(map).bindPopup("End").openPopup();
    setStatus("Fetching route from OpenRouteService…");

    try {
      const feature = await fetchRoute(startLatLng, endLatLng);
      showRoute(feature);
    } catch (error) {
      setStatus("Could not load the route.");
      setError(error.message || "Unknown routing error.");
    }
    return;
  }

  resetRoute();
  startLatLng = event.latlng;
  startMarker = L.marker(startLatLng).addTo(map).bindPopup("Start").openPopup();
  setStatus("Click the map to set a destination.");
  resetBtn.hidden = false;
}

map.on("click", onMapClick);
resetBtn.addEventListener("click", resetRoute);

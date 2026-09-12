import {
  calculateEcoScore,
  estimateTripCo2Grams,
  MODE_CO2_G_PER_KM,
} from "./ecoScore.js";

const form = document.getElementById("eco-form");
const startInput = document.getElementById("start-location");
const endInput = document.getElementById("end-location");
const modeSelect = document.getElementById("transport-mode");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const scoreEl = document.getElementById("eco-score-value");
const meterEl = document.getElementById("eco-score-meter");
const intensityEl = document.getElementById("intensity");
const distanceEl = document.getElementById("distance");
const tripCo2El = document.getElementById("trip-co2");
const submitBtn = document.getElementById("calculate");

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

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

function formatDistance(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(2)} km`;
}

function formatTripCo2(grams) {
  if (grams <= 0) {
    return "0 g";
  }
  if (grams < 1000) {
    return `${Math.round(grams)} g`;
  }
  return `${(grams / 1000).toFixed(2)} kg`;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in km (Haversine). */
export function haversineKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function geocode(query) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Location lookup failed (${response.status}).`);
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`Could not find “${query}”. Try a clearer place name.`);
  }

  return {
    lat: Number(results[0].lat),
    lon: Number(results[0].lon),
    label: results[0].display_name,
  };
}

function renderScore({ mode, distanceKm }) {
  const score = calculateEcoScore(mode, distanceKm);
  const intensity = MODE_CO2_G_PER_KM[mode] ?? 0;
  const tripCo2 = estimateTripCo2Grams(mode, distanceKm);

  scoreEl.textContent = String(score);
  meterEl.style.width = `${score}%`;
  meterEl.parentElement?.setAttribute("aria-valuenow", String(score));
  intensityEl.textContent = `${intensity} g/km`;
  distanceEl.textContent = formatDistance(distanceKm);
  tripCo2El.textContent = formatTripCo2(tripCo2);
}

async function onSubmit(event) {
  event.preventDefault();
  setError("");

  const startQuery = startInput.value.trim();
  const endQuery = endInput.value.trim();
  const mode = modeSelect.value;

  if (!startQuery || !endQuery) {
    setError("Enter both a start and end location.");
    return;
  }

  submitBtn.disabled = true;
  setStatus("Looking up locations…");

  try {
    const start = await geocode(startQuery);
    // Nominatim asks for max 1 request/second.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const end = await geocode(endQuery);
    const distanceKm = haversineKm(start, end);

    if (distanceKm <= 0) {
      throw new Error("Start and end look like the same place.");
    }

    renderScore({ mode, distanceKm });
    setStatus(
      `${start.label.split(",")[0]} → ${end.label.split(",")[0]} · ${formatDistance(distanceKm)}`,
    );
  } catch (error) {
    setStatus("Could not calculate Eco-Score.");
    setError(error.message || "Unknown error.");
  } finally {
    submitBtn.disabled = false;
  }
}

function onModeChange() {
  // Recompute with last known distance text if we already have one in km form.
  const distanceText = distanceEl.textContent;
  const match = distanceText.match(/([\d.]+)\s*km/);
  const metersMatch = distanceText.match(/([\d.]+)\s*m/);
  let distanceKm = 0;
  if (match) {
    distanceKm = Number(match[1]);
  } else if (metersMatch) {
    distanceKm = Number(metersMatch[1]) / 1000;
  }

  if (distanceKm > 0) {
    renderScore({ mode: modeSelect.value, distanceKm });
  } else {
    // Mode-only preview before locations are set (0 km → still uses floor).
    renderScore({ mode: modeSelect.value, distanceKm: 0 });
    distanceEl.textContent = "—";
    tripCo2El.textContent = "—";
  }
}

form.addEventListener("submit", onSubmit);
modeSelect.addEventListener("change", onModeChange);
renderScore({ mode: modeSelect.value, distanceKm: 0 });
distanceEl.textContent = "—";
tripCo2El.textContent = "—";
setStatus("Enter start and end locations, then calculate.");

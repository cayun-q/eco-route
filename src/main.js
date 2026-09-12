import { geocode, fetchMultiModalRoutes } from "./routing.js";
import {
  compareAlternatives,
  buildParkAndRideSuggestion,
} from "./compareRoutes.js";
import { renderRecommendationCards } from "./renderRecommendations.js";
import { calculateEcoScore } from "./ecoScore.js";
import { getGramsCo2ePerKm } from "./carbonBaselines.js";

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
const durationEl = document.getElementById("duration");
const submitBtn = document.getElementById("calculate");
const recsEl = document.getElementById("recommendations");

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
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

function formatDuration(sec) {
  const minutes = Math.round(sec / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${m} min`;
}

function formatCo2(grams) {
  if (grams <= 0) return "0 g";
  if (grams < 1000) return `${Math.round(grams)} g`;
  return `${(grams / 1000).toFixed(2)} kg`;
}

function renderPrimarySummary(route) {
  const score = calculateEcoScore(route.modeId, route.distanceKm);
  scoreEl.textContent = String(score);
  meterEl.style.width = `${score}%`;
  meterEl.parentElement?.setAttribute("aria-valuenow", String(score));
  intensityEl.textContent = `${getGramsCo2ePerKm(route.modeId)} g/km`;
  distanceEl.textContent = formatDistance(route.distanceKm);
  durationEl.textContent = formatDuration(route.durationSec);
  tripCo2El.textContent = formatCo2(route.co2Grams);
}

async function onSubmit(event) {
  event.preventDefault();
  setError("");
  recsEl.hidden = true;
  recsEl.innerHTML = "";

  const startQuery = startInput.value.trim();
  const endQuery = endInput.value.trim();
  const primaryModeId = modeSelect.value;

  if (!startQuery || !endQuery) {
    setError("Enter both a start and end location.");
    return;
  }

  submitBtn.disabled = true;
  setStatus("Looking up locations…");

  try {
    const start = await geocode(startQuery);
    await new Promise((r) => setTimeout(r, 1100));
    const end = await geocode(endQuery);

    setStatus("Fetching multi-modal routes from OpenRouteService…");
    const { primary, alternatives, errors, all } = await fetchMultiModalRoutes(
      start,
      end,
      primaryModeId,
    );

    renderPrimarySummary(primary);

    const compared = compareAlternatives(primary, alternatives);
    const transit = all.find((r) => r.modeId === "transit-bus");
    const parkRide = buildParkAndRideSuggestion(primary, transit);

    renderRecommendationCards(recsEl, compared, parkRide, primary);

    const startName = start.label?.split(",")[0] ?? startQuery;
    const endName = end.label?.split(",")[0] ?? endQuery;
    let status = `${startName} → ${endName} · compared ${compared.filter((c) => c.realistic).length} realistic options`;
    if (errors.length) {
      status += ` (${errors.length} profile warning${errors.length > 1 ? "s" : ""})`;
    }
    setStatus(status);
  } catch (error) {
    setStatus("Could not build recommendations.");
    setError(error.message || "Unknown error.");
  } finally {
    submitBtn.disabled = false;
  }
}

form.addEventListener("submit", onSubmit);
setStatus("Enter origin, destination, and your usual mode — then compare greener options.");

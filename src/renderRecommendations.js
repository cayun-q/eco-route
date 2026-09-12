import { calculateEcoScore } from "./ecoScore.js";
import { frameCo2Savings, frameTimeTradeoff } from "./gamification.js";

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
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

/**
 * @param {HTMLElement} container
 * @param {import("./compareRoutes.js").ComparedRoute[]} compared
 * @param {ReturnType<import("./compareRoutes.js").buildParkAndRideSuggestion>} parkRide
 * @param {import("./routing.js").RouteOption} primary
 */
export function renderRecommendationCards(
  container,
  compared,
  parkRide,
  primary,
) {
  container.innerHTML = "";
  container.hidden = false;

  const heading = document.createElement("h2");
  heading.className = "recs__title";
  heading.textContent = "Recommendations";
  container.appendChild(heading);

  const list = document.createElement("div");
  list.className = "recs__list";
  container.appendChild(list);

  const realistic = compared.filter((c) => c.realistic);
  const filtered = compared.filter((c) => !c.realistic && !c.isPrimary);

  for (const item of realistic) {
    list.appendChild(buildCard(item));
  }

  if (parkRide) {
    list.appendChild(buildParkRideCard(parkRide, primary));
  }

  if (filtered.length) {
    const note = document.createElement("details");
    note.className = "recs__filtered";
    note.innerHTML = `<summary>Hidden impractical options (${filtered.length})</summary>`;
    const ul = document.createElement("ul");
    for (const item of filtered) {
      const li = document.createElement("li");
      li.textContent = `${item.route.label}: ${item.rejectReasons.join(" ")}`;
      ul.appendChild(li);
    }
    note.appendChild(ul);
    container.appendChild(note);
  }
}

/** @param {import("./compareRoutes.js").ComparedRoute} item */
function buildCard(item) {
  const { route } = item;
  const eco = calculateEcoScore(route.modeId, route.distanceKm);
  const framing = frameCo2Savings(item.co2SavedGrams);
  const trade = frameTimeTradeoff(item.extraMinutes, item.co2SavedPercent);

  const card = document.createElement("article");
  card.className = "rec-card";
  if (item.isPrimary) card.classList.add("rec-card--primary");
  if (!item.isPrimary && item.co2SavedGrams > 0) {
    card.classList.add("rec-card--greener");
  }

  let savings;
  if (item.isPrimary) savings = "Your selected mode";
  else if (item.co2SavedGrams <= 0) savings = "Higher carbon than your selection";
  else {
    savings = `${Math.round(item.co2SavedPercent)}% less CO₂ · ${formatCo2(item.co2SavedGrams)} saved`;
  }

  card.innerHTML = `
    <header class="rec-card__header">
      <h3>${route.label}</h3>
      <div>
        ${item.isPrimary ? '<span class="rec-card__badge">Selected</span>' : ""}
        ${
          route.source === "estimated"
            ? '<span class="rec-card__badge rec-card__badge--muted">Estimated</span>'
            : ""
        }
      </div>
    </header>
    <p class="rec-card__savings">${savings}</p>
    <dl class="rec-card__stats">
      <div><dt>Distance</dt><dd>${formatDistance(route.distanceKm)}</dd></div>
      <div><dt>Duration</dt><dd>${formatDuration(route.durationSec)}</dd></div>
      <div><dt>CO₂</dt><dd>${formatCo2(route.co2Grams)}</dd></div>
      <div><dt>Eco-Score</dt><dd>${eco}</dd></div>
    </dl>
    <p class="rec-card__trade">${trade}</p>
    ${
      !item.isPrimary && item.co2SavedGrams > 0
        ? `<p class="rec-card__frame">${framing.headline}</p>`
        : ""
    }
  `;
  return card;
}

function buildParkRideCard(parkRide, primary) {
  const saved = primary.co2Grams - parkRide.co2Grams;
  const framing = frameCo2Savings(saved);
  const eco = calculateEcoScore(
    { gramsCo2ePerKm: parkRide.gramsCo2ePerKm },
    parkRide.distanceKm,
  );
  const card = document.createElement("article");
  card.className = "rec-card rec-card--combo";
  card.innerHTML = `
    <header class="rec-card__header">
      <h3>${parkRide.label}</h3>
      <span class="rec-card__badge">Multi-modal</span>
    </header>
    <p class="rec-card__detail">${parkRide.detail}</p>
    <dl class="rec-card__stats">
      <div><dt>Distance</dt><dd>${formatDistance(parkRide.distanceKm)}</dd></div>
      <div><dt>Duration</dt><dd>${formatDuration(parkRide.durationSec)}</dd></div>
      <div><dt>CO₂</dt><dd>${formatCo2(parkRide.co2Grams)}</dd></div>
      <div><dt>Eco-Score</dt><dd>${eco}</dd></div>
    </dl>
    <p class="rec-card__frame">${framing.headline}</p>
    <p class="rec-card__trade">${frameTimeTradeoff(
      (parkRide.durationSec - primary.durationSec) / 60,
      primary.co2Grams > 0 ? (saved / primary.co2Grams) * 100 : 0,
    )}</p>
  `;
  return card;
}

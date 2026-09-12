const MAX_CO2_G_PER_KM = 171;

const MODE_INTENSITY = {
  "driving-car": 171,
  "driving-ev": 45,
  "cycling-regular": 0,
  "foot-walking": 0,
};

function resolveIntensity(mode) {
  if (typeof mode === "string") {
    return MODE_INTENSITY[mode] ?? MAX_CO2_G_PER_KM;
  }

  if (mode && typeof mode.co2GPerKm === "number") {
    return mode.co2GPerKm;
  }

  if (mode && typeof mode.value === "string") {
    return MODE_INTENSITY[mode.value] ?? MAX_CO2_G_PER_KM;
  }

  return MAX_CO2_G_PER_KM;
}

export function calculateEcoScore(mode) {
  const intensity = Math.max(0, resolveIntensity(mode));
  const score = 100 * (1 - intensity / MAX_CO2_G_PER_KM);
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function renderEcoScore(mode) {
  const score = calculateEcoScore(mode);
  const scoreEl = document.getElementById("eco-score-value");
  const cardEl = document.getElementById("eco-score-card");
  const meterEl = document.getElementById("eco-score-meter");
  const trackEl = meterEl?.parentElement;

  if (scoreEl) {
    scoreEl.textContent = String(score);
  }

  if (meterEl) {
    meterEl.style.width = `${score}%`;
    meterEl.dataset.score = String(score);
  }

  if (trackEl?.getAttribute("role") === "meter") {
    trackEl.setAttribute("aria-valuenow", String(score));
  }

  if (cardEl) {
    cardEl.dataset.score = String(score);
    cardEl.hidden = false;
  }

  return score;
}

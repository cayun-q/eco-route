import { calculateEcoScore, MODE_CO2_G_PER_KM } from "./ecoScore.js";

const modeSelect = document.getElementById("transport-mode");
const scoreEl = document.getElementById("eco-score-value");
const meterEl = document.getElementById("eco-score-meter");
const intensityEl = document.getElementById("intensity");

function updateScore() {
  const mode = modeSelect.value;
  const score = calculateEcoScore(mode);
  const intensity = MODE_CO2_G_PER_KM[mode] ?? 0;

  scoreEl.textContent = String(score);
  meterEl.style.width = `${score}%`;
  meterEl.parentElement?.setAttribute("aria-valuenow", String(score));
  intensityEl.textContent = `${intensity} g/km`;
}

modeSelect.addEventListener("change", updateScore);
updateScore();

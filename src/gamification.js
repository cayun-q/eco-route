/**
 * Turn CO₂ grams into human-scale analogies for framing / gamification.
 */

/** ~8.1 g CO₂e for charging a smartphone once (order-of-magnitude). */
export const GRAMS_PER_PHONE_CHARGE = 8.1;
/** ~21 g CO₂e absorbed by a mature tree per day (rough planning figure). */
export const GRAMS_PER_TREE_DAY = 21;
/** ~120 g CO₂e for boiling a kettle once. */
export const GRAMS_PER_KETTLE = 120;

/**
 * @param {number} gramsCo2Saved
 * @returns {{ headline: string, details: string[] }}
 */
export function frameCo2Savings(gramsCo2Saved) {
  const saved = Math.max(0, gramsCo2Saved);
  if (saved < 1) {
    return {
      headline: "Similar carbon cost to your current choice",
      details: [],
    };
  }

  const phoneCharges = saved / GRAMS_PER_PHONE_CHARGE;
  const treeDays = saved / GRAMS_PER_TREE_DAY;
  const kettles = saved / GRAMS_PER_KETTLE;

  let headline;
  if (phoneCharges >= 365) {
    const years = phoneCharges / 365;
    headline = `Saves enough CO₂ to charge a smartphone for ~${years.toFixed(1)} years`;
  } else if (phoneCharges >= 30) {
    headline = `Saves enough CO₂ to charge a smartphone ~${Math.round(phoneCharges)} times`;
  } else if (kettles >= 2) {
    headline = `Saves about ${Math.round(kettles)} kettle boils worth of CO₂`;
  } else {
    headline = `Saves ~${Math.round(saved)} g CO₂e on this trip`;
  }

  const details = [
    `≈ ${Math.round(phoneCharges)} phone charges`,
    `≈ ${treeDays.toFixed(1)} tree-days of absorption`,
  ];

  return { headline, details };
}

/**
 * @param {number} extraMinutes
 * @param {number} co2SavedPercent
 */
export function frameTimeTradeoff(extraMinutes, co2SavedPercent) {
  const absMin = Math.abs(extraMinutes);
  const timeLabel =
    absMin < 1
      ? "almost the same time"
      : absMin < 60
        ? `${Math.round(absMin)} min`
        : `${(absMin / 60).toFixed(1)} h`;

  if (extraMinutes > 2 && co2SavedPercent > 5) {
    return `+${timeLabel} for ${Math.round(co2SavedPercent)}% less CO₂`;
  }
  if (extraMinutes < -2 && co2SavedPercent > 5) {
    return `${timeLabel} faster and ${Math.round(co2SavedPercent)}% less CO₂`;
  }
  if (extraMinutes < -2) {
    return `${timeLabel} faster`;
  }
  if (extraMinutes > 2) {
    return `+${timeLabel} vs your selected mode`;
  }
  return "Similar travel time";
}

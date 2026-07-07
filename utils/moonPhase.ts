
import { parseToISODate } from './dateUtils';

export const getMoonPhase = (dateStr: string): string => {
  const isoStr = parseToISODate(dateStr);
  const date = new Date(isoStr);

  if (isNaN(date.getTime())) return "N/A";

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let c = 0, e = 0, jd = 0, b = 0;

  if (month < 3) {
    year - 1;
    month + 12;
  }

  const yearAdj = month < 3 ? year - 1 : year;
  const monthAdj = month < 3 ? month + 12 : month;

  const a = Math.floor(yearAdj / 100);
  const b_calc = 2 - a + Math.floor(a / 4);

  jd = Math.floor(365.25 * (yearAdj + 4716)) + Math.floor(30.6001 * (monthAdj + 1)) + day + b_calc - 1524.5;
  
  const daysSinceNew = jd - 2451549.5;
  const newMoons = daysSinceNew / 29.53058867;
  const phase = newMoons - Math.floor(newMoons);
  
  const phaseDays = phase * 29.53;

  if (phaseDays >= 3.69 && phaseDays < 11.07) return "Crescente";
  if (phaseDays >= 11.07 && phaseDays < 18.46) return "Cheia";
  if (phaseDays >= 18.46 && phaseDays < 25.84) return "Minguante";
  return "Nova";
};

export const getMoonPhasesForRange = (startDateStr: string, endDateStr: string): string => {
  const start = new Date(parseToISODate(startDateStr));
  const end = new Date(parseToISODate(endDateStr));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return isNaN(end.getTime()) ? (isNaN(start.getTime()) ? "N/A" : getMoonPhase(startDateStr)) : getMoonPhase(endDateStr);
  }

  // Ensure chronological order
  const startMs = Math.min(start.getTime(), end.getTime());
  const endMs = Math.max(start.getTime(), end.getTime());

  // Prevent giant loops by capping at 30 days. If the range is more than 30 days,
  // we know all 4 moon phases have occurred at least once.
  const diffDays = (endMs - startMs) / (1000 * 60 * 60 * 24);
  if (diffDays > 30) {
    return "Crescente, Cheia, Minguante, Nova";
  }

  const phases: string[] = [];
  const current = new Date(startMs);

  // Set time of current and end to midnight to do day-by-day iteration reliably
  current.setHours(12, 0, 0, 0);
  const limit = new Date(endMs);
  limit.setHours(12, 0, 0, 0);

  let safetyLimit = 35;
  while (current <= limit && safetyLimit > 0) {
    safetyLimit--;
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    const phase = getMoonPhase(dateStr);
    if (phase !== "N/A" && !phases.includes(phase)) {
      phases.push(phase);
    }
    
    current.setDate(current.getDate() + 1);
  }

  return phases.join(", ");
};

// Today's date as YYYY-MM-DD (used to compare follow-up and visit dates).
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

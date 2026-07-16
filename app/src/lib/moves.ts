// Mirrors the reading "moves" (arcs) baked into the Psalm 23 series days_json.
// Kept client-side for the progress track segments in the dashboard.
export const MOVES = [
  { name: 'Read it cold', from: 1, to: 7 },
  { name: 'The world behind it', from: 8, to: 15 },
  { name: 'What scholars see', from: 16, to: 23 },
  { name: 'Make it yours', from: 24, to: 30 },
];

export function moveOf(day: number, totalDays: number) {
  return MOVES.find((m) => day >= m.from && day <= m.to) || MOVES[MOVES.length - 1];
}

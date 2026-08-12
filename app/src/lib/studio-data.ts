// The Studio's method data: question types, day-count plans, seed-type
// guidance and the worked example. Copied verbatim from the design handoff's
// studio.js (SEEDS / PLANS / QT / FRAMES / SEED_STATE).

export type QTKey = 'mean' | 'true' | 'diff';
export type SeedType = 'passage' | 'person' | 'book' | 'read' | 'idea' | 'word';
export type MoveKey = 'unit' | 'obs' | 'idea' | 'end' | 'days' | 'compose';
export type Mode = 'guided' | 'free';

export const QT: Record<QTKey, { label: string; short: string; cls: string }> = {
  mean: { label: 'What does this mean?', short: 'Meaning', cls: 'mean' },
  true: { label: 'Is it true?', short: 'Truth', cls: 'truth' },
  diff: { label: 'What difference does it make?', short: 'Difference', cls: 'diff' },
};

export const PLANS: Record<number, QTKey[]> = {
  3: ['mean', 'true', 'diff'],
  5: ['mean', 'mean', 'true', 'diff', 'diff'],
  7: ['mean', 'mean', 'mean', 'true', 'true', 'diff', 'diff'],
  10: ['mean', 'mean', 'true', 'diff', 'diff', 'mean', 'mean', 'true', 'diff', 'diff'],
  14: [
    'mean', 'mean', 'mean', 'true', 'true', 'diff', 'diff',
    'mean', 'mean', 'mean', 'true', 'true', 'diff', 'diff',
  ],
};

export function plan(dayCount: number): QTKey[] {
  if (PLANS[dayCount]) return PLANS[dayCount];
  return Array.from({ length: dayCount }, (_, i) =>
    i < Math.ceil(dayCount * 0.4) ? 'mean' : i < Math.ceil(dayCount * 0.6) ? 'true' : 'diff'
  );
}

export const SEEDS: Record<SeedType, { label: string; cut: string; day: string; trap: string }> = {
  passage: {
    label: 'Passage',
    cut: 'Its movements — a change of speaker, place, time, audience or genre, or a repeated phrase closing what it opened.',
    day: 'One movement, read closely.',
    trap: 'Cutting at chapter numbers, which are medieval, not authorial.',
  },
  person: {
    label: 'Person',
    cut: 'Their turns — decisions that cannot be undone. Gather every reference first, including ones that do not use their name.',
    day: 'One decision and its cost.',
    trap: 'Writing a biography. Selection is the work.',
  },
  book: {
    label: 'Book of the Bible',
    cut: 'Its own structure. Find the shape before imposing one.',
    day: 'One structural part.',
    trap: 'Letting a survey hand you the frame before you have read the book yourself.',
  },
  read: {
    label: 'A book you read',
    cut: 'Its claims, stripped of the author’s examples.',
    day: 'One claim, tested against a text the author never cites.',
    trap: 'Reviewing the book instead of using it.',
  },
  idea: {
    label: 'Idea or theme',
    cut: 'Its occurrences — four to six, ordered by canon, not by strength.',
    day: 'One occurrence, in its own context.',
    trap: 'Deductive drift: starting from the topic and hunting verses that prove it.',
  },
  word: {
    label: 'A word',
    cut: 'Its range: first use, hardest use, surprising use, last use.',
    day: 'One use, and what it rules out.',
    trap: 'Word-study fallacies — the root fallacy and the expanded semantic field.',
  },
};

export const FRAMES = [
  'Pull-quote',
  'Two-column rule card',
  'Echo bracket',
  'Before / after proportion',
  'Timeline',
  'Proportion blocks',
  'Skill card',
  'Matrix',
  'Anatomy',
  'Route schematic',
];

export interface Move {
  k: MoveKey;
  t: string;
  on: boolean;
}

export const DEFAULT_MOVES: Move[] = [
  { k: 'unit', t: 'Cut the unit', on: true },
  { k: 'obs', t: 'Observe', on: true },
  { k: 'idea', t: 'The idea', on: true },
  { k: 'end', t: 'The last day', on: true },
  { k: 'days', t: 'Deal the days', on: true },
  { k: 'compose', t: 'Shape the day', on: true },
];

export interface Obs {
  id: number;
  text: string;
  ref: string;
  qt: QTKey | null;
}

export interface Day {
  obs: number | null;
  hook: string;
  book: string;
  look: string;
  took: string;
  frame: string;
}

export interface FreeDay {
  t: string;
  b: string;
}

export interface StudioState {
  title: string;
  seedType: SeedType;
  seed: string;
  mode: Mode;
  moves: Move[];
  showChecks: boolean;
  free: { title: string; notes: string; days: FreeDay[] };
  unit: { start: string; end: string; markers: string[]; seam: string };
  subject: string;
  complement: string;
  homiletical: string;
  capability: string;
  dayCount: number;
  obs: Obs[];
  days: Day[];
}

export const SEED_STATE: StudioState = {
  title: 'Empty and Full',
  seedType: 'book',
  seed: 'Ruth',
  mode: 'guided',
  moves: JSON.parse(JSON.stringify(DEFAULT_MOVES)),
  showChecks: true,
  free: { title: '', notes: '', days: [{ t: '', b: '' }] },
  unit: {
    start: 'Ruth 1:1',
    end: 'Ruth 4:22',
    markers: ['genre', 'time', 'inclusio'],
    seam: 'ESV and NIV break at 2:1; the Hebrew paragraph marker falls after 1:22. The seam is the arrival in Bethlehem.',
  },
  subject: 'How the writer of Ruth frames the story',
  complement: 'by having a character state the plot in one word at the start and the town answer it at the end',
  homiletical: 'Read the last five verses of a narrative book first. They tell you what it was for.',
  capability: 'Read a narrative book’s ending before its beginning, and name the frame.',
  dayCount: 5,
  obs: [
    {
      id: 1,
      text: 'Chapter 1 empties the family in five verses, then lets Naomi summarise the plot out loud.',
      ref: 'Ruth 1:1–5, 1:21',
      qt: 'mean',
    },
    {
      id: 2,
      text: 'Boaz’s field is not charity. Gleaning is a law being kept by someone who did not have to.',
      ref: 'Lev 19:9–10; Deut 24:19',
      qt: 'mean',
    },
    {
      id: 3,
      text: 'Boaz blesses Ruth for taking refuge under YHWH’s wings; Ruth then asks Boaz to spread his wing over her. Same word.',
      ref: 'Ruth 2:12 / 3:9',
      qt: 'true',
    },
    {
      id: 4,
      text: 'The nearer redeemer says no, and the legal machinery at the gate produces the outcome.',
      ref: 'Ruth 4:1–6',
      qt: 'diff',
    },
    {
      id: 5,
      text: 'The town answers 1:21 directly — more to you than seven sons.',
      ref: 'Ruth 4:15',
      qt: 'diff',
    },
    { id: 6, text: 'The book ends in a genealogy that arrives at David.', ref: 'Ruth 4:18–22', qt: null },
    {
      id: 7,
      text: 'Naomi renames herself Mara, and no one in the book ever uses the new name.',
      ref: 'Ruth 1:20',
      qt: null,
    },
  ],
  days: [
    {
      obs: 1,
      hook: 'A family is emptied in five verses. Then someone says the word out loud.',
      book: '"I went away full, and the LORD has brought me back empty." (Ruth 1:21)',
      look: 'The narrator lets a character summarise his own plot. That is a frame being set, not a complaint being recorded.',
      took: 'Read 1:1–5 and count how many deaths get a sentence each.',
      frame: 'Pull-quote',
    },
    { obs: 2, hook: '', book: '', look: '', took: '', frame: 'Two-column rule card' },
    { obs: 3, hook: '', book: '', look: '', took: '', frame: 'Echo bracket' },
    { obs: 4, hook: '', book: '', look: '', took: '', frame: 'Timeline' },
    { obs: 5, hook: '', book: '', look: '', took: '', frame: 'Before / after proportion' },
  ],
};

export function blankState(title = 'Untitled series'): StudioState {
  const s: StudioState = JSON.parse(JSON.stringify(SEED_STATE));
  s.title = title;
  s.seed = '';
  s.subject = '';
  s.complement = '';
  s.homiletical = '';
  s.capability = '';
  s.unit = { start: '', end: '', markers: [], seam: '' };
  s.obs = [];
  s.dayCount = 5;
  s.days = [];
  s.free = { title: '', notes: '', days: [{ t: '', b: '' }] };
  return s;
}

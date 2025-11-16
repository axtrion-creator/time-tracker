import { create } from 'zustand';

const STORAGE_KEY = 'focus-tracker/v1';

export type FocusSession = {
  start: string; // ISO string
  end: string;
};

export type FocusEntries = Record<string, FocusSession[]>;

type RunningSession = {
  start: string;
  date: string;
};

interface PersistedState {
  entries: FocusEntries;
  running: RunningSession | null;
}

interface FocusState extends PersistedState {
  selectedDate: string;
  initialized: boolean;
  initialize: () => void;
  startSession: () => void;
  stopSession: () => void;
  selectDate: (date: string) => void;
  clearDay: (date: string) => void;
}

export function getDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function loadPersisted(): PersistedState {
  if (typeof window === 'undefined') {
    return { entries: {}, running: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: {}, running: null };
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      entries: parsed.entries ?? {},
      running: parsed.running ?? null
    };
  } catch (error) {
    console.warn('Focus tracker load failed', error);
    return { entries: {}, running: null };
  }
}

function persistState(state: PersistedState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Focus tracker persist failed', error);
  }
}

function clampDateKey(date: string): string {
  return date.length >= 10 ? date.slice(0, 10) : date;
}

export function calculateTotalMs(sessions: FocusSession[]): number {
  return sessions.reduce((total, session) => {
    const start = Date.parse(session.start);
    const end = Date.parse(session.end);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return total;
    return total + (end - start);
  }, 0);
}

export const useFocusStore = create<FocusState>((set, get) => ({
  entries: {},
  running: null,
  selectedDate: getDayKey(),
  initialized: false,
  initialize: () => {
    if (get().initialized) return;
    const persisted = loadPersisted();
    const today = getDayKey();
    const selectedDate = clampDateKey(get().selectedDate ?? today);
    set({
      entries: persisted.entries,
      running: persisted.running,
      selectedDate,
      initialized: true
    });
  },
  startSession: () =>
    set((state) => {
      if (state.running) return state;
      const now = new Date().toISOString();
      const date = getDayKey();
      const running: RunningSession = { start: now, date };
      const entries = state.entries;
      persistState({ entries, running });
      return { running, selectedDate: date };
    }),
  stopSession: () =>
    set((state) => {
      if (!state.running) return state;
      const end = new Date().toISOString();
      const { running } = state;
      const dayKey = running.date;
      const current = state.entries[dayKey] ?? [];
      const updatedEntries = {
        ...state.entries,
        [dayKey]: [...current, { start: running.start, end }]
      };
      persistState({ entries: updatedEntries, running: null });
      return { entries: updatedEntries, running: null };
    }),
  selectDate: (date) => set({ selectedDate: clampDateKey(date) }),
  clearDay: (date) =>
    set((state) => {
      const key = clampDateKey(date);
      if (!state.entries[key]) return state;
      const updatedEntries = { ...state.entries };
      delete updatedEntries[key];
      const running = state.running && state.running.date === key ? null : state.running;
      persistState({ entries: updatedEntries, running });
      const nextSelected = key === state.selectedDate ? getDayKey() : state.selectedDate;
      return { entries: updatedEntries, running, selectedDate: nextSelected };
    })
}));

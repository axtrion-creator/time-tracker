import { create } from "zustand";

const STORAGE_KEY = "focus-tracker/v1";

type FocusSession = {
  start: string;
  end: string;
};

export type FocusEntries = Record<string, FocusSession[]>;

type DayNotes = Record<string, string>;

type RunningSession = {
  start: string;
  date: string;
};

interface PersistedState {
  entries: FocusEntries;
  notes: DayNotes;
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
  setDayNote: (date: string, note: string) => void;
  removeSession: (date: string, session: FocusSession) => void;
}

export function getDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function loadPersisted(): PersistedState {
  const empty: PersistedState = { entries: {}, notes: {}, running: null };
  if (typeof window === "undefined") {
    return empty;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      entries: parsed.entries ?? {},
      notes: parsed.notes ?? {},
      running: parsed.running ?? null
    };
  } catch (error) {
    console.warn("Focus tracker load failed", error);
    return empty;
  }
}

function persistState(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Focus tracker persist failed", error);
  }
}

function clampDateKey(date: string): string {
  return date.length >= 10 ? date.slice(0, 10) : date;
}

function sanitizeNote(note: string): string {
  return note.trim().slice(0, 30);
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
  notes: {},
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
      notes: persisted.notes,
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
      persistState({ entries: state.entries, notes: state.notes, running });
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
      persistState({ entries: updatedEntries, notes: state.notes, running: null });
      return { entries: updatedEntries, running: null };
    }),
  selectDate: (date) => set({ selectedDate: clampDateKey(date) }),
  clearDay: (date) =>
    set((state) => {
      const key = clampDateKey(date);
      const updatedEntries = { ...state.entries };
      const updatedNotes = { ...state.notes };
      let changed = false;
      if (updatedEntries[key]) {
        delete updatedEntries[key];
        changed = true;
      }
      if (updatedNotes[key]) {
        delete updatedNotes[key];
        changed = true;
      }
      if (!changed) return state;
      const running = state.running && state.running.date === key ? null : state.running;
      persistState({ entries: updatedEntries, notes: updatedNotes, running });
      const nextSelected = key === state.selectedDate ? getDayKey() : state.selectedDate;
      return { entries: updatedEntries, notes: updatedNotes, running, selectedDate: nextSelected };
    }),
  setDayNote: (date, note) =>
    set((state) => {
      const key = clampDateKey(date || getDayKey());
      const clean = sanitizeNote(note);
      const nextNotes = { ...state.notes };
      if (clean) {
        nextNotes[key] = clean;
      } else {
        delete nextNotes[key];
      }
      persistState({ entries: state.entries, notes: nextNotes, running: state.running });
      return { notes: nextNotes };
    }),
  removeSession: (date, session) =>
    set((state) => {
      const key = clampDateKey(date);
      const daySessions = state.entries[key];
      if (!daySessions?.length) return state;
      const filtered = daySessions.filter(
        (item) => item.start !== session.start || item.end !== session.end
      );
      if (filtered.length === daySessions.length) return state;
      const updatedEntries = { ...state.entries };
      if (filtered.length) {
        updatedEntries[key] = filtered;
      } else {
        delete updatedEntries[key];
      }
      persistState({ entries: updatedEntries, notes: state.notes, running: state.running });
      return { entries: updatedEntries };
    })
}));

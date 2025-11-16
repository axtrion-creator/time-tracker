import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { calculateTotalMs, getDayKey, useFocusStore } from "../lib/focusStore";

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatShort(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function toDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatLabel(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(toDate(dateKey));
}

export function FocusTracker() {
  const [now, setNow] = useState(() => Date.now());
  const [currentElapsedMs, setCurrentElapsedMs] = useState(0);
  const {
    entries,
    notes,
    running,
    selectedDate,
    initialized,
    initialize,
    startSession,
    stopSession,
    selectDate,
    clearDay,
    setDayNote
  } = useFocusStore((state) => ({
    entries: state.entries,
    notes: state.notes,
    running: state.running,
    selectedDate: state.selectedDate,
    initialized: state.initialized,
    initialize: state.initialize,
    startSession: state.startSession,
    stopSession: state.stopSession,
    selectDate: state.selectDate,
    clearDay: state.clearDay,
    setDayNote: state.setDayNote
  }));

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!running) {
      setNow(Date.now());
      setCurrentElapsedMs(0);
      return;
    }
    const startMs = Date.parse(running.start);
    const update = () => {
      const current = Date.now();
      setNow(current);
      setCurrentElapsedMs(Math.max(0, current - startMs));
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const todayKey = getDayKey();
  const selectedSessions = entries[selectedDate] ?? [];
  const todaySessions = entries[todayKey] ?? [];
  const dayNote = notes[selectedDate] ?? "";

  const runningContribution = running ? Math.max(0, now - Date.parse(running.start)) : 0;
  const selectedRunningContribution = running?.date === selectedDate ? runningContribution : 0;
  const todayRunningContribution = running?.date === todayKey ? runningContribution : 0;

  const selectedTotalMs = useMemo(
    () => calculateTotalMs(selectedSessions) + selectedRunningContribution,
    [selectedSessions, selectedRunningContribution]
  );
  const todayTotalMs = useMemo(
    () => calculateTotalMs(todaySessions) + todayRunningContribution,
    [todaySessions, todayRunningContribution]
  );

  const history = useMemo(() => {
    const days: { date: string; totalMs: number }[] = [];
    for (let offset = 0; offset < 30; offset += 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = getDayKey(date);
      const sessions = entries[key] ?? [];
      const base = calculateTotalMs(sessions);
      const extra = running?.date === key ? runningContribution : 0;
      days.push({ date: key, totalMs: base + extra });
    }
    return days;
  }, [entries, running?.date, runningContribution]);

  const historyOptions = history.map((item) => (
    <option key={item.date} value={item.date}>
      {formatLabel(item.date)}
    </option>
  ));

  const handleNoteChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDayNote(selectedDate, event.target.value);
  };

  return (
    <section className="focus-section" aria-live="polite">
      <div className="cards">
        <article className="card highlight">
          <div className="eyebrow">Current session</div>
          <div className="time-display">{running ? formatDuration(currentElapsedMs) : "00:00:00"}</div>
          <p className="status-line">
            {running
              ? `Tracking since ${new Date(running.start).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}`
              : "Press start to log your next deep-work block."}
          </p>
          <div className="actions">
            <button type="button" className="primary" onClick={running ? stopSession : startSession}>
              {running ? "Stop & log session" : "Start focus"}
            </button>
            <button type="button" onClick={() => selectDate(todayKey)} aria-pressed={selectedDate === todayKey}>
              View today
            </button>
          </div>
        </article>
        <article className="card summary">
          <header className="summary-header">
            <div className="summary-total">
              <div className="eyebrow">Today&apos;s total</div>
              <h2>{formatDuration(todayTotalMs)}</h2>
            </div>
            <div className="summary-picker">
              <div className="eyebrow">Selected day</div>
              <select value={selectedDate} onChange={(event) => selectDate(event.target.value)} disabled={!initialized}>
                {historyOptions}
              </select>
            </div>
          </header>
          <p className="status-line">
            {selectedDate === todayKey
              ? "Includes every session you logged today."
              : `You recorded ${selectedSessions.length} session(s) on this day.`}
          </p>
          <p className="time-display small">{formatDuration(selectedTotalMs)}</p>
          <button type="button" className="danger" onClick={() => clearDay(selectedDate)}>
            Clear this day
          </button>
        </article>
      </div>
      <div className="two-column">
        <div className="history-panel">
          <div className="eyebrow">Last 30 days</div>
          <ul className="history-list">
            {history.map((entry) => {
              const percent =
                history[0].totalMs > 0 ? Math.round((entry.totalMs / history[0].totalMs) * 100) : 0;
              return (
                <li key={entry.date}>
                  <button
                    type="button"
                    className="history-row"
                    onClick={() => selectDate(entry.date)}
                    aria-pressed={selectedDate === entry.date}
                  >
                    <span>{formatLabel(entry.date)}</span>
                    <div className="history-bar">
                      <div className="history-bar-fill" style={{ width: `${Math.min(100, percent)}%` }} />
                    </div>
                    <span className="history-duration">{formatDuration(entry.totalMs)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="sessions-panel">
          <div className="sessions-header">
            <div>
              <div className="eyebrow">Sessions on {formatLabel(selectedDate)}</div>
              <p className="status-line small">
                {selectedSessions.length
                  ? "Each entry shows the start/end time for that deep-work block."
                  : "No sessions recorded for this day."}
              </p>
            </div>
            <span className="session-count">{selectedSessions.length}</span>
          </div>
          <ul className="sessions-list">
            {selectedSessions.map((session, index) => {
              const duration = Math.max(0, Date.parse(session.end) - Date.parse(session.start));
              return (
                <li key={`${session.start}-${session.end}`}>
                  <button
                    type="button"
                    className="session-row"
                    onClick={() => selectDate(session.start.slice(0, 10))}
                  >
                    <span className="session-label">Session {index + 1} - {formatShort(duration)}</span>
                    <span className="session-time">
                      {new Date(session.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -
                      {" "}
                      {new Date(session.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="session-duration">{formatDuration(duration)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="note-panel">
            <label htmlFor="day-note" className="eyebrow">
              Daily note (30 characters max)
            </label>
            <input
              id="day-note"
              type="text"
              maxLength={30}
              value={dayNote}
              onChange={handleNoteChange}
              placeholder="Add a quick reminder"
            />
            <div className="note-hint">{dayNote.length}/30 characters</div>
          </div>
        </div>
      </div>
    </section>
  );
}

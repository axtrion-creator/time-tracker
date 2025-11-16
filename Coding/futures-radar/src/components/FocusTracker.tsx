import { useEffect, useMemo, useState } from 'react';
import { calculateTotalMs, getDayKey, useFocusStore } from '../lib/focusStore';

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function toDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(toDate(dateKey));
}

export function FocusTracker() {
  const [now, setNow] = useState(() => Date.now());
  const {
    entries,
    running,
    selectedDate,
    initialized,
    initialize,
    startSession,
    stopSession,
    selectDate
  } = useFocusStore((state) => ({
    entries: state.entries,
    running: state.running,
    selectedDate: state.selectedDate,
    initialized: state.initialized,
    initialize: state.initialize,
    startSession: state.startSession,
    stopSession: state.stopSession,
    selectDate: state.selectDate
  }));

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!running) {
      setNow(Date.now());
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const todayKey = getDayKey();
  const selectedSessions = entries[selectedDate] ?? [];
  const todaySessions = entries[todayKey] ?? [];

  const runningContribution =
    running?.date === selectedDate ? Math.max(0, now - Date.parse(running.start)) : 0;
  const todayRunningContribution =
    running?.date === todayKey ? Math.max(0, now - Date.parse(running.start)) : 0;

  const selectedTotalMs = useMemo(
    () => calculateTotalMs(selectedSessions) + runningContribution,
    [selectedSessions, runningContribution]
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
      const total =
        running?.date === key ? base + Math.max(0, now - Date.parse(running.start)) : base;
      days.push({ date: key, totalMs: total });
    }
    return days;
  }, [entries, running, now]);

  const historyOptions = history.map((item) => (
    <option key={item.date} value={item.date}>
      {formatDateLabel(item.date)}
    </option>
  ));

  return (
    <section className="focus-tracker" aria-label="Focus tracking dashboard">
      <div className="focus-card">
        <div className="eyebrow">Today&apos;s focus time</div>
        <div className="focus-time">{formatDuration(todayTotalMs)}</div>
        <div className="focus-status">
          {running ? `Tracking since ${new Date(running.start).toLocaleTimeString()}` : 'Paused'}
        </div>
        <div className="focus-actions">
          <button
            type="button"
            className="primary"
            onClick={running ? stopSession : startSession}
          >
            {running ? 'Stop focus' : 'Start focus'}
          </button>
          <button
            type="button"
            onClick={() => selectDate(todayKey)}
            aria-pressed={selectedDate === todayKey}
          >
            View today
          </button>
        </div>
      </div>
      <div className="focus-card history">
        <div className="history-header">
          <div>
            <div className="eyebrow">History (30 days)</div>
            <div className="history-date">{formatDateLabel(selectedDate)}</div>
          </div>
          <select
            aria-label="Select day to review"
            value={selectedDate}
            onChange={(event) => selectDate(event.target.value)}
            disabled={!initialized}
          >
            {historyOptions}
          </select>
        </div>
        <div className="history-total">{formatDuration(selectedTotalMs)}</div>
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
                  <span>{formatDateLabel(entry.date)}</span>
                  <div className="history-bar">
                    <div
                      className="history-bar-fill"
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                  <span className="history-duration">{formatDuration(entry.totalMs)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

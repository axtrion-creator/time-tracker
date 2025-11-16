import { FocusTracker } from "./components/FocusTracker";

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Focus companion</p>
          <h1>Time Tracker</h1>
        </div>
        <p className="header-subtitle">
          Start the timer when you dive into deep work. Pause it whenever you get interrupted.
        </p>
      </header>
      <main>
        <FocusTracker />
      </main>
      <footer className="app-footer">
        <small>Data never leaves your browser—stored locally on this device.</small>
      </footer>
    </div>
  );
}

import { useEffect, useMemo } from 'react';
import { useRadarStore } from './lib/store';
import { Toolbar } from './components/Toolbar';
import { Radar } from './components/Radar';
import { SidePanel } from './components/SidePanel';
import { FocusTracker } from './components/FocusTracker';

export function App() {
  const {
    config,
    visible,
    layout,
    selected,
    issues,
    loadInitial,
    setSelected,
    fullscreen,
    setFullscreen
  } = useRadarStore((state) => ({
    config: state.config,
    visible: state.visible,
    layout: state.layout,
    selected: state.selected,
    issues: state.issues,
    loadInitial: state.loadInitial,
    setSelected: state.setSelected,
    fullscreen: state.fullscreen,
    setFullscreen: state.setFullscreen
  }));

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [setFullscreen]);

  const hasData = (visible?.length ?? 0) > 0;

  const issueList = useMemo(() => {
    if (!issues.length) return null;
    return (
      <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(208, 9, 9, 0.1)', color: '#ffd3d3' }}>
        <strong>Import warnings:</strong>
        <ul>
          {issues.map((issue) => (
            <li key={`${issue.id}-${issue.reason}`}>{issue.id}: {issue.reason}</li>
          ))}
        </ul>
      </div>
    );
  }, [issues]);

  return (
    <div className="app" data-fullscreen={fullscreen}>
      <FocusTracker />
      <Toolbar />
      {issueList}
      <div className="main">
        <div className="canvas-wrapper">
          {config ? (
            <Radar config={config} layout={layout} hasData={hasData} />
          ) : (
            <p style={{ padding: '2rem' }}>Loading configuration…</p>
          )}
        </div>
        <SidePanel item={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}

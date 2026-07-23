import { useEffect, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import type { RecordingState } from '@renderer/types';

const BAR_COUNT = 7;

export function Overlay(): React.JSX.Element {
  const [state, setState] = useState<RecordingState>('recording');
  // Rolling history of recent levels (0..100) drives the waveform bars.
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(6));

  useEffect(() => {
    const off = window.api.recording.onState((payload) => {
      setState(payload.state);
      setBars((prev) => {
        const next = prev.slice(1);
        next.push(Math.max(6, Math.min(100, payload.level)));
        return next;
      });
    });
    return off;
  }, []);

  const send = (cmd: 'pause' | 'resume' | 'stop'): void => window.api.recording.sendCommand(cmd);

  return (
    <div className="pill-wrap">
      <div className="pill">
        <div className="grip" aria-hidden>
          <span />
          <span />
          <span />
        </div>

        <div className={`wave${state === 'paused' ? ' paused' : ''}`}>
          {bars.map((level, i) => (
            <div key={i} className="bar" style={{ height: `${state === 'paused' ? 6 : level}%` }} />
          ))}
        </div>

        <div className="actions">
          {state === 'recording' ? (
            <button className="btn" title="Pause" onClick={() => send('pause')}>
              <Pause size={15} />
            </button>
          ) : (
            <button className="btn" title="Resume" onClick={() => send('resume')}>
              <Play size={15} className="ml-[1px]" />
            </button>
          )}
          <button className="btn stop" title="Stop" onClick={() => send('stop')}>
            <Square size={13} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

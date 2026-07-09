import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';
import { t, type Lang } from '../i18n/texts';

export default function MiniTimer() {
  const { timerSound, volume, pomodoroWork, pomodoroBreak, dndMode, pomodoroEnabled, language } = useSettings();
  const { isXs, isSm, isMd, width } = useWindowSize();

  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [inputHours, setInputHours] = useState('00');
  const [inputMinutes, setInputMinutes] = useState('00');
  const [inputSeconds, setInputSeconds] = useState('00');
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      setIsFinished(true);
      playAlarm();
    }
  }, [timeLeft, isRunning]);

  function playAlarm() {
    if (window.electronAPI) window.electronAPI.showNotification(t(language as Lang, 'timerFinishedTitle'), t(language as Lang, 'timeIsUp'));
    let audio: HTMLAudioElement | null = null;
    if (timerSound === 'bell') audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    else if (timerSound === 'digital') audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2861/2861-preview.mp3');
    else if (timerSound) audio = new Audio(`media:///${timerSound.replace(/\\/g, '/')}`);
    if (audio && !dndMode) { audio.volume = volume / 100; audio.play().catch(() => { }); }
  }

  const addTimeSeconds = (secs: number) => setTimeLeft(prev => prev + secs);
  const startPomodoro = (minutes: number) => { setTimeLeft(minutes * 60); setIsRunning(true); };
  const startCustom = () => {
    const total = (parseInt(inputHours) || 0) * 3600 + (parseInt(inputMinutes) || 0) * 60 + (parseInt(inputSeconds) || 0);
    if (total > 0) { setTimeLeft(total); setIsRunning(true); }
  };
  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => { setIsRunning(false); setTimeLeft(0); setIsFinished(false); };

  const extendTime = (secs: number) => {
    setIsFinished(false);
    setTimeLeft(secs);
    setIsRunning(true);
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return h > 0
      ? `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const adjustValue = (setter: React.Dispatch<React.SetStateAction<string>>, val: string, max: number, amount: number) => {
    let num = (parseInt(val) || 0) + amount;
    if (num < 0) num = max;
    if (num > max) num = 0;
    setter(num.toString().padStart(2, '0'));
  };

  // Scale clock font proportionally to window width
  const clockSize = Math.max(1.8, Math.min(4, width * 0.12)) + 'rem';

  const TimeInput = ({ value, setter, max }: { value: string; setter: React.Dispatch<React.SetStateAction<string>>; max: number }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button className="win-btn" style={{ height: '22px', minWidth: 0, padding: 0 }} onClick={() => adjustValue(setter, value, max, 1)}><ChevronUp size={14} /></button>
      <input
        type="text"
        style={{ width: '38px', textAlign: 'center', fontSize: '1.5em', padding: '2px', background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', fontWeight: 600, fontFamily: 'monospace' }}
        value={value}
        onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.length > 2) v = v.substring(v.length - 2); setter(v); }}
        onBlur={() => setter((parseInt(value) || 0).toString().padStart(2, '0'))}
      />
      <button className="win-btn" style={{ height: '22px', minWidth: 0, padding: 0 }} onClick={() => adjustValue(setter, value, max, -1)}><ChevronDown size={14} /></button>
    </div>
  );

  // ── XS: only the clock digit fills the window ──────────────────────────────
  if (isXs) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ fontSize: clockSize, fontWeight: 700, fontFamily: 'monospace', color: isFinished ? '#ff3333' : 'var(--accent)', lineHeight: 1, whiteSpace: 'nowrap' }}>
          {isFinished ? '00:00' : (timeLeft > 0 ? formatTime(timeLeft) : '–:––')}
        </div>
      </div>
    );
  }

  // ── SM: clock + icon buttons only ─────────────────────────────────────────
  if (isSm) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '8px', overflow: 'hidden' }}>
        <div style={{ fontSize: clockSize, fontWeight: 700, fontFamily: 'monospace', color: isFinished ? '#ff3333' : 'var(--accent)', lineHeight: 1, whiteSpace: 'nowrap' }}>
          {isFinished ? '00:00' : (timeLeft > 0 ? formatTime(timeLeft) : '–:––')}
        </div>
        {timeLeft > 0 && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.85em' }} onClick={toggleTimer}>{isRunning ? '⏸' : '▶'}</button>
            <button className="btn" style={{ padding: '4px 12px', fontSize: '0.85em' }} onClick={resetTimer}>✕</button>
          </div>
        )}
        {isFinished && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.85em' }} onClick={() => extendTime(300)}>+5m</button>
            <button className="btn" style={{ padding: '4px 12px', fontSize: '0.85em' }} onClick={resetTimer}>✕</button>
          </div>
        )}
      </div>
    );
  }

  // ── MD: clock + buttons + quick-add strips ─────────────────────────────────
  if (isMd) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', gap: '12px', overflow: 'hidden' }}>
        <h2 style={{ fontSize: '0.9em', margin: 0, color: 'var(--text-muted)' }}>{t(language as Lang, 'minitimer')}</h2>
        <div style={{ fontSize: clockSize, fontWeight: 700, fontFamily: 'monospace', color: isFinished ? '#ff3333' : 'var(--accent)', lineHeight: 1 }}>
          {isFinished ? '00:00' : (timeLeft > 0 ? formatTime(timeLeft) : '00:00')}
        </div>
        {timeLeft > 0 ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" style={{ padding: '6px 14px' }} onClick={toggleTimer}>{isRunning ? t(language as Lang, 'pause') : t(language as Lang, 'start')}</button>
            <button className="btn" style={{ padding: '6px 14px' }} onClick={resetTimer}>{t(language as Lang, 'reset')}</button>
          </div>
        ) : isFinished ? (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8em' }} onClick={() => extendTime(300)}>+5 {t(language as Lang, 'min' as any) || 'm'}</button>
            <button className="btn" style={{ flex: 1, fontSize: '0.8em' }} onClick={resetTimer}>Ок</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            <button className="btn" style={{ flex: 1, fontSize: '0.8em' }} onClick={() => addTimeSeconds(60)}>{t(language as Lang, 'add1m')}</button>
            <button className="btn" style={{ flex: 1, fontSize: '0.8em' }} onClick={() => addTimeSeconds(300)}>{t(language as Lang, 'add5m')}</button>
            <button className="btn" style={{ flex: 1, fontSize: '0.8em' }} onClick={() => addTimeSeconds(600)}>{t(language as Lang, 'add10m')}</button>
          </div>
        )}
      </div>
    );
  }

  // ── FULL: complete setup UI ────────────────────────────────────────────────
  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <h2>{t(language as Lang, 'minitimer')}</h2>
        <div style={{ fontSize: '4rem', fontWeight: 600, fontFamily: 'monospace', color: isFinished ? '#ff3333' : 'var(--accent)' }}>
          {isFinished ? '00:00' : formatTime(timeLeft)}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {timeLeft > 0 ? (
            <>
              <button className="btn btn-primary" onClick={toggleTimer}>{isRunning ? t(language as Lang, 'pause') : t(language as Lang, 'start')}</button>
              <button className="btn" onClick={resetTimer}>{t(language as Lang, 'reset')}</button>
            </>
          ) : isFinished ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', width: '100%' }}>
              <div style={{ fontSize: '1.2rem', color: '#ff3333', fontWeight: 'bold' }}>Время вышло!</div>
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => extendTime(300)}>+5 минут</button>
                <button className="btn" style={{ flex: 1 }} onClick={resetTimer}>Ок</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', width: '100%' }}>
              {pomodoroEnabled && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button className="btn" style={{ background: 'rgba(235,87,87,0.2)', color: '#eb5757', borderColor: '#eb5757' }} onClick={() => startPomodoro(pomodoroWork)}>🍅 {t(language as Lang, 'focusBtn')} ({pomodoroWork}м)</button>
                  <button className="btn" style={{ background: 'rgba(39,174,96,0.2)', color: '#27ae60', borderColor: '#27ae60' }} onClick={() => startPomodoro(pomodoroBreak)}>☕ {t(language as Lang, 'breakBtn')} ({pomodoroBreak}м)</button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn" style={{ flex: 1, whiteSpace: 'nowrap' }} onClick={() => addTimeSeconds(30)}>{t(language as Lang, 'add30s')}</button>
                <button className="btn" style={{ flex: 1, whiteSpace: 'nowrap' }} onClick={() => addTimeSeconds(60)}>{t(language as Lang, 'add1m')}</button>
                <button className="btn" style={{ flex: 1, whiteSpace: 'nowrap' }} onClick={() => addTimeSeconds(300)}>{t(language as Lang, 'add5m')}</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px' }}>
                <TimeInput value={inputHours} setter={setInputHours} max={99} />
                <span style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '0 5px', color: 'var(--text-muted)' }}>:</span>
                <TimeInput value={inputMinutes} setter={setInputMinutes} max={59} />
                <span style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '0 5px', color: 'var(--text-muted)' }}>:</span>
                <TimeInput value={inputSeconds} setter={setInputSeconds} max={59} />
              </div>
              <button className="btn btn-primary" onClick={startCustom} style={{ width: '100%' }}>{t(language as Lang, 'start')}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react'

function loadState(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const centiseconds = Math.floor((ms % 1000) / 10)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
}

export default function Stopwatch({ accent, digital, zoom = 1 }) {
  const [elapsed, setElapsed] = useState(() => loadState('swElapsed', 0))
  const [running, setRunning] = useState(false)
  const [laps, setLaps] = useState(() => loadState('swLaps', []))
  const intervalRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('swElapsed', JSON.stringify(elapsed))
  }, [elapsed])

  useEffect(() => {
    localStorage.setItem('swLaps', JSON.stringify(laps))
  }, [laps])

  const tick = useCallback(() => {
    setElapsed(prev => prev + 10)
  }, [])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 10)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, tick])

  const handleStart = () => setRunning(true)
  const handleStop = () => setRunning(false)

  const handleReset = () => {
    setRunning(false)
    setElapsed(0)
    setLaps([])
  }

  const handleLap = () => {
    setLaps(prev => [formatTime(elapsed), ...prev])
  }

  return (
    <>
      <div className={`big-time${digital ? ' digital' : ' normal'}`} style={{ fontSize: `calc(96px * ${zoom})` }}>{formatTime(elapsed)}</div>
      <div className="btn-row">
        <button className="action-btn" style={{background:'#f97316',color:'#fff'}} onClick={handleReset}>재설정</button>
        {running && (
          <button className="action-btn primary" onClick={handleLap}>랩</button>
        )}
        {!running ? (
          <button className="action-btn" style={{background:'#22c55e',color:'#fff'}} onClick={handleStart}>시작</button>
        ) : (
          <button className="action-btn" style={{background:'#ef4444',color:'#fff'}} onClick={handleStop}>정지</button>
        )}
      </div>
      {laps.length > 0 && (
        <div className="lap-list">
          {laps.map((lap, i) => (
            <div className="lap-item" key={i}>
              <span>랩 {laps.length - i}</span>
              <span>{lap}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

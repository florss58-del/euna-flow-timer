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
  // base: 지난 구간들의 누적 시간. startAt: 지금 구간이 시작된 시각(epoch ms)
  const [base, setBase] = useState(() => loadState('swElapsed', 0))
  const [startAt, setStartAt] = useState(() => loadState('swStartAt', 0))
  const [running, setRunning] = useState(() =>
    loadState('swRunning', false) && loadState('swStartAt', 0) > 0
  )
  const [laps, setLaps] = useState(() => loadState('swLaps', []))
  const [, forceRender] = useState(0)
  const rafRef = useRef(null)
  const channelRef = useRef(null)
  const skipRef = useRef(false)

  // BroadcastChannel - PiP 창과 양방향 동기화
  useEffect(() => {
    channelRef.current = new BroadcastChannel('stopwatch-sync')
    channelRef.current.onmessage = (e) => {
      const d = e.data
      skipRef.current = true
      if (d.base !== undefined) setBase(d.base)
      if (d.startAt !== undefined) setStartAt(d.startAt)
      if (d.running !== undefined) setRunning(d.running)
      if (d.laps !== undefined) setLaps(d.laps)
      if (d.reset) { setBase(0); setStartAt(0); setRunning(false); setLaps([]) }
      setTimeout(() => { skipRef.current = false }, 50)
    }
    return () => channelRef.current?.close()
  }, [])

  const broadcast = useCallback((data) => {
    if (!skipRef.current) channelRef.current?.postMessage(data)
  }, [])

  useEffect(() => {
    localStorage.setItem('swLaps', JSON.stringify(laps))
  }, [laps])

  useEffect(() => {
    localStorage.setItem('swElapsed', JSON.stringify(base))
    localStorage.setItem('swStartAt', JSON.stringify(startAt))
    localStorage.setItem('swRunning', JSON.stringify(running))
    broadcast({ running, base, startAt })
  }, [running, base, startAt, broadcast])

  // 외부 탭에서 localStorage 변경 시 동기화
  useEffect(() => {
    const handleStorage = (e) => {
      if (!e.key || !e.key.startsWith('sw')) return
      if (e.key === 'swElapsed') setBase(JSON.parse(e.newValue || '0'))
      if (e.key === 'swStartAt') setStartAt(JSON.parse(e.newValue || '0'))
      if (e.key === 'swRunning') setRunning(JSON.parse(e.newValue || 'false'))
      if (e.key === 'swLaps') setLaps(JSON.parse(e.newValue || '[]'))
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // 화면 갱신만 담당. 경과 시간은 항상 시작 시각과 현재 시각의 차이로 계산한다.
  useEffect(() => {
    if (!running) return
    const loop = () => {
      forceRender(n => n + 1)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [running])

  const elapsed = running && startAt > 0 ? base + (Date.now() - startAt) : base

  const handleStart = () => {
    setStartAt(Date.now())
    setRunning(true)
  }

  const handleStop = () => {
    setBase(elapsed)
    setStartAt(0)
    setRunning(false)
  }

  const handleReset = () => {
    setRunning(false)
    setBase(0)
    setStartAt(0)
    setLaps([])
    broadcast({ reset: true })
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

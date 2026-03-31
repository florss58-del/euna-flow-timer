import { useState, useEffect, useRef, useCallback } from 'react'

function loadState(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

function formatDisplay(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function Timer({ accent, digital, zoom = 1 }) {
  const [inputMin, setInputMin] = useState(() => loadState('timerInputMin', 5))
  const [inputSec, setInputSec] = useState(() => loadState('timerInputSec', 0))
  const [timeLeft, setTimeLeft] = useState(() => loadState('timerTimeLeft', 0))
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(() => loadState('timerStarted', false))
  const [editOpen, setEditOpen] = useState(false)
  const [editMin, setEditMin] = useState(5)
  const [editSec, setEditSec] = useState(0)
  const intervalRef = useRef(null)
  const channelRef = useRef(null)
  const skipRef = useRef(false)

  // BroadcastChannel - PiP 창과 양방향 동기화
  useEffect(() => {
    channelRef.current = new BroadcastChannel('timer-sync')
    channelRef.current.onmessage = (e) => {
      const d = e.data
      skipRef.current = true
      if (d.timeLeft !== undefined) setTimeLeft(d.timeLeft)
      if (d.started !== undefined) {
        setStarted(d.started)
        if (!d.started) setRunning(false)
      }
      if (d.running !== undefined) setRunning(d.running)
      if (d.inputMin !== undefined) setInputMin(d.inputMin)
      if (d.inputSec !== undefined) setInputSec(d.inputSec)
      setTimeout(() => { skipRef.current = false }, 50)
    }
    return () => channelRef.current?.close()
  }, [])

  const broadcast = useCallback((data) => {
    if (!skipRef.current) channelRef.current?.postMessage(data)
  }, [])

  useEffect(() => {
    localStorage.setItem('timerInputMin', JSON.stringify(inputMin))
    localStorage.setItem('timerInputSec', JSON.stringify(inputSec))
  }, [inputMin, inputSec])

  useEffect(() => {
    localStorage.setItem('timerTimeLeft', JSON.stringify(timeLeft))
    localStorage.setItem('timerStarted', JSON.stringify(started))
  }, [timeLeft, started])

  useEffect(() => {
    localStorage.setItem('timerRunning', JSON.stringify(running))
    broadcast({ running, started, timeLeft, inputMin, inputSec })
  }, [running, broadcast])

  // 외부 탭에서 localStorage 변경 시 동기화
  useEffect(() => {
    const handleStorage = (e) => {
      if (!e.key || !e.key.startsWith('timer')) return
      if (e.key === 'timerTimeLeft') setTimeLeft(JSON.parse(e.newValue || '0'))
      if (e.key === 'timerStarted') {
        const v = JSON.parse(e.newValue || 'false')
        setStarted(v)
        if (!v) setRunning(false)
      }
      if (e.key === 'timerRunning') setRunning(JSON.parse(e.newValue || 'false'))
      if (e.key === 'timerInputMin') setInputMin(JSON.parse(e.newValue || '5'))
      if (e.key === 'timerInputSec') setInputSec(JSON.parse(e.newValue || '0'))
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const playAlarm = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const playBeep = (time, freq, dur, vol = 1.0, type = 'square') => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = type
        gain.gain.setValueAtTime(vol, time)
        gain.gain.setValueAtTime(vol, time + dur * 0.7)
        gain.gain.exponentialRampToValueAtTime(0.01, time + dur)
        osc.start(time)
        osc.stop(time + dur)
      }
      const t = ctx.currentTime
      // 1세트: 빠른 고음 3연타
      playBeep(t,       1200, 0.15, 1.0, 'square')
      playBeep(t + 0.2, 1200, 0.15, 1.0, 'square')
      playBeep(t + 0.4, 1500, 0.25, 1.0, 'square')
      // 2세트
      playBeep(t + 0.8, 1200, 0.15, 1.0, 'square')
      playBeep(t + 1.0, 1200, 0.15, 1.0, 'square')
      playBeep(t + 1.2, 1500, 0.25, 1.0, 'square')
      // 3세트: 더 높은 마무리
      playBeep(t + 1.6, 1200, 0.15, 1.0, 'square')
      playBeep(t + 1.8, 1200, 0.15, 1.0, 'square')
      playBeep(t + 2.0, 1800, 0.5,  1.0, 'sawtooth')
    } catch {}
  }, [])

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev <= 10) {
        setRunning(false)
        setStarted(false)
        playAlarm()
        return 0
      }
      return prev - 10
    })
  }, [playAlarm])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 10)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, tick])

  const handleStart = () => {
    if (!started) {
      const total = (inputMin * 60 + inputSec) * 1000
      if (total <= 0) return
      setTimeLeft(total)
      setStarted(true)
    }
    setRunning(true)
  }

  const handlePause = () => setRunning(false)

  const handleReset = () => {
    setRunning(false)
    setStarted(false)
    setTimeLeft(0)
  }

  const openEdit = () => {
    setEditMin(inputMin)
    setEditSec(inputSec)
    setEditOpen(true)
  }

  const confirmEdit = () => {
    setInputMin(editMin)
    setInputSec(editSec)
    if (started) {
      setTimeLeft((editMin * 60 + editSec) * 1000)
    }
    setRunning(false)
    setStarted(false)
    setEditOpen(false)
  }

  const displayMs = started ? timeLeft : (inputMin * 60 + inputSec) * 1000
  const isWarning = started && running && timeLeft > 0 && timeLeft <= 15000

  return (
    <div className="timer-page">
      <h1 className="timer-title" style={{ fontSize: `calc(28px * ${zoom})` }}>타이머</h1>
      <div
        className={`timer-display${digital ? ' digital' : ' normal'}${isWarning ? ' blink-warning' : ''}`}
        style={{ fontSize: `calc(clamp(80px, 18vw, 160px) * ${zoom})` }}
      >
        {formatDisplay(displayMs)}
      </div>
      <div className="btn-row">
        <button className="action-btn" style={{background:'#2dd4bf',color:'#fff'}} onClick={openEdit}>타이머 수정</button>
        <button className="action-btn" style={{background:'#f97316',color:'#fff'}} onClick={handleReset}>재설정</button>
        {!running ? (
          <button className="action-btn" style={{background:'#22c55e',color:'#fff'}} onClick={handleStart}>
            {started ? '계속' : '시작'}
          </button>
        ) : (
          <button className="action-btn" style={{background:'#ef4444',color:'#fff'}} onClick={handlePause}>일시정지</button>
        )}
      </div>

      {editOpen && (
        <>
          <div className="timer-modal-overlay" onClick={() => setEditOpen(false)} />
          <div className="timer-modal">
            <h2 className="timer-modal-title">시간 설정</h2>
            <div className="timer-modal-inputs">
              <div className="timer-modal-field">
                <input
                  className="timer-modal-input"
                  type="number"
                  min="0"
                  max="99"
                  value={editMin}
                  onChange={e => setEditMin(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span className="timer-modal-label">분</span>
              </div>
              <span className="timer-modal-colon">:</span>
              <div className="timer-modal-field">
                <input
                  className="timer-modal-input"
                  type="number"
                  min="0"
                  max="59"
                  value={editSec}
                  onChange={e => setEditSec(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                />
                <span className="timer-modal-label">초</span>
              </div>
            </div>
            <div className="timer-modal-actions">
              <button className="action-btn secondary" onClick={() => setEditOpen(false)}>취소</button>
              <button className="action-btn primary" onClick={confirmEdit}>확인</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

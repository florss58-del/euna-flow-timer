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
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function Timer({ accent, digital, zoom = 1 }) {
  const [inputMin, setInputMin] = useState(() => loadState('timerInputMin', 5))
  const [inputSec, setInputSec] = useState(() => loadState('timerInputSec', 0))
  // timeLeft: 멈춰 있을 때의 남은 시간. deadline: 돌고 있을 때 0이 되는 시각(epoch ms)
  const [timeLeft, setTimeLeft] = useState(() => loadState('timerTimeLeft', 0))
  const [deadline, setDeadline] = useState(() => loadState('timerDeadline', 0))
  const [started, setStarted] = useState(() => loadState('timerStarted', false))
  const [running, setRunning] = useState(() =>
    loadState('timerRunning', false) && loadState('timerDeadline', 0) > Date.now()
  )
  const [editOpen, setEditOpen] = useState(false)
  const [editMin, setEditMin] = useState(5)
  const [editSec, setEditSec] = useState(0)
  const [, forceRender] = useState(0)
  const channelRef = useRef(null)
  const skipRef = useRef(false)

  // BroadcastChannel - PiP 창과 양방향 동기화
  useEffect(() => {
    channelRef.current = new BroadcastChannel('timer-sync')
    channelRef.current.onmessage = (e) => {
      const d = e.data
      skipRef.current = true
      if (d.timeLeft !== undefined) setTimeLeft(d.timeLeft)
      if (d.deadline !== undefined) setDeadline(d.deadline)
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
    localStorage.setItem('timerDeadline', JSON.stringify(deadline))
    localStorage.setItem('timerStarted', JSON.stringify(started))
    localStorage.setItem('timerRunning', JSON.stringify(running))
    broadcast({ running, started, timeLeft, deadline, inputMin, inputSec })
  }, [running, started, timeLeft, deadline, inputMin, inputSec, broadcast])

  // 외부 탭에서 localStorage 변경 시 동기화
  useEffect(() => {
    const handleStorage = (e) => {
      if (!e.key || !e.key.startsWith('timer')) return
      if (e.key === 'timerTimeLeft') setTimeLeft(JSON.parse(e.newValue || '0'))
      if (e.key === 'timerDeadline') setDeadline(JSON.parse(e.newValue || '0'))
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

  // 화면 갱신만 담당. 남은 시간은 항상 deadline과 현재 시각의 차이로 계산한다.
  // 탭이 백그라운드로 가면 브라우저가 타이머를 늦추지만, 벽시계 기준이라 값은 어긋나지 않는다.
  useEffect(() => {
    if (!running) return
    const bump = () => forceRender(n => n + 1)
    const id = setInterval(bump, 200)
    document.addEventListener('visibilitychange', bump)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', bump)
    }
  }, [running])

  // 타이머가 도는 동안 화면이 꺼지지 않게 한다. 수업 중 노트북이 잠들면 시간이 안 보인다.
  useEffect(() => {
    if (!running || !navigator.wakeLock) return
    let lock = null
    let cancelled = false
    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) next.release().catch(() => {})
        else lock = next
      } catch {}
    }
    acquire()
    // 다른 탭에 갔다 오면 잠금이 풀려 있으므로 다시 잡는다
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [running])

  const remainingMs = running ? Math.max(0, deadline - Date.now()) : timeLeft

  useEffect(() => {
    if (running && remainingMs <= 0) {
      setRunning(false)
      setStarted(false)
      setTimeLeft(0)
      setDeadline(0)
      playAlarm()
    }
  }, [running, remainingMs, playAlarm])

  const handleStart = () => {
    const base = started ? timeLeft : (inputMin * 60 + inputSec) * 1000
    if (base <= 0) return
    setStarted(true)
    setTimeLeft(base)
    setDeadline(Date.now() + base)
    setRunning(true)
  }

  const handlePause = () => {
    setTimeLeft(Math.max(0, deadline - Date.now()))
    setDeadline(0)
    setRunning(false)
  }

  const handleReset = () => {
    setRunning(false)
    setStarted(false)
    setTimeLeft(0)
    setDeadline(0)
  }

  const openEdit = () => {
    setEditMin(inputMin)
    setEditSec(inputSec)
    setEditOpen(true)
  }

  const applyPreset = (min) => {
    setInputMin(min)
    setInputSec(0)
    setRunning(false)
    setStarted(false)
    setTimeLeft(0)
    setDeadline(0)
  }

  const confirmEdit = () => {
    setInputMin(editMin)
    setInputSec(editSec)
    setRunning(false)
    setStarted(false)
    setTimeLeft(0)
    setDeadline(0)
    setEditOpen(false)
  }

  const displayMs = started ? remainingMs : (inputMin * 60 + inputSec) * 1000
  const isWarning = started && running && remainingMs > 0 && remainingMs <= 15000

  return (
    <div className="timer-page">
      <h1 className="timer-title" style={{ fontSize: `calc(28px * ${zoom})` }}>타이머</h1>
      <div
        className={`timer-display${digital ? ' digital' : ' normal'}${isWarning ? ' blink-warning' : ''}`}
        style={{ fontSize: `calc(clamp(80px, 18vw, 160px) * ${zoom})` }}
      >
        {formatDisplay(displayMs)}
      </div>
      <div className="preset-row">
        {[1, 3, 5, 10].map(min => (
          <button
            key={min}
            className={`preset-btn${!started && inputMin === min && inputSec === 0 ? ' active' : ''}`}
            onClick={() => applyPreset(min)}
          >
            {min}분
          </button>
        ))}
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

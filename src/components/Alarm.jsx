import { useState, useEffect, useRef, useCallback } from 'react'

function loadState(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

export default function Alarm({ accent }) {
  const [alarms, setAlarms] = useState(() => loadState('alarms', []))
  const [newTime, setNewTime] = useState('07:00')
  const [ringing, setRinging] = useState(null)
  const checkedRef = useRef(new Set())
  const alarmIntervalRef = useRef(null)

  const playAlarmSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const beep = (time, freq, dur, type = 'square') => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = type
        gain.gain.setValueAtTime(1.0, time)
        gain.gain.setValueAtTime(1.0, time + dur * 0.7)
        gain.gain.exponentialRampToValueAtTime(0.01, time + dur)
        osc.start(time)
        osc.stop(time + dur)
      }
      const t = ctx.currentTime
      beep(t, 1200, 0.15); beep(t+0.2, 1200, 0.15); beep(t+0.4, 1500, 0.25)
      beep(t+0.8, 1200, 0.15); beep(t+1.0, 1200, 0.15); beep(t+1.2, 1500, 0.25)
      beep(t+1.6, 1200, 0.15); beep(t+1.8, 1200, 0.15); beep(t+2.0, 1800, 0.5, 'sawtooth')
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('alarms', JSON.stringify(alarms))
  }, [alarms])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const key = `${hhmm}-${now.getDate()}`

      alarms.forEach(alarm => {
        if (alarm.enabled && alarm.time === hhmm && !checkedRef.current.has(`${alarm.time}-${key}`)) {
          checkedRef.current.add(`${alarm.time}-${key}`)
          setRinging(alarm.time)
          playAlarmSound()
          alarmIntervalRef.current = setInterval(playAlarmSound, 3000)
        }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [alarms])

  const addAlarm = () => {
    if (!newTime) return
    setAlarms(prev => [...prev, { time: newTime, enabled: true }])
  }

  const toggleAlarm = (index) => {
    setAlarms(prev => prev.map((a, i) => i === index ? { ...a, enabled: !a.enabled } : a))
  }

  const deleteAlarm = (index) => {
    setAlarms(prev => prev.filter((_, i) => i !== index))
  }

  const dismissAlarm = () => {
    setRinging(null)
    clearInterval(alarmIntervalRef.current)
  }

  return (
    <>
      <div className="alarm-add-row">
        <input
          className="alarm-time-input"
          type="time"
          value={newTime}
          onChange={e => setNewTime(e.target.value)}
        />
        <button className="action-btn primary" onClick={addAlarm}>추가</button>
      </div>
      <div className="alarm-list">
        {alarms.length === 0 && (
          <p style={{ color: '#666', textAlign: 'center' }}>알람이 없습니다</p>
        )}
        {alarms.map((alarm, i) => (
          <div className="alarm-item" key={i}>
            <span className="alarm-time-display">{alarm.time}</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                className={`alarm-toggle${alarm.enabled ? ' on' : ''}`}
                onClick={() => toggleAlarm(i)}
              />
              <button className="alarm-delete-btn" onClick={() => deleteAlarm(i)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {ringing && (
        <>
          <div className="alarm-overlay" onClick={dismissAlarm} />
          <div className="alarm-notification">
            <h2>알람</h2>
            <p>{ringing}</p>
            <button className="action-btn primary" onClick={dismissAlarm}>끄기</button>
          </div>
        </>
      )}
    </>
  )
}

import { useState, useEffect } from 'react'

function loadState(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

// 알람이 울리는지 감시하는 일은 App이 맡는다. 여기는 목록을 보여주고 고치는 화면만 담당한다.
// 감시가 이 컴포넌트에 있으면 다른 탭으로 옮긴 순간 검사가 멈춘다.
export default function Alarm({ accent, zoom = 1 }) {
  const [alarms, setAlarms] = useState(() => loadState('alarms', []))
  const [newTime, setNewTime] = useState('07:00')

  useEffect(() => {
    localStorage.setItem('alarms', JSON.stringify(alarms))
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

  const zoomStyle = { transform: `scale(${zoom})`, transformOrigin: 'top center' }

  return (
    <div style={zoomStyle}>
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
    </div>
  )
}

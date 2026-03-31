import { useState, useEffect } from 'react'

export default function Clock({ settings, accent, zoom = 1 }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const formatClock = () => {
    let hours = now.getHours()
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')

    if (settings.use12Hour) {
      hours = hours % 12 || 12
    }

    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`
  }

  const getAmPm = () => {
    return now.getHours() < 12 ? '오전' : '오후'
  }

  const getDate = () => {
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const day = now.getDate()
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    const weekDay = weekDays[now.getDay()]
    return `${year}년 ${month}월 ${day}일 ${weekDay}요일`
  }

  return (
    <>
      <div className="clock-label">현재 시간</div>
      <div className="clock-time-row">
        {settings.use12Hour && <span className="clock-ampm">{getAmPm()}</span>}
        <div className={`big-time${settings.digitalDisplay ? ' digital' : ' normal'}`} style={{ fontSize: `calc(96px * ${zoom})` }}>{formatClock()}</div>
      </div>
      {settings.showDate && <div className="clock-date">{getDate()}</div>}
    </>
  )
}

import { useState, useEffect, useCallback, useRef } from 'react'
import Timer from './components/Timer'
import Stopwatch from './components/Stopwatch'
import Alarm from './components/Alarm'
import Clock from './components/Clock'
import Settings from './components/Settings'
import { buildMiniContent, TAB_SIZES } from './miniWindow'

const COLORS = {
  gray: '#6b7280',
  orange: '#f97316',
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
}

const ThemeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="9" fill="#fff" stroke="#fff" strokeWidth="1" />
    <path d="M10,1 A9,9 0 0,1 10,19 Z" fill="#222" />
  </svg>
)

const defaultSettings = {
  digitalDisplay: true,
  use12Hour: false,
  showDate: true,
  lightMode: false,
  accentColor: 'blue',
}

const ZOOM_MIN = 0.5
const ZOOM_MAX = 2.0
const ZOOM_STEP = 0.15

const BASE_TITLE = 'Euna Flow - 집중의 시간'

function loadState(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

// hhmm 알람이 prevMs와 nowMs 사이에 지나갔는지. 배경 탭에서 검사가 늦어져도 놓치지 않는다.
// 다만 1분 넘게 지난 알람은 울리지 않는다. 뒤늦게 울리는 알람은 쓸모가 없다.
function alarmPassed(hhmm, prevMs, nowMs) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(nowMs)
  d.setHours(h, m, 0, 0)
  let t = d.getTime()
  if (t > nowMs) t -= 24 * 60 * 60 * 1000
  return t > prevMs && t <= nowMs && nowMs - t < 60000
}

function playAlarmSound() {
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
    beep(t, 1200, 0.15); beep(t + 0.2, 1200, 0.15); beep(t + 0.4, 1500, 0.25)
    beep(t + 0.8, 1200, 0.15); beep(t + 1.0, 1200, 0.15); beep(t + 1.2, 1500, 0.25)
    beep(t + 1.6, 1200, 0.15); beep(t + 1.8, 1200, 0.15); beep(t + 2.0, 1800, 0.5, 'sawtooth')
  } catch {}
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => loadState('activeTab', 'timer'))
  const [settings, setSettings] = useState(() => loadState('settings', defaultSettings))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [zooms, setZooms] = useState(() => loadState('displayZooms', { alarm: 1, timer: 1, stopwatch: 1, clock: 1 }))
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [ringing, setRinging] = useState(null)
  const lastCheckRef = useRef(Date.now())
  const ringLoopRef = useRef(null)

  // 자명종 감시는 앱 전체에서 돈다. 예전에는 자명종 탭에 있을 때만 검사해서
  // 다른 탭을 보고 있으면 알람이 그냥 지나갔다.
  useEffect(() => {
    const check = () => {
      const nowMs = Date.now()
      const prevMs = lastCheckRef.current
      lastCheckRef.current = nowMs
      if (ringing) return

      const alarms = loadState('alarms', [])
      const hit = alarms.find(a => a.enabled && alarmPassed(a.time, prevMs, nowMs))
      if (hit) {
        setRinging(hit.time)
        playAlarmSound()
        ringLoopRef.current = setInterval(playAlarmSound, 3000)
      }
    }
    const id = setInterval(check, 1000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [ringing])

  const dismissAlarm = () => {
    clearInterval(ringLoopRef.current)
    setRinging(null)
  }

  // 브라우저 탭 제목에 남은 시간. 다른 탭에 가 있어도 제목만 보고 확인한다.
  useEffect(() => {
    const id = setInterval(() => {
      const running = loadState('timerRunning', false)
      const deadline = loadState('timerDeadline', 0)
      if (running && deadline > Date.now()) {
        const s = Math.ceil((deadline - Date.now()) / 1000)
        const mm = String(Math.floor(s / 60)).padStart(2, '0')
        const ss = String(s % 60).padStart(2, '0')
        document.title = `${mm}:${ss} · ${BASE_TITLE}`
      } else if (document.title !== BASE_TITLE) {
        document.title = BASE_TITLE
      }
    }, 1000)
    return () => {
      clearInterval(id)
      document.title = BASE_TITLE
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('activeTab', JSON.stringify(activeTab))
  }, [activeTab])

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem('displayZooms', JSON.stringify(zooms))
  }, [zooms])

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleZoomOut = () => setZooms(prev => ({ ...prev, [activeTab]: Math.max(ZOOM_MIN, +(prev[activeTab] - ZOOM_STEP).toFixed(2)) }))
  const handleZoomIn = () => setZooms(prev => ({ ...prev, [activeTab]: Math.min(ZOOM_MAX, +(prev[activeTab] + ZOOM_STEP).toFixed(2)) }))

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  const pipWindowRef = useRef(null)

  const openMiniWindow = useCallback(async () => {
    const size = TAB_SIZES[activeTab]

    if ('documentPictureInPicture' in window) {
      try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: size.w, height: size.h,
        })
        pipWindowRef.current = pipWindow
        buildMiniContent(pipWindow, activeTab, pipWindowRef)
        return
      } catch (e) {
        console.log('PiP failed, fallback to popup', e)
      }
    }

    // Fallback: 일반 팝업 (PiP 미지원 브라우저)
    const left = window.screen.width - size.w - 20
    const popup = window.open('', 'miniWindow',
      `width=${size.w},height=${size.h},left=${left},top=20,resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`)
    if (!popup) return
    buildMiniContent(popup, activeTab, pipWindowRef)
  }, [activeTab])

  const accent = COLORS[settings.accentColor] || COLORS.blue
  const light = settings.lightMode
  const zoom = zooms[activeTab] || 1
  const style = { '--accent-color': accent, '--display-zoom': zoom }

  const tabs = [
    { id: 'alarm', label: '자명종', icon: '⏰' },
    { id: 'timer', label: '타이머', icon: '⏱' },
    { id: 'stopwatch', label: '스톱워치', icon: '🏁' },
    { id: 'clock', label: '시계', icon: '🕐' },
  ]

  const alarmPopup = ringing && (
    <>
      <div className="alarm-overlay" onClick={dismissAlarm} />
      <div className="alarm-notification">
        <h2>알람</h2>
        <p>{ringing}</p>
        <button className="action-btn primary" onClick={dismissAlarm}>끄기</button>
      </div>
    </>
  )

  if (isFullscreen) {
    return (
      <div className={`app-fullscreen${light ? ' light' : ''}`} style={style}>
        <div className="fullscreen-brand">
          <span className="fs-brand-main">Euna Flow</span>
          <span className="fs-brand-sub">집중의 시간</span>
        </div>
        <div className="fullscreen-controls">
          <button className="fs-ctrl-btn" onClick={handleZoomOut} title="축소">−</button>
          <button className="fs-ctrl-btn" onClick={handleZoomIn} title="확대">+</button>
          <button className="fs-ctrl-btn" onClick={toggleFullscreen} title="전체화면 종료">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="6,1 1,1 1,6" /><polyline points="10,15 15,15 15,10" />
              <polyline points="15,6 15,1 10,1" /><polyline points="1,10 1,15 6,15" />
            </svg>
          </button>
        </div>
        <div className="fullscreen-content">
          {activeTab === 'timer' && <Timer accent={accent} digital={settings.digitalDisplay} zoom={zoom} />}
          {activeTab === 'stopwatch' && <Stopwatch accent={accent} digital={settings.digitalDisplay} zoom={zoom} />}
          {activeTab === 'alarm' && <Alarm accent={accent} zoom={zoom} />}
          {activeTab === 'clock' && <Clock settings={settings} accent={accent} zoom={zoom} />}
        </div>
        {alarmPopup}
      </div>
    )
  }

  return (
    <div className={`app${light ? ' light' : ''}`} style={style}>
      <div className="header">
        <div className="header-brand">
          <span className="brand-main">Euna Flow</span>
          <span className="brand-sub">집중의 시간</span>
        </div>
        <div className="header-actions">
          <button
            className="header-btn theme-toggle-btn"
            onClick={() => updateSetting('lightMode', !settings.lightMode)}
            title={light ? '다크 모드로 전환' : '라이트 모드로 전환'}
          >
            <ThemeIcon />
          </button>
          <button
            className="header-btn"
            onClick={() => setSettingsOpen(true)}
            title="설정"
          >
            ⚙
          </button>
        </div>
      </div>
      <div className="body">
      <div className="sidebar">
        <div className="sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`sidebar-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="icon">{tab.icon}</span>
              <span className="sidebar-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="main">
        <div className="content">
          <div className="content-controls">
            <button className="content-ctrl-btn" onClick={openMiniWindow} title="미니창">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="14" height="10" rx="1.5" />
                <rect x="8" y="6" width="7" height="5" rx="1" strokeWidth="1.5" fill="currentColor" opacity="0.3" />
              </svg>
            </button>
            <button className="content-ctrl-btn" onClick={handleZoomOut} title="축소">−</button>
            <button className="content-ctrl-btn" onClick={handleZoomIn} title="확대">+</button>
            <button
              className="content-ctrl-btn"
              onClick={toggleFullscreen}
              title="전체화면"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="1,6 1,1 6,1" /><polyline points="15,10 15,15 10,15" />
                <polyline points="10,1 15,1 15,6" /><polyline points="6,15 1,15 1,10" />
              </svg>
            </button>
          </div>
          {activeTab === 'timer' && <Timer accent={accent} digital={settings.digitalDisplay} zoom={zoom} />}
          {activeTab === 'stopwatch' && <Stopwatch accent={accent} digital={settings.digitalDisplay} zoom={zoom} />}
          {activeTab === 'alarm' && <Alarm accent={accent} zoom={zoom} />}
          {activeTab === 'clock' && <Clock settings={settings} accent={accent} zoom={zoom} />}
        </div>
      </div>
      </div>
      <footer className="footer">
        <a className="footer-link" href="https://duon.ai.kr/tools.html">← 수업 도구</a>
        <span className="footer-sep">·</span>
        <span>© 2026 EUNACLASS</span>
        <span className="footer-sep">·</span>
        <span>AI Learning Tools for Education</span>
      </footer>
      {alarmPopup}
      {settingsOpen && <div className="settings-overlay" onClick={() => setSettingsOpen(false)} />}
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        updateSetting={updateSetting}
        colors={COLORS}
      />
    </div>
  )
}

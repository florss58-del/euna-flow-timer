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

function loadState(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

const PASSCODE_HASH = '56b946435788e7c6f9b7802eb17f513f1eedecddfbc2b5e5eca5fc7db5f5f340'

async function hashPin(pin) {
  const data = new TextEncoder().encode(pin)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const tryUnlock = async (value) => {
    const hashed = await hashPin(value)
    if (hashed === PASSCODE_HASH) {
      sessionStorage.setItem('unlocked', 'true')
      onUnlock()
    } else {
      setError(true)
      setTimeout(() => { setPin(''); setError(false) }, 1000)
    }
  }

  const handleInput = (num) => {
    if (pin.length < 4) {
      const next = pin + num
      setPin(next)
      if (next.length === 4) tryUnlock(next)
    }
  }

  const handleKeyInput = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(val)
    if (val.length === 4) tryUnlock(val)
  }

  const handleDelete = () => setPin(prev => prev.slice(0, -1))

  return (
    <div className="lock-screen" onClick={() => inputRef.current?.focus()}>
      <div className="lock-box">
        <div className="lock-brand">Euna Flow</div>
        <div className="lock-sub">비밀번호를 입력하세요</div>
        <input
          ref={inputRef}
          className="lock-input"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={handleKeyInput}
          autoFocus
        />
        <div className={`lock-dots${error ? ' shake' : ''}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className={`lock-dot${i < pin.length ? ' filled' : ''}`} />
          ))}
        </div>
        <div className="lock-pad">
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((n, i) => (
            n === '' ? <div key={i} /> :
            n === '⌫' ? (
              <button key={i} className="lock-key" onClick={handleDelete}>⌫</button>
            ) : (
              <button key={i} className="lock-key" onClick={() => handleInput(String(n))}>{n}</button>
            )
          ))}
        </div>
        {error && <div className="lock-error">비밀번호가 틀렸습니다</div>}
      </div>
    </div>
  )
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('unlocked') === 'true')
  const [activeTab, setActiveTab] = useState(() => loadState('activeTab', 'timer'))
  const [settings, setSettings] = useState(() => loadState('settings', defaultSettings))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [zooms, setZooms] = useState(() => loadState('displayZooms', { alarm: 1, timer: 1, stopwatch: 1, clock: 1 }))
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />

  const tabs = [
    { id: 'alarm', label: '자명종', icon: '⏰' },
    { id: 'timer', label: '타이머', icon: '⏱' },
    { id: 'stopwatch', label: '스톱워치', icon: '🏁' },
    { id: 'clock', label: '시계', icon: '🕐' },
  ]

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

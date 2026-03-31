import { useState, useEffect, useCallback, useRef } from 'react'
import Timer from './components/Timer'
import Stopwatch from './components/Stopwatch'
import Alarm from './components/Alarm'
import Clock from './components/Clock'
import Settings from './components/Settings'

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

export default function App() {
  const [activeTab, setActiveTab] = useState(() => loadState('activeTab', 'timer'))
  const [settings, setSettings] = useState(() => loadState('settings', defaultSettings))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [zoom, setZoom] = useState(() => loadState('displayZoom', 1))
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    localStorage.setItem('activeTab', JSON.stringify(activeTab))
  }, [activeTab])

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem('displayZoom', JSON.stringify(zoom))
  }, [zoom])

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleZoomOut = () => setZoom(prev => Math.max(ZOOM_MIN, +(prev - ZOOM_STEP).toFixed(2)))
  const handleZoomIn = () => setZoom(prev => Math.min(ZOOM_MAX, +(prev + ZOOM_STEP).toFixed(2)))

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  const pipWindowRef = useRef(null)

  const openMiniTimer = useCallback(async () => {
    // Document PiP API - 항상 위에 고정
    if ('documentPictureInPicture' in window) {
      try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 300,
          height: 220,
        })
        pipWindowRef.current = pipWindow

        const style = pipWindow.document.createElement('style')
        style.textContent = `
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif;
          background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;
          height:100vh;user-select:none;overflow:hidden}
          .mini{display:flex;flex-direction:column;align-items:center;gap:8px}
          .label{font-size:14px;color:#999;font-weight:700;letter-spacing:3px}
          .time{font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif;font-size:56px;font-weight:700;
          letter-spacing:4px;color:#e0e0e0;
          background:linear-gradient(180deg,#e8e8e8 0%,#c0c0c0 100%);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          background-clip:text}
          .controls{display:flex;gap:10px;margin-top:4px}
          .btn{border:none;border-radius:10px;padding:8px 24px;font-size:14px;font-weight:700;
          cursor:pointer;color:#fff;transition:opacity 0.2s;letter-spacing:1px}
          .btn:hover{opacity:0.85}
          .start{background:#22c55e}.pause{background:#f97316}.reset{background:#d4a853}
          .blink{animation:blink .8s ease-in-out infinite}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
        `
        pipWindow.document.head.appendChild(style)

        // Pretendard 폰트 로드
        const fontLink = pipWindow.document.createElement('link')
        fontLink.rel = 'stylesheet'
        fontLink.href = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css'
        pipWindow.document.head.appendChild(fontLink)

        const container = pipWindow.document.createElement('div')
        container.className = 'mini'
        container.innerHTML = `
          <div class="label">타이머</div>
          <div class="time" id="display">00:00</div>
          <div class="controls">
            <button class="btn reset" id="resetBtn">재설정</button>
            <button class="btn start" id="toggleBtn">시작</button>
          </div>
        `
        pipWindow.document.body.appendChild(container)

        const display = pipWindow.document.getElementById('display')
        const toggleBtn = pipWindow.document.getElementById('toggleBtn')
        const resetBtn = pipWindow.document.getElementById('resetBtn')

        let timeLeft = 0, running = false, started = false, interval = null
        let inputMin = 5, inputSec = 0
        const bc = new BroadcastChannel('timer-sync')

        const fmt = (ms) => {
          const s = Math.floor(ms / 1000), m = Math.floor(s / 60)
          return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
        }

        const sync = () => {
          try {
            timeLeft = JSON.parse(localStorage.getItem('timerTimeLeft') || '0')
            started = JSON.parse(localStorage.getItem('timerStarted') || 'false')
            inputMin = JSON.parse(localStorage.getItem('timerInputMin') || '5')
            inputSec = JSON.parse(localStorage.getItem('timerInputSec') || '0')
            const wasRunning = JSON.parse(localStorage.getItem('timerRunning') || 'false')
            if (wasRunning && started && !running) {
              running = true
              interval = setInterval(tick, 10)
            }
            if (!wasRunning && running) {
              running = false
              clearInterval(interval)
            }
          } catch {}
        }

        const render = () => {
          display.textContent = fmt(started ? timeLeft : (inputMin * 60 + inputSec) * 1000)
          if (running && started && timeLeft > 0 && timeLeft <= 15000) {
            display.classList.add('blink')
          } else {
            display.classList.remove('blink')
          }
          if (running) { toggleBtn.textContent = '일시정지'; toggleBtn.className = 'btn pause' }
          else if (started) { toggleBtn.textContent = '계속'; toggleBtn.className = 'btn start' }
          else { toggleBtn.textContent = '시작'; toggleBtn.className = 'btn start' }
        }

        const tick = () => {
          if (timeLeft <= 10) {
            running = false; started = false; timeLeft = 0
            clearInterval(interval)
            localStorage.setItem('timerTimeLeft', '0')
            localStorage.setItem('timerStarted', 'false')
            localStorage.setItem('timerRunning', 'false')
            render(); return
          }
          timeLeft -= 10
          localStorage.setItem('timerTimeLeft', JSON.stringify(timeLeft))
          display.textContent = fmt(timeLeft)
        }

        const bcSend = (data) => { try { bc.postMessage(data) } catch {} }

        toggleBtn.addEventListener('click', () => {
          if (running) {
            running = false; clearInterval(interval)
            localStorage.setItem('timerRunning', 'false')
          } else {
            if (!started) {
              timeLeft = (inputMin * 60 + inputSec) * 1000
              if (timeLeft <= 0) return
              started = true
              localStorage.setItem('timerStarted', 'true')
            }
            running = true
            interval = setInterval(tick, 10)
            localStorage.setItem('timerRunning', 'true')
          }
          bcSend({ running, started, timeLeft, inputMin, inputSec })
          render()
        })

        resetBtn.addEventListener('click', () => {
          running = false; started = false; timeLeft = 0
          clearInterval(interval)
          localStorage.setItem('timerTimeLeft', '0')
          localStorage.setItem('timerStarted', 'false')
          localStorage.setItem('timerRunning', 'false')
          bcSend({ running: false, started: false, timeLeft: 0, inputMin, inputSec })
          render()
        })

        window.addEventListener('storage', (e) => {
          if (e.key && e.key.startsWith('timer')) { sync(); render() }
        })

        // BroadcastChannel - 메인 창과 실시간 동기화
        bc.onmessage = (e) => {
          const d = e.data
          if (d.timeLeft !== undefined) timeLeft = d.timeLeft
          if (d.started !== undefined) started = d.started
          if (d.inputMin !== undefined) inputMin = d.inputMin
          if (d.inputSec !== undefined) inputSec = d.inputSec
          if (d.running !== undefined) {
            if (d.running && !running) {
              running = true
              clearInterval(interval)
              interval = setInterval(tick, 10)
            } else if (!d.running && running) {
              running = false
              clearInterval(interval)
            }
          }
          render()
        }

        pipWindow.addEventListener('pagehide', () => {
          clearInterval(interval)
          bc.close()
          pipWindowRef.current = null
        })

        sync(); render()
        return
      } catch (e) {
        console.log('PiP failed, fallback to popup', e)
      }
    }

    // Fallback: 일반 팝업
    const w = 300, h = 220
    const left = window.screen.width - w - 20
    const popup = window.open('', 'miniTimer',
      `width=${w},height=${h},left=${left},top=20,resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no,alwaysRaised=yes`)
    if (!popup) return
    popup.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mini Timer</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Pretendard',sans-serif;background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden}
.mini{display:flex;flex-direction:column;align-items:center;gap:8px}
.label{font-size:14px;color:#999;font-weight:700;letter-spacing:3px}
.time{font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif;font-size:56px;font-weight:700;letter-spacing:4px;color:#e0e0e0;background:linear-gradient(180deg,#e8e8e8,#c0c0c0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.controls{display:flex;gap:10px;margin-top:4px}
.btn{border:none;border-radius:10px;padding:8px 24px;font-size:14px;font-weight:700;cursor:pointer;color:#fff}
.btn:hover{opacity:0.85}.start{background:#22c55e}.pause{background:#f97316}.reset{background:#d4a853}
.blink{animation:blink .8s ease-in-out infinite}@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
</style></head><body><div class="mini"><div class="label">타이머</div><div class="time" id="display">00:00</div>
<div class="controls"><button class="btn reset" id="resetBtn">재설정</button><button class="btn start" id="toggleBtn">시작</button></div></div>
<script>let tL=0,run=false,sta=false,iv=null,iM=5,iS=0;const d=document.getElementById('display'),tb=document.getElementById('toggleBtn'),rb=document.getElementById('resetBtn');
function f(ms){const s=Math.floor(ms/1000),m=Math.floor(s/60);return String(m).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function sy(){try{tL=JSON.parse(localStorage.getItem('timerTimeLeft')||'0');sta=JSON.parse(localStorage.getItem('timerStarted')||'false');iM=JSON.parse(localStorage.getItem('timerInputMin')||'5');iS=JSON.parse(localStorage.getItem('timerInputSec')||'0');var wr=JSON.parse(localStorage.getItem('timerRunning')||'false');if(wr&&sta&&!run){run=true;iv=setInterval(tk,10)}if(!wr&&run){run=false;clearInterval(iv)}}catch{}}
function rn(){d.textContent=f(sta?tL:(iM*60+iS)*1000);if(run&&sta&&tL>0&&tL<=15000){d.classList.add('blink')}else{d.classList.remove('blink')}if(run){tb.textContent='일시정지';tb.className='btn pause'}else if(sta){tb.textContent='계속';tb.className='btn start'}else{tb.textContent='시작';tb.className='btn start'}}
function tk(){if(tL<=10){run=false;sta=false;tL=0;clearInterval(iv);localStorage.setItem('timerTimeLeft','0');localStorage.setItem('timerStarted','false');localStorage.setItem('timerRunning','false');rn();return}tL-=10;localStorage.setItem('timerTimeLeft',JSON.stringify(tL));d.textContent=f(tL)}
sy();rn();window.addEventListener('storage',function(e){if(e.key&&e.key.startsWith('timer')){sy();rn()}});var bc2=new BroadcastChannel('timer-sync');bc2.onmessage=function(e){var dd=e.data;if(dd.timeLeft!==undefined)tL=dd.timeLeft;if(dd.started!==undefined)sta=dd.started;if(dd.inputMin!==undefined)iM=dd.inputMin;if(dd.inputSec!==undefined)iS=dd.inputSec;if(dd.running!==undefined){if(dd.running&&!run){run=true;clearInterval(iv);iv=setInterval(tk,10)}else if(!dd.running&&run){run=false;clearInterval(iv)}}rn()};tb.onclick=function(){if(run){run=false;clearInterval(iv);localStorage.setItem('timerRunning','false');bc2.postMessage({running:false,started:sta,timeLeft:tL,inputMin:iM,inputSec:iS})}else{if(!sta){tL=(iM*60+iS)*1000;if(tL<=0)return;sta=true;localStorage.setItem('timerStarted','true')}run=true;iv=setInterval(tk,10);localStorage.setItem('timerRunning','true');bc2.postMessage({running:true,started:sta,timeLeft:tL,inputMin:iM,inputSec:iS})}rn()};rb.onclick=function(){run=false;sta=false;tL=0;clearInterval(iv);localStorage.setItem('timerTimeLeft','0');localStorage.setItem('timerStarted','false');localStorage.setItem('timerRunning','false');bc2.postMessage({running:false,started:false,timeLeft:0,inputMin:iM,inputSec:iS});rn()}<\/script></body></html>`)
    popup.document.close()
  }, [])

  const accent = COLORS[settings.accentColor] || COLORS.blue
  const light = settings.lightMode
  const style = { '--accent-color': accent, '--display-zoom': zoom }

  const tabs = [
    { id: 'alarm', label: '자명종', icon: '⏰' },
    { id: 'timer', label: '타이머', icon: '⏱' },
    { id: 'stopwatch', label: '스톱워치', icon: '🏁' },
    { id: 'clock', label: '시계', icon: '🕐' },
  ]

  if (isFullscreen) {
    return (
      <div className={`app-fullscreen${light ? ' light' : ''}`} style={style}>
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
            <button className="content-ctrl-btn" onClick={openMiniTimer} title="미니 타이머 (항상 위)">
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

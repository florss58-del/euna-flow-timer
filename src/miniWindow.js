const FONT_URL = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css'

const COMMON_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif;
  background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;
  height:100vh;user-select:none;overflow:hidden}
  .mini{display:flex;flex-direction:column;align-items:center;gap:8px}
  .label{font-size:14px;color:#999;font-weight:700;letter-spacing:3px}
  .time{font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif;
  font-size:56px;font-weight:700;letter-spacing:4px;color:#e0e0e0;
  background:linear-gradient(180deg,#e8e8e8 0%,#c0c0c0 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .controls{display:flex;gap:10px;margin-top:4px}
  .btn{border:none;border-radius:10px;padding:8px 24px;font-size:14px;font-weight:700;
  cursor:pointer;color:#fff;transition:opacity 0.2s;letter-spacing:1px}
  .btn:hover{opacity:0.85}
  .start{background:#22c55e}.pause{background:#f97316}.reset{background:#d4a853}
  .stop{background:#ef4444}.lap{background:#3b82f6}
  .blink{animation:blink .8s ease-in-out infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
  .brand{position:absolute;top:8px;left:12px;display:flex;align-items:baseline;gap:6px}
  .brand-main{font-size:12px;font-weight:800;color:rgba(255,255,255,0.5)}
  .brand-sub{font-size:9px;font-weight:600;color:rgba(255,255,255,0.3)}
  .clock-row{display:flex;align-items:baseline;justify-content:center;gap:8px}
  .ampm{font-size:20px;color:#999;font-weight:600}
  .date-text{font-size:14px;color:#666;margin-top:4px}
  .alarm-list{width:260px;max-height:160px;overflow-y:auto}
  .alarm-row{display:flex;justify-content:space-between;align-items:center;
  padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.06);margin-bottom:4px}
  .alarm-row.off{opacity:0.3}
  .alarm-t{font-size:24px;font-weight:700;letter-spacing:2px}
  .alarm-dot{width:8px;height:8px;border-radius:50%}
  .no-alarm{color:#666;font-size:14px;text-align:center;padding:20px}
`

const BRAND = '<div class="brand"><span class="brand-main">Euna Flow</span><span class="brand-sub">집중의 시간</span></div>'

export const TAB_SIZES = {
  alarm: { w: 300, h: 260 },
  timer: { w: 300, h: 220 },
  stopwatch: { w: 300, h: 220 },
  clock: { w: 300, h: 170 },
}

function setupBase(pipWindow) {
  const style = pipWindow.document.createElement('style')
  style.textContent = COMMON_CSS
  pipWindow.document.head.appendChild(style)

  const fontLink = pipWindow.document.createElement('link')
  fontLink.rel = 'stylesheet'
  fontLink.href = FONT_URL
  pipWindow.document.head.appendChild(fontLink)

  const container = pipWindow.document.createElement('div')
  container.className = 'mini'
  return container
}

// ─── 타이머 ───
function buildTimer(pipWindow, container, pipWindowRef) {
  container.innerHTML = `
    ${BRAND}
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
        running = true; interval = setInterval(tick, 10)
      }
      if (!wasRunning && running) {
        running = false; clearInterval(interval)
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

  pipWindow.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('timer')) { sync(); render() }
  })

  bc.onmessage = (e) => {
    const d = e.data
    if (d.timeLeft !== undefined) timeLeft = d.timeLeft
    if (d.started !== undefined) started = d.started
    if (d.inputMin !== undefined) inputMin = d.inputMin
    if (d.inputSec !== undefined) inputSec = d.inputSec
    if (d.running !== undefined) {
      if (d.running && !running) {
        running = true; clearInterval(interval); interval = setInterval(tick, 10)
      } else if (!d.running && running) {
        running = false; clearInterval(interval)
      }
    }
    render()
  }

  pipWindow.addEventListener('pagehide', () => {
    clearInterval(interval); bc.close(); pipWindowRef.current = null
  })

  sync(); render()
}

// ─── 스톱워치 ───
function buildStopwatch(pipWindow, container, pipWindowRef) {
  container.innerHTML = `
    ${BRAND}
    <div class="label">스톱워치</div>
    <div class="time" style="font-size:48px" id="display">00:00.00</div>
    <div class="controls">
      <button class="btn reset" id="resetBtn">재설정</button>
      <button class="btn lap" id="lapBtn" style="display:none">랩</button>
      <button class="btn start" id="toggleBtn">시작</button>
    </div>
  `
  pipWindow.document.body.appendChild(container)

  const display = pipWindow.document.getElementById('display')
  const toggleBtn = pipWindow.document.getElementById('toggleBtn')
  const resetBtn = pipWindow.document.getElementById('resetBtn')
  const lapBtn = pipWindow.document.getElementById('lapBtn')

  let elapsed = 0, running = false, interval = null
  const bc = new BroadcastChannel('stopwatch-sync')

  const fmt = (ms) => {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60)
    const cs = Math.floor((ms % 1000) / 10)
    return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') + '.' + String(cs).padStart(2, '0')
  }

  const sync = () => {
    try {
      elapsed = JSON.parse(localStorage.getItem('swElapsed') || '0')
      const wasRunning = JSON.parse(localStorage.getItem('swRunning') || 'false')
      if (wasRunning && !running) {
        running = true; interval = setInterval(tick, 10)
      }
      if (!wasRunning && running) {
        running = false; clearInterval(interval)
      }
    } catch {}
  }

  const render = () => {
    display.textContent = fmt(elapsed)
    lapBtn.style.display = running ? '' : 'none'
    if (running) { toggleBtn.textContent = '정지'; toggleBtn.className = 'btn stop' }
    else { toggleBtn.textContent = '시작'; toggleBtn.className = 'btn start' }
  }

  const tick = () => {
    elapsed += 10
    localStorage.setItem('swElapsed', JSON.stringify(elapsed))
    display.textContent = fmt(elapsed)
  }

  const bcSend = (data) => { try { bc.postMessage(data) } catch {} }

  toggleBtn.addEventListener('click', () => {
    if (running) {
      running = false; clearInterval(interval)
      localStorage.setItem('swRunning', 'false')
    } else {
      running = true
      interval = setInterval(tick, 10)
      localStorage.setItem('swRunning', 'true')
    }
    bcSend({ running, elapsed })
    render()
  })

  resetBtn.addEventListener('click', () => {
    running = false; elapsed = 0
    clearInterval(interval)
    localStorage.setItem('swElapsed', '0')
    localStorage.setItem('swRunning', 'false')
    localStorage.setItem('swLaps', '[]')
    bcSend({ reset: true })
    render()
  })

  lapBtn.addEventListener('click', () => {
    try {
      const laps = JSON.parse(localStorage.getItem('swLaps') || '[]')
      laps.unshift(fmt(elapsed))
      localStorage.setItem('swLaps', JSON.stringify(laps))
      bcSend({ laps })
    } catch {}
  })

  pipWindow.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('sw')) { sync(); render() }
  })

  bc.onmessage = (e) => {
    const d = e.data
    if (d.elapsed !== undefined) elapsed = d.elapsed
    if (d.running !== undefined) {
      if (d.running && !running) {
        running = true; clearInterval(interval); interval = setInterval(tick, 10)
      } else if (!d.running && running) {
        running = false; clearInterval(interval)
      }
    }
    if (d.reset) { running = false; elapsed = 0; clearInterval(interval) }
    render()
  }

  pipWindow.addEventListener('pagehide', () => {
    clearInterval(interval); bc.close(); pipWindowRef.current = null
  })

  sync(); render()
}

// ─── 시계 ───
function buildClock(pipWindow, container, pipWindowRef) {
  container.innerHTML = `
    ${BRAND}
    <div class="label">시계</div>
    <div class="clock-row">
      <span class="ampm" id="ampm"></span>
      <div class="time" style="font-size:48px" id="display">00:00:00</div>
    </div>
    <div class="date-text" id="dateText"></div>
  `
  pipWindow.document.body.appendChild(container)

  const display = pipWindow.document.getElementById('display')
  const ampmEl = pipWindow.document.getElementById('ampm')
  const dateEl = pipWindow.document.getElementById('dateText')

  const update = () => {
    const now = new Date()
    let s
    try { s = JSON.parse(localStorage.getItem('settings') || '{}') } catch { s = {} }
    let h = now.getHours()
    const min = String(now.getMinutes()).padStart(2, '0')
    const sec = String(now.getSeconds()).padStart(2, '0')

    if (s.use12Hour) {
      ampmEl.textContent = h < 12 ? '오전' : '오후'
      ampmEl.style.display = ''
      h = h % 12 || 12
    } else {
      ampmEl.style.display = 'none'
    }
    display.textContent = `${String(h).padStart(2, '0')}:${min}:${sec}`

    if (s.showDate !== false) {
      const weekDays = ['일', '월', '화', '수', '목', '금', '토']
      dateEl.textContent = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${weekDays[now.getDay()]}요일`
      dateEl.style.display = ''
    } else {
      dateEl.style.display = 'none'
    }
  }

  update()
  const interval = setInterval(update, 1000)

  pipWindow.addEventListener('pagehide', () => {
    clearInterval(interval); pipWindowRef.current = null
  })
}

// ─── 자명종 ───
function buildAlarm(pipWindow, container, pipWindowRef) {
  container.innerHTML = `
    ${BRAND}
    <div class="label">자명종</div>
    <div class="alarm-list" id="alarmList"></div>
  `
  pipWindow.document.body.appendChild(container)

  const listEl = pipWindow.document.getElementById('alarmList')

  const renderAlarms = () => {
    try {
      const alarms = JSON.parse(localStorage.getItem('alarms') || '[]')
      if (alarms.length === 0) {
        listEl.innerHTML = '<div class="no-alarm">알람이 없습니다</div>'
        return
      }
      listEl.innerHTML = alarms.map(a => `
        <div class="alarm-row${a.enabled ? '' : ' off'}">
          <span class="alarm-t">${a.time}</span>
          <span class="alarm-dot" style="background:${a.enabled ? '#22c55e' : '#666'}"></span>
        </div>
      `).join('')
    } catch {
      listEl.innerHTML = '<div class="no-alarm">알람이 없습니다</div>'
    }
  }

  renderAlarms()

  pipWindow.addEventListener('storage', (e) => {
    if (e.key === 'alarms') renderAlarms()
  })

  pipWindow.addEventListener('pagehide', () => {
    pipWindowRef.current = null
  })
}

// ─── 메인 빌더 ───
export function buildMiniContent(pipWindow, activeTab, pipWindowRef) {
  const container = setupBase(pipWindow)

  switch (activeTab) {
    case 'timer': buildTimer(pipWindow, container, pipWindowRef); break
    case 'stopwatch': buildStopwatch(pipWindow, container, pipWindowRef); break
    case 'clock': buildClock(pipWindow, container, pipWindowRef); break
    case 'alarm': buildAlarm(pipWindow, container, pipWindowRef); break
  }
}
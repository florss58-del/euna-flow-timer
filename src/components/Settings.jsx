const COLOR_NAMES = {
  gray: '회색',
  orange: '주황',
  red: '빨강',
  green: '초록',
  blue: '파랑',
}

export default function Settings({ open, onClose, settings, updateSetting, colors }) {
  return (
    <div className={`settings-panel${open ? ' open' : ''}`}>
      <button className="settings-close" onClick={onClose}>✕</button>
      <div className="settings-title">설정</div>

      <div className="settings-section">
        <div className="settings-row">
          <span className="settings-row-label">디지털 표시</span>
          <button
            className={`toggle${settings.digitalDisplay ? ' on' : ''}`}
            onClick={() => updateSetting('digitalDisplay', !settings.digitalDisplay)}
          />
        </div>
        <div className="settings-row">
          <span className="settings-row-label">12시간 표시</span>
          <button
            className={`toggle${settings.use12Hour ? ' on' : ''}`}
            onClick={() => updateSetting('use12Hour', !settings.use12Hour)}
          />
        </div>
        <div className="settings-row">
          <span className="settings-row-label">날짜 표시</span>
          <button
            className={`toggle${settings.showDate ? ' on' : ''}`}
            onClick={() => updateSetting('showDate', !settings.showDate)}
          />
        </div>
        <div className="settings-row">
          <span className="settings-row-label">라이트 모드</span>
          <button
            className={`toggle${settings.lightMode ? ' on' : ''}`}
            onClick={() => updateSetting('lightMode', !settings.lightMode)}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-label">색상 선택</div>
        <div className="color-options">
          {Object.entries(colors).map(([key, color]) => (
            <button
              key={key}
              className={`color-swatch${settings.accentColor === key ? ' selected' : ''}`}
              style={{ background: color }}
              title={COLOR_NAMES[key]}
              onClick={() => updateSetting('accentColor', key)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

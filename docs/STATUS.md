# Euna Flow 타이머 — 현재 상태

최종 갱신: 2026-07-12

## 한 줄 요약

Vite + React 시계·타이머 웹앱 “Euna Flow”. https://timer.duon.ai.kr 에서 서비스 중이고,
`duon.ai.kr/tools.html`(EUNACLASS 수업 도구)의 타이머 카드에서 연결된다. **잠금 없이 누구나 쓰는 공개 도구다.**

## 배포 구조

| 항목 | 값 |
|---|---|
| 정본 접속 주소 | **https://timer.duon.ai.kr** |
| Vercel 계정 | florss58-del (florss58@gmail.com) |
| Vercel 프로젝트 | `euna-flow-timer-w8j9` |
| GitHub 저장소 | https://github.com/florss58-del/euna-flow-timer (master) |
| 배포 방식 | master push 시 Vercel 자동 배포 |
| 연결된 페이지 | duon.ai.kr/tools.html (소스 `Y:\claude\test`, CLI 수동 배포) |

### Vercel 접근 방법

- claude.ai Vercel 커넥터는 **mintorain 계정**이라 이 프로젝트가 보이지 않는다. 없다고 착각하기 쉽다
- `vercel login`은 컴퓨터 이름이 한글이라 크래시한다
- 토큰으로 우회: `C:\Users\EunaKim\.claude\projects\y--claude-test\.vercel-token` (C: 로컬에만 있다)
  ```bash
  export VERCEL_TOKEN=$(tr -d ' \r\n' < "C:/Users/EunaKim/.claude/projects/y--claude-test/.vercel-token")
  vercel project ls --token "$VERCEL_TOKEN"
  ```
- 프로젝트 삭제는 CLI가 프롬프트 때문에 실패한다. REST API `DELETE /v9/projects/{id}`를 쓸 것

## 기능 구성

4개 탭 — 자명종·타이머·스톱워치·시계.

- **공통**: 탭별 독립 확대·축소(0.5–2.0배), 전체화면, 미니창, 라이트·다크 모드, 강조색(기본 브랜드 퍼플)
- **타이머**: 프리셋 1·3·5·10분, 도는 동안 화면 절전 방지, 브라우저 탭 제목에 남은 시간 표시
- **자명종**: 감시가 `App`에 있어 어느 탭에 있든 울린다
- **미니창**: Document Picture-in-Picture API. 미지원 브라우저는 팝업으로 폴백
- **상태 저장**: localStorage (활성 탭·설정·확대 배율·타이머·스톱워치·알람)

### 시간은 벽시계로 잰다 (2026-07-12 전면 수정)

`setInterval` 호출 횟수로 세지 않는다. 타이머는 마감 시각, 스톱워치는 시작 시각을 기록해 두고
`Date.now()`와의 차이로 계산한다. 브라우저가 배경 탭의 타이머를 늦춰도 시간이 어긋나지 않는다.
자세한 배경은 프로젝트 `CLAUDE.md`의 “시간은 반드시 벽시계로 잰다” 항목에 있다.

## 파일 구조

```
src/
  App.jsx          앱 셸 · 탭 전환 · 자명종 감시 · 탭 제목 · 라인 아이콘 · 전체화면 · 미니창 진입
  miniWindow.js    미니창 DOM 생성 (탭별 크기 · 내용)
  App.css          전체 스타일
  main.jsx         진입점
  components/
    Timer.jsx  Stopwatch.jsx  Alarm.jsx  Clock.jsx  Settings.jsx
public/            favicon.svg · og-image.png (사이트에 그대로 배포된다)
tools/             og-image-generator.html (내부 도구. 배포 안 됨)
```

## 알려진 사항

- **로컬 빌드**: `Y:` 드라이브가 NAS 마운트라 Vite가 실제 경로를 찾다 실패한다.
  `vite.config.js`의 `preserveSymlinks: true`로 해결해 두었다. 지우지 말 것
- **기존 사용자 화면**: 브랜드 퍼플로 바꾸기 전에 타이머를 쓴 브라우저는 localStorage에 예전 설정(파랑)이 남아 있다.
  설정에서 바꾸거나 시크릿 창으로 열어야 새 기본값이 보인다. 버그가 아니다

## 다음 할 일

1. **자명종 실동작 확인** — 다른 탭에 둔 채 알람이 울리는지. 코드는 고쳤지만 실제 시각을 기다리는 검증은 아직 못 했다
2. **미니창 글꼴 통일 여부** — 본 화면은 Roboto Mono, 미니창은 Pretendard 은색 그러데이션. 미결
3. 수업에서 써 보고 필요한 기능 추가 (알람 정지 버튼, 소리 크기 등)

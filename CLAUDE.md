# Euna Flow 타이머 — 프로젝트 규칙

> 공통 규칙은 `Y:\claude\CLAUDE.md`에 있다. 충돌 시 이 파일이 우선한다.

## 프로젝트 개요

Vite + React 시계·타이머 웹앱. 자명종·타이머·스톱워치·시계 4탭 구조.
현재 상태와 배포 정보는 `docs/STATUS.md`를 먼저 읽을 것.

## 기술 스택

- Vite 5 + React (JSX, TypeScript 아님)
- 상태 관리 라이브러리 없음. `useState` + localStorage로 충분한 규모
- 스타일은 `src/App.css` 한 파일. CSS 변수 `--accent-color`, `--display-zoom`으로 테마·확대 제어

## 배포

| | |
|---|---|
| 정본 주소 | https://timer.duon.ai.kr |
| Vercel 프로젝트 | `euna-flow-timer-w8j9` (계정: florss58-del) |
| GitHub | florss58-del/euna-flow-timer (master) |

master에 push하면 Vercel이 자동 배포한다. 배포 후 "안 바뀌었다" 싶으면 **다시 배포하지 말고** 캐시버스터를 붙여 서버 응답부터 확인할 것 (공통 규칙 3항).

Vercel CLI는 `vercel login`이 크래시하므로 토큰을 쓴다. 위치와 사용법은 `docs/STATUS.md` 참고.

`duon.ai.kr/tools.html`(수업 도구)의 타이머 카드에서 이 사이트로 연결된다. 그 사이트 소스는 `Y:\claude\test`이고
GitHub 연결이 없어 **CLI로 수동 배포**한다(`vercel deploy --prod --token`).

## 코드 규칙

- 컴포넌트는 `src/components/`에 한 파일씩. props로 `accent`, `zoom`을 받아 표시를 조절한다
- 미니창 DOM은 React가 아니라 `src/miniWindow.js`에서 직접 문자열로 만든다. Picture-in-Picture 창은 별도 document라 React 트리 밖이다
- localStorage 키: `activeTab`, `settings`, `displayZooms`, `timer*`, `sw*`, `alarms`

## 시간은 반드시 벽시계로 잰다 ★

**`setInterval` 호출 횟수로 시간을 세지 말 것.** 브라우저는 보이지 않는 탭의 타이머를 1초 이상으로 늦춘다.
탭을 전환하면 시간이 실제보다 훨씬 느리게 흐르고, 타이머는 0에 도달하지 못해 알람도 울리지 않는다.

- 타이머: 마감 시각(`timerDeadline`)을 못 박고 `deadline − Date.now()`로 남은 시간을 구한다
- 스톱워치: 시작 시각(`swStartAt`)과 `Date.now()`의 차이로 경과를 구한다
- `setInterval`은 **화면을 다시 그리는 용도로만** 쓴다

**시각에 반응하는 기능은 탭 컴포넌트가 아니라 `App`에 둔다.** 자명종 감시를 `Alarm.jsx`에 두었더니
다른 탭으로 옮기는 순간 React가 컴포넌트를 떼어내면서 검사도 멈췄다(2026-07-12 수정).

## 공개 도구다

수업 도구로 공개돼 있다. 누구나 들어온다.

- 잠금화면·비밀번호를 다시 넣지 말 것 (2026-07-12 제거). 클라이언트 잠금은 보안이 아니라 가림막일 뿐이다
- DevTools·우클릭 차단을 넣지 말 것 (2026-07-12 제거). 우회는 쉽고 학생 불편만 남는다
- 내부 도구(예: OG 이미지 생성기)는 `public/`이 아니라 `tools/`에 둔다. `public/`은 사이트에 그대로 배포된다

## 디자인

EUNACLASS 본사이트(duon.ai.kr)와 시각 언어를 맞춘다. 공통 규칙 `Y:\claude\CLAUDE.md` 3항을 따른다.

- **UI 아이콘에 이모지를 쓰지 않는다.** 라인 아이콘(인라인 SVG)만 쓴다
  `App.jsx`의 `LineIcon` 래퍼 사용. 규격: `24x24 / stroke=currentColor / 굵기 1.75 / 둥근 끝단`
  새 아이콘이 필요하면 본사이트 `Y:\claude\test\js\icons.js`(40종)에서 먼저 찾을 것
- **강조색 기본은 브랜드 퍼플 `#af88ff`.** 팔레트에 teal `#5ae4d0`도 있다
- **예외**: 시작(초록)·재설정(주황)은 만국 공통 의미색이라 브랜드 색으로 바꾸지 않는다
- 색 코드를 일괄 치환할 때 **`COLORS` 팔레트까지 먹지 않도록 주의** (2026-07-12에 실제로 사고)

## 작업 이력

- 2026-07-12 — 브랜드 통일: 사이드바 이모지 → 라인 아이콘, 강조색 파랑 → 퍼플. 기능은 무변경 → [로그](docs/sessions/2026-07-12.md)
- 2026-07-12 — 시간 정확도(벽시계 기준)·자명종 버그 수정, 잠금 해제, 수업 도구 페이지 연결, Vercel 중복 정리 → [로그](docs/sessions/2026-07-12.md)
- 2026-07-11 — Vercel 중복 프로젝트 2개 확인(내용 동일), 프로젝트 문서 신규 정비 → [로그](docs/sessions/2026-07-11.md)

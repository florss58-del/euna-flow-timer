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

**주의**: 같은 저장소에 Vercel 프로젝트가 두 개 연결돼 있어 push 한 번에 빌드가 두 번 돈다. 정리 대기 중.

## 코드 규칙

- 컴포넌트는 `src/components/`에 한 파일씩. props로 `accent`, `zoom`을 받아 표시를 조절한다
- 미니창 DOM은 React가 아니라 `src/miniWindow.js`에서 직접 문자열로 만든다. Picture-in-Picture 창은 별도 document라 React 트리 밖이다
- localStorage 키: `activeTab`, `settings`, `displayZooms`. sessionStorage 키: `unlocked`

## 잠금화면에 대해

`src/App.jsx`의 `PASSCODE_HASH`는 클라이언트 번들에 그대로 노출된다. 4자리 숫자는 1만 가지라 해시를 확보하면 역산된다.
**이건 서버 인증이 아니라 가림막이다.** 실제 보안이 필요한 데이터를 앱에 넣지 말 것. 필요해지면 서버 인증으로 교체한다.

## 작업 이력

- 2026-07-11 — Vercel 중복 프로젝트 2개 확인(내용 동일), 프로젝트 문서 신규 정비 → [로그](docs/sessions/2026-07-11.md)

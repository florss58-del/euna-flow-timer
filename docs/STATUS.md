# Euna Flow 타이머 — 현재 상태

최종 갱신: 2026-07-11

## 한 줄 요약

Vite + React로 만든 시계·타이머 웹앱 "Euna Flow". 기능은 완성 상태이고 프로덕션은 https://timer.duon.ai.kr 에서 서비스 중이다.

## 배포 구조 (2026-07-11 확인)

| 항목 | 값 |
|---|---|
| 정본 접속 주소 | **https://timer.duon.ai.kr** |
| Vercel 계정 | florss58-del (florss58@gmail.com) |
| Vercel 프로젝트 | `euna-flow-timer-w8j9` (커스텀 도메인 보유) |
| GitHub 저장소 | https://github.com/florss58-del/euna-flow-timer (master) |
| 배포 방식 | master push 시 Vercel 자동 배포 |
| 현재 배포 커밋 | `56f8ca4` Security: hash passcode + block DevTools access |

### 해결됨 — Vercel 프로젝트 중복 (2026-07-11 정리)

같은 GitHub 저장소에 Vercel 프로젝트 두 개가 연결돼 push 한 번에 빌드가 두 번 돌았다.
두 배포의 JS 번들 md5가 동일(`0510e9f3bd3afb39fc823b37b979e060`)해 내용 차이 없는 순수 중복이었다.
3월 31일 23:31과 23:34, 3분 간격으로 만들어진 걸 보면 최초 배포 시 프로젝트가 두 번 생성된 것으로 보인다.

중복이던 `euna-flow-timer`(euna-flow-timer.vercel.app)를 삭제했다. `timer.duon.ai.kr` 정상 동작을 확인했다.
CLI `vercel project rm`은 확인 프롬프트 때문에 비대화형 환경에서 실패한다. REST API `DELETE /v9/projects/{id}`를 쓸 것.

### Vercel 접근 방법

- claude.ai Vercel 커넥터는 **mintorain 계정**에 연결돼 있어 이 프로젝트가 보이지 않는다
- `vercel login`은 컴퓨터 이름이 한글이라 크래시한다 (공통 규칙 문서 참고)
- 토큰으로 우회: `C:\Users\EunaKim\.claude\projects\y--claude-test\.vercel-token`
  ```bash
  export VERCEL_TOKEN=$(tr -d ' \r\n' < "C:/Users/EunaKim/.claude/projects/y--claude-test/.vercel-token")
  vercel project ls --token "$VERCEL_TOKEN"
  ```
- 토큰은 C: 로컬에만 있다. 노트북을 바꾸면 재발급해야 한다

## 기능 구성

4개 탭 구조 — 자명종·타이머·스톱워치·시계.

- **공통**: 탭별 독립 확대·축소(0.5–2.0배), 전체화면, 미니창, 라이트·다크 모드, 강조색 5종
- **미니창**: Document Picture-in-Picture API 사용. 미지원 브라우저는 일반 팝업으로 폴백. 현재 탭 내용을 그대로 띄운다
- **상태 저장**: localStorage에 활성 탭·설정·탭별 확대 배율 보관
- **잠금화면**: 4자리 패스코드. SHA-256 해시로 비교하고 4자리 입력 즉시 자동 해제. 해제 상태는 sessionStorage에 저장돼 탭을 닫으면 다시 잠긴다

### 잠금화면의 성격 (중요)

패스코드 해시와 검증 로직이 **모두 클라이언트 번들 안에** 있다. 브라우저에서 번들을 열면 해시를 볼 수 있고, 4자리 숫자는 1만 가지뿐이라 해시를 알면 즉시 역산된다. 이건 서버 인증이 아니라 **어깨너머 훔쳐보기를 막는 수준의 가림막**이다. 실제 보안이 필요해지면 서버 인증으로 바꿔야 한다.

## 파일 구조

```
src/
  App.jsx          앱 셸 · 탭 전환 · 잠금화면 · 전체화면 · 미니창 진입
  miniWindow.js    미니창 DOM 생성 (탭별 크기 · 내용)
  App.css          전체 스타일
  main.jsx         진입점 · DevTools 차단
  components/
    Timer.jsx  Stopwatch.jsx  Alarm.jsx  Clock.jsx  Settings.jsx
public/            favicon.svg · og-image.png · og-image 소스들
```

## 커밋 안 된 로컬 변경

작업하다 만 상태로 남아 있다. 이 PC의 로컬 폴더에만 있다.

- `package.json` — `canvas` 개발 의존성 추가
- `public/og-image.png.html` — 신규 파일. 공유용 OG 썸네일을 만들려던 흔적
- `package-lock.json` — 미추적

`public/og-image.png`는 이미 커밋돼 있고 배포에도 들어가 있다. 위 변경은 그 이미지를 다시 만들려던 시도로 보인다. 마무리하거나 되돌릴지 정해야 한다.

## duon.ai.kr 수업 도구 페이지 연결 (진행 중)

`Y:\claude\test`(= duon.ai.kr 사이트)의 `tools.html`에서 타이머 카드를 COMING SOON 비활성 박스에서
`https://timer.duon.ai.kr`로 가는 LIVE 링크 카드로 바꿔 두었다. 설명도 실제 기능(4탭·전체화면·미니창)에 맞게 고쳤다.
기존 설명은 "25분 집중 + 5분 휴식 포모도로"였는데 앱에 없는 기능이었다.

**아직 배포하지 않았다.** 타이머에 잠금화면이 걸려 있어, 지금 배포하면 수업 도구에서 링크를 눌러도
비밀번호 벽에 막힌다. **잠금 해제와 함께 배포할 것.** (`Y:\claude\test`는 GitHub 연결이 없어 CLI 수동 배포)

## 다음 할 일

1. 잠금화면 해제 (은아님이 추후 진행 예정) → 타이머 재배포 → `test/tools.html` 배포
2. 커밋 안 된 OG 이미지 작업 처리 — 완성 후 커밋하거나 폐기

# DNF TCG

풍진·카잔·케이트 중 한 명을 골라 봇과 대전하는 한국어 카드 게임입니다. 던전에서 몬스터를 사냥해 경험치를 모으고, 결투장에서 상대 리더에게 다섯 번째 히트를 주면 승리합니다. [브라우저에서 플레이](https://dnf-tcg-observer-20261020.gomdyoi.chatgpt.site/)

## 플레이와 분석

- 손패를 누르면 사용 조건과 예상 비용을 볼 수 있습니다. 사냥이나 결투를 고르면 전장의 화살표가 공격자와 대상을 연결합니다.
- 사냥 튜토리얼에서는 파티와 대상을 바꾸면서 결과를 비교할 수 있습니다. 분석 화면에서는 양쪽 손패, 봇의 선택 이유, 판정 기록을 살펴볼 수 있습니다.
- 반복 실험은 같은 시드로 기본 규칙과 실험 규칙을 비교합니다.

## 로컬 실행

Node.js 22.13 이상과 pnpm 11을 사용합니다. 공개 소스는 Vite로 실행하며 게임 상태와 시뮬레이션은 브라우저에서 처리합니다.

```sh
cd web
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm test
pnpm typecheck
pnpm build
```

게임 판정은 `web/src/engine`, 카드·덱은 `web/src/data`, 봇은 `web/src/bots`, 픽셀 전장과 조작 화면은 `web/src/components`에 있습니다. 개발 과정은 [판정 결정표](docs/RULE_DECISIONS.md), [튜토리얼 로드맵](docs/TUTORIAL_ROADMAP.md), [구현 기록](docs/IMPLEMENTATION.md)에 정리했습니다.

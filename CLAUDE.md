# 티켓파워 (ticket-power) — CLAUDE.md

> 기획 단계 뮤지컬 공연 판매 예측 서비스. 로그인 없는 공개 B2B 도구.

---

## 서비스 요약

KOPIS 52주 박스오피스 데이터로 학습한 OLS 선형회귀 모델로,
기획 단계(배우·공연장·기간·가격 확정 시점)에서 예상 관객수·매출을 시뮬레이션한다.

- **입력**: 좌석수, 공연 기간, 주당 회차, 가격, 제작사 등급, 공연장 등급, 배우 YouTube 채널
- **출력**: HIGH/MID/LOW 티어 + 예상 관객수 범위 + 예상 매출 범위
- **팬덤 스코어**: 배우 YouTube 구독자 수 → log scale 정규화 → 예측 보정

---

## 인프라

| 항목 | 값 |
|------|-----|
| 배포 | Vercel |
| 프레임워크 | Next.js (App Router, TypeScript) |
| YouTube API | YouTube Data API v3 |
| 모델 데이터 | `data/model.json` (KOPIS 52주 학습 결과) |
| 로그인 | 없음 (완전 공개) |
| DB | 없음 (stateless) |

## 크리덴셜

| 환경변수 | 용도 | 값 위치 |
|---------|------|--------|
| `YOUTUBE_API_KEY` | 배우 YouTube 채널 조회 | `.env.local` / Vercel 환경변수 |

- YouTube API Key 상세: `~/Documents/.credentials/maskit-credentials.md` §6-7
- 할당량: 10,000 유닛/일 (채널 조회 1유닛)

---

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx                 # 메인 시뮬레이터 UI (단일 페이지)
│   └── api/
│       ├── predict/route.ts     # 예측 API (POST)
│       └── cast-score/route.ts  # YouTube 채널 조회 API (POST)
├── components/
│   ├── CastInput.tsx            # 배우 추가 + YouTube 자동 조회
│   └── PredictionResult.tsx     # 예측 결과 카드
└── lib/
    ├── model.ts                 # OLS 예측 모델 로직
    └── youtube.ts               # YouTube Data API 연동
data/
└── model.json                   # 학습된 가중치 (sandbox/ticket-power에서 이식)
```

---

## 모델 정보

- **학습 데이터**: KOPIS 52주 뮤지컬 박스오피스 209개 공연
- **알고리즘**: OLS 선형회귀 (가우스 소거법)
- **피처**: [bias, 좌석, 기간, 제작사, 공연장, 내한보정, capacity, 가격]
- **성능**: Spearman 0.647 (5-Fold 평균), 관객수 오차 ±5~35%
- **점유율**: HIGH=82%, MID=62%, LOW=40%
- **팬덤 보정**: castFandomScore(0~1) → rawScore ±30점 조정

---

## 개발 명령

```bash
pnpm dev    # 로컬 실행 (localhost:3000)
pnpm build  # 빌드 확인
vercel      # Vercel 배포
```

## Phase 2 예정

- 포스터 업로드 → Gemini Vision API 자동 파싱
- Instagram 팔로워 수 수집
- 팬덤 피처 포함 모델 재학습

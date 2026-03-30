/**
 * 장르별 예측 파라미터
 * - occupancyByTier: HIGH/MID/LOW 예상 점유율
 * - fandomMultiplier: fandomBoost = (effectiveFandom - 0.5) × multiplier
 * - fandomWeights: YouTube / 뉴스버즈 / 데이터랩트렌드 가중치 합 = 1
 * - defaultCastFandom: 캐스트 미입력 시 기본값 (보수적)
 */

export type Genre = "musical" | "classical" | "pop_concert" | "play" | "opera";

export interface GenreConfig {
  label: string;
  occupancyByTier: { HIGH: number; MID: number; LOW: number };
  fandomMultiplier: number;
  fandomWeights: { youtube: number; news: number; trend: number };
  defaultCastFandom: number;
  hint: string;
}

export const GENRE_CONFIG: Record<Genre, GenreConfig> = {
  musical: {
    label: "뮤지컬",
    occupancyByTier: { HIGH: 0.82, MID: 0.62, LOW: 0.40 },
    fandomMultiplier: 150,
    fandomWeights: { youtube: 0.60, news: 0.20, trend: 0.20 },
    defaultCastFandom: 0.30,
    hint: "캐스트 팬덤이 흥행의 핵심 변수입니다",
  },
  classical: {
    label: "클래식/콘서트",
    occupancyByTier: { HIGH: 0.72, MID: 0.52, LOW: 0.32 },
    fandomMultiplier: 80,
    fandomWeights: { youtube: 0.20, news: 0.30, trend: 0.50 },
    defaultCastFandom: 0.35,
    hint: "네이버 검색 트렌드와 뉴스 화제성이 중심 지표입니다",
  },
  pop_concert: {
    label: "대중음악 콘서트",
    occupancyByTier: { HIGH: 0.90, MID: 0.72, LOW: 0.52 },
    fandomMultiplier: 200,
    fandomWeights: { youtube: 0.70, news: 0.15, trend: 0.15 },
    defaultCastFandom: 0.25,
    hint: "아티스트 YouTube 구독자 수가 가장 직접적인 지표입니다",
  },
  play: {
    label: "연극",
    occupancyByTier: { HIGH: 0.72, MID: 0.52, LOW: 0.32 },
    fandomMultiplier: 60,
    fandomWeights: { youtube: 0.15, news: 0.45, trend: 0.40 },
    defaultCastFandom: 0.35,
    hint: "작품 평판과 미디어 노출이 핵심입니다. 팬덤 영향 상대적으로 낮음",
  },
  opera: {
    label: "오페라",
    occupancyByTier: { HIGH: 0.65, MID: 0.48, LOW: 0.30 },
    fandomMultiplier: 50,
    fandomWeights: { youtube: 0.10, news: 0.30, trend: 0.60 },
    defaultCastFandom: 0.35,
    hint: "니치 장르 특성상 점유율 기대치가 보수적으로 설정됩니다",
  },
};

export const GENRE_OPTIONS: { value: Genre; label: string }[] = [
  { value: "musical", label: "뮤지컬" },
  { value: "classical", label: "클래식/콘서트" },
  { value: "pop_concert", label: "대중음악 콘서트" },
  { value: "play", label: "연극" },
  { value: "opera", label: "오페라" },
];

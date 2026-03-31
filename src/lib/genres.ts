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
  exampleTitle: string;   // 공연명 input placeholder
  exampleCast: string;    // 캐스트 검색 placeholder
  companyTierLabels: [string, string, string]; // 제작사 등급 0·1·2
  repertoireLabels: [string, string, string, string]; // 작품 등급 0·1·2·3
}

export const GENRE_CONFIG: Record<Genre, GenreConfig> = {
  musical: {
    label: "뮤지컬",
    occupancyByTier: { HIGH: 0.82, MID: 0.62, LOW: 0.40 },
    fandomMultiplier: 150,
    fandomWeights: { youtube: 0.60, news: 0.20, trend: 0.20 },
    defaultCastFandom: 0.30,
    hint: "캐스트 팬덤이 흥행의 핵심 변수입니다",
    exampleTitle: "예: 레미제라블, 데스노트, 엑스칼리버",
    exampleCast: "홍광호, 조승우, 김준수...",
    companyTierLabels: ["소형 (신생·소규모)", "중형 (쇼노트·신시 등)", "대형 (EMK·오디·CJ 등)"],
    repertoireLabels: ["신작/실험작", "알려진 작품", "대중적 명작", "세계적 명작"],
  },
  classical: {
    label: "클래식/콘서트",
    occupancyByTier: { HIGH: 0.72, MID: 0.52, LOW: 0.32 },
    fandomMultiplier: 80,
    fandomWeights: { youtube: 0.20, news: 0.30, trend: 0.50 },
    defaultCastFandom: 0.35,
    hint: "네이버 검색 트렌드와 뉴스 화제성이 중심 지표입니다",
    exampleTitle: "예: 베토벤 교향곡 9번, 조성진 리사이틀",
    exampleCast: "조성진, 임윤찬, 정명훈...",
    companyTierLabels: ["소형 (개인 기획·소규모)", "중형 (금호문화재단·크레디아 등)", "대형 (빈체로·마스트미디어 등)"],
    repertoireLabels: ["현대곡/초연", "소나타·실내악 소품", "인기 레퍼토리 (베토벤·드보르자크 등)", "대중 명곡 (사계·신세계·운명 등)"],
  },
  pop_concert: {
    label: "대중음악 콘서트",
    occupancyByTier: { HIGH: 0.90, MID: 0.72, LOW: 0.52 },
    fandomMultiplier: 200,
    fandomWeights: { youtube: 0.70, news: 0.15, trend: 0.15 },
    defaultCastFandom: 0.25,
    hint: "아티스트 YouTube 구독자 수가 가장 직접적인 지표입니다",
    exampleTitle: "예: 아이유 HEREH 콘서트, 세븐틴 투어",
    exampleCast: "아이유, BTS, 세븐틴...",
    companyTierLabels: ["소형 (인디·신인)", "중형 (중견 기획사)", "대형 (하이브·SM·YG 등)"],
    repertoireLabels: ["신인/인디", "알려진 아티스트", "인기 아티스트", "메가 아티스트"],
  },
  play: {
    label: "연극",
    occupancyByTier: { HIGH: 0.72, MID: 0.52, LOW: 0.32 },
    fandomMultiplier: 60,
    fandomWeights: { youtube: 0.15, news: 0.45, trend: 0.40 },
    defaultCastFandom: 0.35,
    hint: "작품 평판과 미디어 노출이 핵심입니다. 팬덤 영향 상대적으로 낮음",
    exampleTitle: "예: 햄릿, 고도를 기다리며, 1인용 식탁",
    exampleCast: "황정민, 박해일, 손현주...",
    companyTierLabels: ["소형 (소극장·소규모)", "중형 (중견 극단)", "대형 (국립극단·대학로 대형)"],
    repertoireLabels: ["신작/실험극", "알려진 작품", "대중적 명작 (햄릿·오이디푸스 등)", "국민 연극"],
  },
  opera: {
    label: "오페라",
    occupancyByTier: { HIGH: 0.65, MID: 0.48, LOW: 0.30 },
    fandomMultiplier: 50,
    fandomWeights: { youtube: 0.10, news: 0.30, trend: 0.60 },
    defaultCastFandom: 0.35,
    hint: "니치 장르 특성상 점유율 기대치가 보수적으로 설정됩니다",
    exampleTitle: "예: 라 트라비아타, 토스카, 마술피리",
    exampleCast: "연광철, 홍혜란, 김성현...",
    companyTierLabels: ["소형 (지역 오페라단·소규모)", "중형 (서울시오페라단 등)", "대형 (국립오페라단·예술의전당 자체)"],
    repertoireLabels: ["현대 오페라/초연", "알려진 레퍼토리", "인기 오페라 (라 트라비아타 등)", "세계적 명작 (마술피리·카르멘 등)"],
  },
};

export const GENRE_OPTIONS: { value: Genre; label: string }[] = [
  { value: "musical", label: "뮤지컬" },
  { value: "classical", label: "클래식/콘서트" },
  { value: "pop_concert", label: "대중음악 콘서트" },
  { value: "play", label: "연극" },
  { value: "opera", label: "오페라" },
];

/**
 * OLS 선형회귀 예측 모델 (v2)
 * - 13-feature 벡터 (장르 더미 포함)
 * - repertoireGrade: 레퍼토리/작품 브랜드 등급 (0~3)
 * - priceElasticityPenalty: 가격 탄력성 패널티 → occupancy에 차감
 */

import modelData from "../../data/model.json";
import { Genre, GENRE_CONFIG } from "./genres";

export type Tier = "HIGH" | "MID" | "LOW";
export type { Genre };

export interface ShowInput {
  seatcnt: number;
  periodDays: number;
  weeklyShows: number;
  priceAvg: number;
  priceMax: number;
  companyTier: 0 | 1 | 2;
  venueTier: 0 | 1 | 2;
  isImported: boolean;
  isTour: boolean;
  genre?: Genre;             // 장르 (기본값: musical)
  repertoireGrade?: number;  // 레퍼토리/작품 등급 0~3 (기본값: 0)
  castFandomScore?: number;  // 아티스트 팬덤 합산 스코어 (0~1 정규화)
  hasCast?: boolean;         // 캐스트 입력 여부
}

export interface PredictionResult {
  tier: Tier;
  occupancy: number;
  capacity: number;
  totalShows: number;
  audience: { min: number; expected: number; max: number };
  revenue: { min: number; expected: number; max: number };
  confidence: "low" | "mid" | "high";
  hasCast: boolean;
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

function buildFeatureVector(input: ShowInput): number[] {
  const capacity =
    input.seatcnt * Math.max(1, Math.round((input.periodDays / 7) * input.weeklyShows));
  const importedBonus = input.isImported ? 0.4 : 0;
  const tourPenalty = input.isTour ? -0.1 : 0;
  const f_cap_adj = input.isImported
    ? Math.min(1, capacity / 100000)
    : Math.min(1, capacity / 500000);

  const genre = input.genre ?? "musical";
  const repertoireGrade = input.repertoireGrade ?? 0;

  return [
    1,                                                             // bias
    Math.min(1, input.seatcnt / 3000),                            // 좌석
    Math.min(1, input.periodDays / 180),                          // 기간
    input.companyTier / 2,                                        // 제작사
    input.venueTier / 2,                                          // 공연장
    importedBonus + tourPenalty,                                   // 내한/투어보정
    f_cap_adj,                                                     // capacity
    Math.min(1, input.priceMax / 200000) * (input.isImported ? 0.5 : 1), // 가격
    repertoireGrade / 3,                                           // 레퍼토리등급
    genre === "musical"   ? 1 : 0,                                 // 장르_뮤지컬
    genre === "play"      ? 1 : 0,                                 // 장르_연극
    genre === "classical" ? 1 : 0,                                 // 장르_클래식
    genre === "opera"     ? 1 : 0,                                 // 장르_오페라
  ];
}

// 가격 탄력성 패널티 계산
function getPriceElasticityPenalty(priceMax: number, genre: Genre): number {
  if (!priceMax || priceMax <= 0) return 0;
  const m = modelData as any;
  const elasticity: number = m.priceElasticity?.[genre] ?? 0.10;
  const basePrice: number = m.priceBaseline?.[genre] ?? 130000;
  if (priceMax <= basePrice) return 0;
  const excess = (priceMax - basePrice) / basePrice;
  return Math.min(0.5, excess * elasticity);
}

export function predict(input: ShowInput): PredictionResult {
  const m = modelData as any;
  const weights: number[] = m.weights;

  // 임계값: model.json의 thresholds에서 로드
  const rawP70: number = m.thresholds?.rawP70 ?? m.rawP70 ?? 214;
  const rawP30: number = m.thresholds?.rawP30 ?? m.rawP30 ?? 46;

  const genreKey = input.genre ?? "musical";
  const genre = GENRE_CONFIG[genreKey];

  const capacity =
    input.seatcnt * Math.max(1, Math.round((input.periodDays / 7) * input.weeklyShows));
  const totalShows = Math.max(1, Math.round((input.periodDays / 7) * input.weeklyShows));

  const vec = buildFeatureVector(input);
  let rawScore = dotProduct(vec, weights);

  // 팬덤 스코어 보정 (장르별 multiplier 적용)
  const effectiveFandom = input.castFandomScore ?? genre.defaultCastFandom;
  const fandomBoost = (effectiveFandom - 0.5) * genre.fandomMultiplier;
  rawScore += fandomBoost;

  const hasCast = input.hasCast ?? false;
  const tier: Tier =
    rawScore >= rawP70 ? "HIGH" : rawScore <= rawP30 ? "LOW" : "MID";

  // 장르별 occupancy (model.json genreOccupancy 우선, fallback genres.ts)
  const genreOcc = m.genreOccupancy?.[genreKey];
  let occ = genreOcc ? genreOcc[tier] : genre.occupancyByTier[tier];

  // 가격 탄력성 패널티: occupancy에서 차감
  const pricePenalty = getPriceElasticityPenalty(input.priceMax, genreKey);
  occ = Math.max(0.05, occ - pricePenalty);

  // 신뢰도: 캐스트 없으면 low, 이름만이면 mid, YouTube 연결이면 high
  const confidence: PredictionResult["confidence"] =
    !hasCast ? "low"
    : input.castFandomScore !== undefined ? "high"
    : "mid";

  const expected = Math.round(capacity * occ);
  const min = Math.round(expected * 0.75);
  const max = Math.round(expected * 1.25);

  return {
    tier,
    occupancy: occ,
    capacity,
    totalShows,
    audience: { min, expected, max },
    revenue: {
      min: min * input.priceAvg,
      expected: expected * input.priceAvg,
      max: max * input.priceAvg,
    },
    confidence,
    hasCast,
  };
}

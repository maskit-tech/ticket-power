/**
 * OLS 선형회귀 예측 모델
 * sandbox/ticket-power/src/03-model.ts, 04-predict.ts 에서 이식
 */

import modelData from "../../data/model.json";

export type Tier = "HIGH" | "MID" | "LOW";

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
  castFandomScore?: number; // 배우 팬덤 합산 스코어 (0~1 정규화)
}

export interface PredictionResult {
  tier: Tier;
  occupancy: number;
  capacity: number;
  totalShows: number;
  audience: { min: number; expected: number; max: number };
  revenue: { min: number; expected: number; max: number };
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

function buildFeatureVector(input: ShowInput): number[] {
  const capacity =
    input.seatcnt * Math.round((input.periodDays / 7) * input.weeklyShows);
  const importedBonus = input.isImported ? 0.4 : 0;
  const tourPenalty = input.isTour ? -0.1 : 0;
  const f_cap_adj = input.isImported
    ? Math.min(1, capacity / 100000)
    : Math.min(1, capacity / 500000);

  return [
    1,
    Math.min(1, input.seatcnt / 3000),
    Math.min(1, input.periodDays / 180),
    input.companyTier / 2,
    input.venueTier / 2,
    importedBonus + tourPenalty,
    f_cap_adj,
    Math.min(1, input.priceMax / 200000) * (input.isImported ? 0.5 : 1),
  ];
}

// 학습 데이터 기반 rawScore 임계값 (모델 로드 시 한 번만 계산)
let _rawP70: number | null = null;
let _rawP30: number | null = null;

function getThresholds(): { rawP70: number; rawP30: number } {
  if (_rawP70 !== null && _rawP30 !== null) {
    return { rawP70: _rawP70, rawP30: _rawP30 };
  }

  // model.json에 저장된 임계값 사용 (없으면 기본값)
  const m = modelData as any;
  _rawP70 = m.rawP70 ?? 214;
  _rawP30 = m.rawP30 ?? 46;
  return { rawP70: _rawP70!, rawP30: _rawP30! };
}

export function predict(input: ShowInput): PredictionResult {
  const m = modelData as any;
  const weights: number[] = m.weights;
  const occupancyByTier: Record<Tier, number> = m.occupancyByTier;
  const { rawP70, rawP30 } = getThresholds();

  const capacity =
    input.seatcnt * Math.round((input.periodDays / 7) * input.weeklyShows);
  const totalShows = Math.round((input.periodDays / 7) * input.weeklyShows);

  const vec = buildFeatureVector(input);
  let rawScore = dotProduct(vec, weights);

  // 팬덤 스코어 보정: 최대 ±30점 (rawP70 기준)
  if (input.castFandomScore !== undefined) {
    const fandomBoost = (input.castFandomScore - 0.5) * 60;
    rawScore += fandomBoost;
  }

  const tier: Tier =
    rawScore >= rawP70 ? "HIGH" : rawScore <= rawP30 ? "LOW" : "MID";
  const occ = occupancyByTier[tier];

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
  };
}

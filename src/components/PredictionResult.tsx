"use client";

import { PredictionResult as Result, Tier } from "@/lib/model";
import { Badge } from "@/components/ui/badge";

interface Props {
  result: Result;
  priceAvg: number;
}

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string }> = {
  HIGH: { label: "HIGH — 흥행권", color: "text-red-600", bg: "bg-red-50 border-red-200" },
  MID: { label: "MID — 중간", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  LOW: { label: "LOW — 흥행 어려움", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
};

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}
function fmtBillion(n: number) {
  return `${(n / 1e8).toFixed(1)}억`;
}

export default function PredictionResult({ result }: Props) {
  const tier = TIER_CONFIG[result.tier];

  return (
    <div className={`rounded-xl border-2 p-5 space-y-4 ${tier.bg}`}>
      {/* 티어 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">예측 결과</p>
          <p className={`text-2xl font-bold ${tier.color}`}>{tier.label}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">예상 점유율</p>
          <p className={`text-2xl font-bold ${tier.color}`}>
            {(result.occupancy * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Capacity */}
      <div className="rounded-lg bg-white/70 p-3 text-sm">
        <p className="text-gray-500 mb-1">총 공연 규모</p>
        <p className="font-medium">
          {fmt(result.totalShows)}회차 ×{" "}
          {fmt(Math.round(result.capacity / result.totalShows))}석 ={" "}
          <span className="text-gray-800 font-bold">{fmt(result.capacity)}명 capacity</span>
        </p>
      </div>

      {/* 관객수 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-white/70 p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">최소</p>
          <p className="text-sm font-semibold text-gray-600">{fmt(result.audience.min)}명</p>
          <p className="text-xs text-gray-400">{fmtBillion(result.revenue.min)}</p>
        </div>
        <div className="rounded-lg bg-white p-3 text-center border-2 border-current/20">
          <p className="text-xs text-gray-400 mb-1">예상</p>
          <p className={`text-base font-bold ${tier.color}`}>{fmt(result.audience.expected)}명</p>
          <p className={`text-sm font-semibold ${tier.color}`}>{fmtBillion(result.revenue.expected)}</p>
        </div>
        <div className="rounded-lg bg-white/70 p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">최대</p>
          <p className="text-sm font-semibold text-gray-600">{fmt(result.audience.max)}명</p>
          <p className="text-xs text-gray-400">{fmtBillion(result.revenue.max)}</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        오차 범위 ±25~35% · 모델 정확도 Spearman 0.65 (52주 뮤지컬 박스오피스 기반)
      </p>
    </div>
  );
}

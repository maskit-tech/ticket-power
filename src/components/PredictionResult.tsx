"use client";

import { PredictionResult as Result, Tier } from "@/lib/model";
import { AlertTriangle, Info } from "lucide-react";

interface Props {
  result: Result;
  priceAvg: number;
}

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string }> = {
  HIGH: { label: "HIGH — 흥행권", color: "text-red-600", bg: "bg-red-50 border-red-200" },
  MID: { label: "MID — 중간", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  LOW: { label: "LOW — 흥행 어려움", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
};

const CONFIDENCE_CONFIG = {
  low:  { label: "낮음", bar: "w-1/3",  color: "bg-red-300",    text: "text-red-600" },
  mid:  { label: "중간", bar: "w-2/3",  color: "bg-yellow-300", text: "text-yellow-600" },
  high: { label: "높음", bar: "w-full", color: "bg-green-400",  text: "text-green-600" },
};

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}
function fmtBillion(n: number) {
  return `${(n / 1e8).toFixed(1)}억`;
}

export default function PredictionResult({ result }: Props) {
  const tier = TIER_CONFIG[result.tier];
  const conf = CONFIDENCE_CONFIG[result.confidence];

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

      {/* 신뢰도 */}
      <div className="rounded-lg bg-white/70 p-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 flex items-center gap-1">
            <Info className="h-3 w-3" />
            예측 신뢰도
          </span>
          <span className={`font-semibold ${conf.text}`}>{conf.label}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full ${conf.bar} ${conf.color} transition-all`} />
        </div>
      </div>

      {/* 캐스트 미입력 경고 */}
      {!result.hasCast && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            캐스트 미입력 — 공연장·기간·규모 기준 추정값입니다.
            배우를 추가하면 팬덤 영향이 반영되어 신뢰도가 높아집니다.
          </span>
        </div>
      )}

      {/* Capacity */}
      <div className="rounded-lg bg-white/70 p-3 text-sm">
        <p className="text-gray-500 mb-1">총 공연 규모</p>
        <p className="font-medium">
          {fmt(result.totalShows)}회차 ×{" "}
          {result.totalShows > 0
            ? fmt(Math.round(result.capacity / result.totalShows))
            : "—"}석 ={" "}
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

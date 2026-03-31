"use client";

import { PredictionResult as Result, Tier } from "@/lib/model";
import { AlertTriangle, Info, ChevronDown, ChevronUp, Lightbulb, ExternalLink } from "lucide-react";
import { useState } from "react";

interface Props {
  result: Result;
  stage?: "planning" | "on_sale";
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

/** 최소·예상·최대 중 최대값 기준으로 단위 통일 */
function revenueUnit(max: number) {
  if (max >= 1e8) return { divisor: 1e8, suffix: "억", decimals: 1 };
  if (max >= 1e7) return { divisor: 1e7, suffix: "천만", decimals: 1 };
  if (max >= 1e6) return { divisor: 1e6, suffix: "백만", decimals: 0 };
  return { divisor: 1e4, suffix: "만", decimals: 0 };
}

function fmtRevenue(n: number, unit: ReturnType<typeof revenueUnit>): string {
  const val = n / unit.divisor;
  return `${unit.decimals > 0 ? val.toFixed(unit.decimals) : Math.round(val).toLocaleString()}${unit.suffix}`;
}

export default function PredictionResult({ result, stage }: Props) {
  const tier = TIER_CONFIG[result.tier];
  const conf = CONFIDENCE_CONFIG[result.confidence];
  const revUnit = revenueUnit(result.revenue.max);
  const [ctaOpen, setCtaOpen] = useState(false);

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
          <p className="text-xs text-gray-400">{fmtRevenue(result.revenue.min, revUnit)}</p>
        </div>
        <div className="rounded-lg bg-white p-3 text-center border-2 border-current/20">
          <p className="text-xs text-gray-400 mb-1">예상</p>
          <p className={`text-base font-bold ${tier.color}`}>{fmt(result.audience.expected)}명</p>
          <p className={`text-sm font-semibold ${tier.color}`}>{fmtRevenue(result.revenue.expected, revUnit)}</p>
        </div>
        <div className="rounded-lg bg-white/70 p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">최대</p>
          <p className="text-sm font-semibold text-gray-600">{fmt(result.audience.max)}명</p>
          <p className="text-xs text-gray-400">{fmtRevenue(result.revenue.max, revUnit)}</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        오차 범위 ±25~35% · 모델 정확도 Spearman 0.65 (52주 뮤지컬 박스오피스 기반)
      </p>

      {/* CTA / 다음 액션 팁 */}
      <div className="rounded-lg bg-white/80 border border-gray-200 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => setCtaOpen((v) => !v)}
        >
          <span className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-yellow-500" />
            예측 결과, 다음 단계는?
          </span>
          {ctaOpen ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
        </button>

        {ctaOpen && (
          <div className="border-t divide-y divide-gray-100">
            {/* 기획 단계 팁 */}
            {(stage === "planning" || !stage) && (
              <div className="px-3 py-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">기획 단계라면</p>
                <a
                  href="https://maskit.co.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50 p-2.5 hover:bg-indigo-100 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                      큐리스(Qless) — 티켓 SaaS
                      <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                    </p>
                    <p className="text-xs text-indigo-600 mt-0.5">
                      예매→발권→검표→CRM 일체형. PG 수수료 4.4% (업계 8.8% 대비 절반), 당일 오픈 가능.
                      관객 데이터를 직접 확보해 다음 공연에 활용할 수 있습니다.
                    </p>
                  </div>
                </a>
                <a
                  href="https://artpedia.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50 p-2.5 hover:bg-emerald-100 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      예술편람(Artpedia) — 프로그램 노트 서비스
                      <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      공연 작품별 해설과 곡 배경을 제공하는 클래식 지식 플랫폼.
                      관객이 공연 전 작품을 이해하고 오면 만족도·재관람률이 올라갑니다.
                    </p>
                  </div>
                </a>
              </div>
            )}

            {/* 티켓 판매 중 팁 */}
            {(stage === "on_sale" || !stage) && (
              <div className="px-3 py-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">티켓 판매 중이라면</p>
                <div className="space-y-1.5">
                  {result.tier === "LOW" && (
                    <div className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-orange-400 shrink-0 font-bold">●</span>
                      <span><span className="font-medium">얼리버드 마감 임박</span> 메시지로 긴급성을 높이세요. "D-7" 카운트다운은 전환율을 20~30% 끌어올립니다.</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-blue-400 shrink-0 font-bold">●</span>
                    <span><span className="font-medium">캐스트 SNS 활용</span> — 배우·연주자의 팔로워에게 직접 노출하는 게 광고비 대비 가장 효율적인 채널입니다.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-purple-400 shrink-0 font-bold">●</span>
                    <span><span className="font-medium">단체·기업 패키지</span> 라인업을 별도로 구성하면 회차 점유율을 단번에 채울 수 있습니다.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-green-500 shrink-0 font-bold">●</span>
                    <span><span className="font-medium">관객 데이터 확보</span>를 지금부터 시작하세요. 이번 공연 관객이 다음 공연의 가장 확실한 고객입니다.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

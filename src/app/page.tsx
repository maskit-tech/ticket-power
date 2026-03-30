"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import CastInput, { CastMember } from "@/components/CastInput";
import PredictionResult from "@/components/PredictionResult";
import TheaterSelect from "@/components/TheaterSelect";
import { PredictionResult as Result } from "@/lib/model";
import { Theater } from "@/lib/theaters";
import { aggregateFandomScore } from "@/lib/youtube";
import { BarChart3, RefreshCw } from "lucide-react";

interface ShowForm {
  seatcnt: string;
  periodDays: string;
  weeklyShows: string;
  priceAvg: string;
  priceMax: string;
  companyTier: "0" | "1" | "2";
  venueTier: "0" | "1" | "2";
  isImported: boolean;
  isTour: boolean;
}

const DEFAULT_FORM: ShowForm = {
  seatcnt: "1000",
  periodDays: "60",
  weeklyShows: "8",
  priceAvg: "90000",
  priceMax: "110000",
  companyTier: "1",
  venueTier: "1",
  isImported: false,
  isTour: false,
};

interface Scenario {
  id: string;
  label: string;
  result: Result;
  form: ShowForm;
  castCount: number;
}

export default function Home() {
  const [form, setForm] = useState<ShowForm>(DEFAULT_FORM);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [theater, setTheater] = useState<Theater | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const predict = useCallback(async (f: ShowForm, c: CastMember[]) => {
    const completedCast = c.filter((m) => !m.loading);
    const fandomScores = completedCast.map((m) => m.fandomScore);
    const castFandomScore =
      fandomScores.length > 0 ? aggregateFandomScore(fandomScores) : undefined;

    setLoading(true);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seatcnt: parseInt(f.seatcnt) || 0,
          periodDays: parseInt(f.periodDays) || 0,
          weeklyShows: parseInt(f.weeklyShows) || 8,
          priceAvg: parseInt(f.priceAvg) || 0,
          priceMax: parseInt(f.priceMax) || 0,
          companyTier: parseInt(f.companyTier),
          venueTier: parseInt(f.venueTier),
          isImported: f.isImported,
          isTour: f.isTour,
          castFandomScore,
        }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // 극장 선택 시 좌석수·등급 자동 반영
  useEffect(() => {
    if (!theater) return;
    setForm((prev) => ({
      ...prev,
      seatcnt: String(theater.seatcnt),
      venueTier: String(theater.venueTier) as "0" | "1" | "2",
    }));
  }, [theater]);

  useEffect(() => {
    const hasCastLoading = cast.some((m) => m.loading);
    if (hasCastLoading) return;
    predict(form, cast);
  }, [form, cast, predict]);

  function saveScenario() {
    if (!result) return;
    const label =
      `시나리오 ${scenarios.length + 1}` +
      (cast.length > 0 ? ` (${cast.map((c) => c.name).join(", ")})` : "");
    setScenarios((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label, result, form: { ...form }, castCount: cast.length },
    ]);
  }

  function updateForm(key: keyof ShowForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const TIER_COLOR: Record<string, string> = {
    HIGH: "bg-red-100 text-red-700",
    MID: "bg-yellow-100 text-yellow-700",
    LOW: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-gray-700" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">티켓파워</h1>
            <p className="text-xs text-gray-400">
              기획 단계 뮤지컬 공연 판매 예측 · 52주 KOPIS 박스오피스 기반
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 입력 패널 */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  공연 조건
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 극장 선택 */}
                <div>
                  <Label className="text-xs text-gray-500">공연장</Label>
                  <div className="mt-1">
                    <TheaterSelect selected={theater} onSelect={setTheater} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">좌석수</Label>
                    <Input
                      type="number"
                      value={form.seatcnt}
                      onChange={(e) => updateForm("seatcnt", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">공연 기간(일)</Label>
                    <Input
                      type="number"
                      value={form.periodDays}
                      onChange={(e) => updateForm("periodDays", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">주당 공연 횟수</Label>
                    <Input
                      type="number"
                      value={form.weeklyShows}
                      onChange={(e) => updateForm("weeklyShows", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">평균 티켓가(원)</Label>
                    <Input
                      type="number"
                      value={form.priceAvg}
                      onChange={(e) => updateForm("priceAvg", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">최고 티켓가(원)</Label>
                    <Input
                      type="number"
                      value={form.priceMax}
                      onChange={(e) => updateForm("priceMax", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">제작사 등급</Label>
                    <Select
                      value={form.companyTier}
                      onValueChange={(v) => updateForm("companyTier", v as "0"|"1"|"2")}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">소형 (신생·소규모)</SelectItem>
                        <SelectItem value="1">중형 (중견 제작사)</SelectItem>
                        <SelectItem value="2">대형 (EMK·오디·CJ 등)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">공연장 등급</Label>
                    <Select
                      value={form.venueTier}
                      onValueChange={(v) => updateForm("venueTier", v as "0"|"1"|"2")}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">소극장 (~499석)</SelectItem>
                        <SelectItem value="1">중극장 (예술의전당 등)</SelectItem>
                        <SelectItem value="2">대극장 (블루스퀘어·샤롯데 등)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isImported}
                      onChange={(e) => updateForm("isImported", e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">내한/라이선스</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isTour}
                      onChange={(e) => updateForm("isTour", e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">투어(지방) 공연</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-visible">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  캐스트
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    YouTube 연결 시 팬덤 영향도 자동 반영
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CastInput cast={cast} onChange={setCast} />
              </CardContent>
            </Card>
          </div>

          {/* 결과 패널 */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-700">
                    예측 결과
                  </CardTitle>
                  <div className="flex gap-2 items-center">
                    {loading && (
                      <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    {result && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={saveScenario}
                      >
                        시나리오 저장
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {result ? (
                  <PredictionResult
                    result={result}
                    priceAvg={parseInt(form.priceAvg) || 0}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center text-gray-400 text-sm">
                    공연 조건을 입력하면 자동으로 예측됩니다
                  </div>
                )}
              </CardContent>
            </Card>

            {cast.filter((c) => !c.loading && c.subscriberCount > 0).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-gray-500">
                    캐스트 팬덤 영향도
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {cast
                    .filter((c) => !c.loading)
                    .sort((a, b) => b.fandomScore - a.fandomScore)
                    .map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <span className="text-sm w-24 truncate">{m.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
                            style={{ width: `${m.fandomScore * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">
                          {(m.fandomScore * 100).toFixed(0)}
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 시나리오 비교 */}
        {scenarios.length >= 2 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">
                시나리오 비교
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-500">
                      <th className="text-left py-2 pr-4">시나리오</th>
                      <th className="text-right py-2 px-3">티어</th>
                      <th className="text-right py-2 px-3">예상 관객</th>
                      <th className="text-right py-2 px-3">예상 매출</th>
                      <th className="text-right py-2 px-3">점유율</th>
                      <th className="py-2 pl-3 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-gray-700 max-w-[180px] truncate">
                          {s.label}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Badge className={`text-xs ${TIER_COLOR[s.result.tier]}`}>
                            {s.result.tier}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {s.result.audience.expected.toLocaleString()}명
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {(s.result.revenue.expected / 1e8).toFixed(1)}억
                        </td>
                        <td className="py-2 px-3 text-right">
                          {(s.result.occupancy * 100).toFixed(0)}%
                        </td>
                        <td className="py-2 pl-3">
                          <button
                            onClick={() =>
                              setScenarios((prev) => prev.filter((x) => x.id !== s.id))
                            }
                            className="text-gray-300 hover:text-gray-500"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

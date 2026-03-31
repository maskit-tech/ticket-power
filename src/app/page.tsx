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
import { Genre, GENRE_OPTIONS, GENRE_CONFIG } from "@/lib/genres";
import { BarChart3, RefreshCw, Link2, Loader2, CheckCircle2 } from "lucide-react";

interface ShowForm {
  title: string;
  genre: Genre;
  seatcnt: string;
  periodDays: string;
  weeklyShows: string;
  priceAvg: string;
  priceMax: string;
  companyTier: "0" | "1" | "2";
  venueTier: "0" | "1" | "2";
  isImported: boolean;
  isTour: boolean;
  repertoireGrade: "0" | "1" | "2" | "3";
}

const DEFAULT_FORM: ShowForm = {
  title: "",
  genre: "musical",
  seatcnt: "",
  periodDays: "",
  weeklyShows: "8",
  priceAvg: "90000",
  priceMax: "110000",
  companyTier: "1",
  venueTier: "1",
  isImported: false,
  isTour: false,
  repertoireGrade: "0",
};

interface Scenario {
  id: string;
  label: string;
  result: Result;
  form: ShowForm;
  castCount: number;
}

type Mode = "open" | "plan";

export default function Home() {
  const [mode, setMode] = useState<Mode>("open");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlAnalyzed, setUrlAnalyzed] = useState(false);
  const [detectedCastNames, setDetectedCastNames] = useState<string[]>([]);

  const [form, setForm] = useState<ShowForm>(DEFAULT_FORM);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [theater, setTheater] = useState<Theater | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const predict = useCallback(async (f: ShowForm, c: CastMember[]) => {
    const completedCast = c.filter((m) => !m.loading);
    const fandomScores = completedCast.map((m) => m.fandomScore);
    const hasCast = completedCast.length > 0;
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
          genre: f.genre,
          repertoireGrade: parseInt(f.repertoireGrade),
          castFandomScore,
          hasCast,
        }),
      });
      const data = await res.json();
      setResult(data);

      // 예측 로그
      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "prediction",
          mode,
          genre: f.genre,
          title: f.title,
          seatcnt: parseInt(f.seatcnt) || 0,
          periodDays: parseInt(f.periodDays) || 0,
          priceMax: parseInt(f.priceMax) || 0,
          castCount: c.filter((m) => !m.loading).length,
          tier: data.tier,
          occupancy: data.occupancy,
          revenueExpected: data.revenue?.expected,
          audienceExpected: data.audience?.expected,
        }),
      }).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [mode]);

  // 극장 선택 시 좌석수·등급·기간 기본값 자동 반영
  useEffect(() => {
    if (!theater) return;
    setForm((prev) => ({
      ...prev,
      seatcnt: String(theater.seatcnt),
      venueTier: String(theater.venueTier) as "0" | "1" | "2",
      periodDays: prev.periodDays || "30",
      weeklyShows: prev.weeklyShows || "8",
    }));
  }, [theater]);

  useEffect(() => {
    const hasCastLoading = cast.some((m) => m.loading);
    if (hasCastLoading) return;

    // 공연장 선택이 필수 조건
    if (!theater) {
      setResult(null);
      return;
    }

    predict(form, cast);
  }, [form, cast, predict, theater]);

  function saveScenario() {
    if (!result) return;
    const label =
      (form.title.trim() || `시나리오 ${scenarios.length + 1}`) +
      (cast.length > 0 ? ` (${cast.map((c) => c.name).join(", ")})` : "");
    setScenarios((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label, result, form: { ...form }, castCount: cast.length },
    ]);
  }

  function updateForm(key: keyof ShowForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function analyzeUrl() {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setUrlAnalyzed(false);
    try {
      const res = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // 폼 자동완성
      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        genre: (data.genre as Genre) || prev.genre,
        seatcnt: data.seatcnt ? String(data.seatcnt) : prev.seatcnt,
        periodDays: data.periodDays ? String(data.periodDays) : prev.periodDays,
        weeklyShows: data.weeklyShows ? String(data.weeklyShows) : prev.weeklyShows,
        priceAvg: data.priceAvg ? String(data.priceAvg) : prev.priceAvg,
        priceMax: data.priceMax ? String(data.priceMax) : prev.priceMax,
        isImported: data.isImported ?? prev.isImported,
        isTour: data.isTour ?? prev.isTour,
        companyTier: data.company
          ? (["EMK","오디컴퍼니","신시컴퍼니","CJ ENM","쇼노트"].some(t => data.company.includes(t)) ? "2" : "1")
          : prev.companyTier,
      }));

      // 출연진 이름 목록 (YouTube 검색 힌트)
      if (data.castNames?.length) setDetectedCastNames(data.castNames.slice(0, 8));

      // 공연장 힌트 저장 (venue 이름이 있으면 검색 힌트로)
      if (data.venue) {
        // TheaterSelect에 힌트 전달용 — 직접 매칭은 어려우니 title에 venue 보여줌
      }

      setUrlAnalyzed(true);

      // 사용 로그 기록
      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "url_analyzed",
          mode,
          url: urlInput.trim(),
          genre: data.genre,
          title: data.title,
          venue: data.venue,
          castCount: data.castNames?.length ?? 0,
        }),
      }).catch(() => {});
    } catch (e) {
      alert(`분석 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUrlLoading(false);
    }
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

        {/* 모드 탭 */}
        <div className="flex rounded-lg border bg-white p-1 w-fit">
          <button
            onClick={() => { setMode("open"); setUrlAnalyzed(false); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "open"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            오픈된 공연 분석
          </button>
          <button
            onClick={() => setMode("plan")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "plan"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            기획 중인 공연 예측
          </button>
        </div>

        {/* URL 분석 섹션 (오픈 모드) */}
        {mode === "open" && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <Label className="text-xs text-gray-500 flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5" />
                공연 링크 붙여넣기
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="인터파크, 예스24, KOPIS 링크 붙여넣기"
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlAnalyzed(false); }}
                  onKeyDown={(e) => e.key === "Enter" && analyzeUrl()}
                  className="flex-1"
                />
                <Button onClick={analyzeUrl} disabled={urlLoading || !urlInput.trim()} className="shrink-0">
                  {urlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "분석"}
                </Button>
              </div>
              {urlAnalyzed && (
                <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  분석 완료 — 아래 폼이 자동 채워졌습니다. 확인 후 수정하세요.
                </p>
              )}
              {detectedCastNames.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-1">발견된 출연진 — 아래 캐스트 섹션에서 검색해 추가하세요</p>
                  <div className="flex flex-wrap gap-1">
                    {detectedCastNames.map((name) => (
                      <span key={name} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{name}</span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                {/* 장르 */}
                <div>
                  <Label className="text-xs text-gray-500">장르</Label>
                  <Select
                    value={form.genre}
                    onValueChange={(v) => updateForm("genre", v as Genre)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRE_OPTIONS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-gray-400">{GENRE_CONFIG[form.genre].hint}</p>
                </div>

                {/* 공연명 */}
                <div>
                  <Label className="text-xs text-gray-500">공연명 (선택)</Label>
                  <Input
                    placeholder="예: 베토벤 피아노 협주곡 5번"
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* 극장 선택 */}
                <div>
                  <Label className="text-xs text-gray-500">공연장 <span className="text-red-400">*</span></Label>
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

                <div>
                  <Label className="text-xs text-gray-500">작품/레퍼토리 등급</Label>
                  <Select
                    value={form.repertoireGrade}
                    onValueChange={(v) => updateForm("repertoireGrade", v as "0"|"1"|"2"|"3")}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">신작/실험작 — 검증되지 않은 작품</SelectItem>
                      <SelectItem value="1">알려진 작품 — 라이선스·소규모 명작</SelectItem>
                      <SelectItem value="2">대중적 명작 — 빨래·광화문연가·베토벤</SelectItem>
                      <SelectItem value="3">세계적 명작 — 레미제라블·베토벤 9번</SelectItem>
                    </SelectContent>
                  </Select>
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
                    YouTube · 인스타 · X · 스레드 팔로워 합산 팬덤 반영
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CastInput cast={cast} onChange={setCast} genre={form.genre} />
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
                  <PredictionResult result={result} />
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-400">
                    <p className="text-sm font-medium">공연장을 선택해야 예측이 시작됩니다</p>
                    <p className="text-xs text-gray-300">좌석 수와 공연장 규모가 기준이 됩니다</p>
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

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, PlayCircle, User, Search, AtSign } from "lucide-react";
import { getActorGrade } from "@/lib/theaters";
import { combinedFandomScore } from "@/lib/youtube";
import { GENRE_CONFIG } from "@/lib/genres";

export interface CastMember {
  id: string;
  name: string;
  youtubeUrl: string;
  subscriberCount: number;
  fandomScore: number;
  buzzTotal?: number;
  buzzRecent?: number;
  channelTitle?: string;
  thumbnailUrl?: string;
  grade?: string;
  gradeLabel?: string;
  gradeColor?: string;
  loading: boolean;
  error?: string;
  // 소셜 계정
  instagram?: string;
  twitter?: string;
  threads?: string;
  instagramFollowers?: number | null;
  twitterFollowers?: number | null;
  threadsFollowers?: number | null;
  socialLoading?: boolean;
}

interface SearchCandidate {
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  fandomScore: number;
  buzzTotal?: number;
  buzzRecent?: number;
  grade: string;
  gradeLabel: string;
  gradeColor: string;
  youtubeUrl: string;
}

interface BuzzSummary {
  buzzRecent: number;
  trendAvg: number;
}

interface Props {
  cast: CastMember[];
  onChange: (cast: CastMember[]) => void;
  genre?: string;
}

export default function CastInput({ cast, onChange, genre = "musical" }: Props) {
  const [nameInput, setNameInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<SearchCandidate[]>([]);
  const [buzzSummary, setBuzzSummary] = useState<BuzzSummary | null>(null);
  const [showCandidates, setShowCandidates] = useState(false);
  const [expandedSocial, setExpandedSocial] = useState<Set<string>>(new Set());
  const [socialInputs, setSocialInputs] = useState<Record<string, { ig: string; x: string; th: string }>>({});
  // 카드별 YouTube 검색 상태
  const [cardSearch, setCardSearch] = useState<Record<string, {
    loading: boolean;
    candidates: SearchCandidate[];
    show: boolean;
  }>>({});

  async function searchYoutubeForCard(memberId: string, name: string) {
    setCardSearch((prev) => ({ ...prev, [memberId]: { loading: true, candidates: [], show: true } }));
    try {
      const res = await fetch("/api/cast-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, genre }),
      });
      const data = await res.json();
      setCardSearch((prev) => ({
        ...prev,
        [memberId]: { loading: false, candidates: data.candidates ?? [], show: true },
      }));
    } catch {
      setCardSearch((prev) => ({ ...prev, [memberId]: { loading: false, candidates: [], show: false } }));
    }
  }

  function linkYoutubeToCard(memberId: string, c: SearchCandidate) {
    onChange(cast.map((m) => m.id === memberId ? {
      ...m,
      youtubeUrl: c.youtubeUrl,
      subscriberCount: c.subscriberCount,
      fandomScore: c.fandomScore,
      buzzTotal: c.buzzTotal,
      buzzRecent: c.buzzRecent,
      channelTitle: c.title,
      thumbnailUrl: c.thumbnailUrl,
      grade: c.grade,
      gradeLabel: c.gradeLabel,
      gradeColor: c.gradeColor,
    } : m));
    setCardSearch((prev) => ({ ...prev, [memberId]: { ...prev[memberId], show: false } }));
  }

  function toggleSocial(id: string) {
    setExpandedSocial((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!socialInputs[id]) {
      const member = cast.find((m) => m.id === id);
      setSocialInputs((prev) => ({
        ...prev,
        [id]: {
          ig: member?.instagram ?? "",
          x: member?.twitter ?? "",
          th: member?.threads ?? "",
        },
      }));
    }
  }

  async function fetchSocialFollowers(memberId: string) {
    const inputs = socialInputs[memberId];
    if (!inputs) return;

    // 로딩 상태
    onChange(cast.map((m) => m.id === memberId ? { ...m, socialLoading: true } : m));

    try {
      const res = await fetch("/api/social-followers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagram: inputs.ig || undefined,
          twitter: inputs.x || undefined,
          threads: inputs.th || undefined,
        }),
      });
      const data = await res.json();

      onChange(cast.map((m) => {
        if (m.id !== memberId) return m;
        const igF = data.instagram?.followers ?? null;
        const xF = data.twitter?.followers ?? null;
        const thF = data.threads?.followers ?? null;
        const newFandomScore = combinedFandomScore({
          youtubeSubscribers: m.subscriberCount,
          instagramFollowers: igF,
          twitterFollowers: xF,
          threadsFollowers: thF,
          genre,
        });
        return {
          ...m,
          instagram: inputs.ig || undefined,
          twitter: inputs.x || undefined,
          threads: inputs.th || undefined,
          instagramFollowers: igF,
          twitterFollowers: xF,
          threadsFollowers: thF,
          fandomScore: newFandomScore,
          socialLoading: false,
        };
      }));
    } catch {
      onChange(cast.map((m) => m.id === memberId ? { ...m, socialLoading: false } : m));
    }
  }

  function updateSocialInput(id: string, platform: "ig" | "x" | "th", value: string) {
    setSocialInputs((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { ig: "", x: "", th: "" }), [platform]: value },
    }));
  }

  // 이름으로 YouTube 채널 검색
  async function searchByName() {
    if (!nameInput.trim()) return;
    setSearching(true);
    setCandidates([]);
    setBuzzSummary(null);
    setShowCandidates(true);
    try {
      const res = await fetch("/api/cast-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim(), genre }),
      });
      const data = await res.json();
      setCandidates(data.candidates ?? []);
      if (data.buzz || data.trend) {
        setBuzzSummary({
          buzzRecent: data.buzz?.recentCount ?? 0,
          trendAvg: data.trend?.avg ?? 0,
        });
      }
    } finally {
      setSearching(false);
    }
  }

  // 후보에서 배우 선택
  function selectCandidate(c: SearchCandidate) {
    const member: CastMember = {
      id: crypto.randomUUID(),
      name: nameInput.trim(),
      youtubeUrl: c.youtubeUrl,
      subscriberCount: c.subscriberCount,
      fandomScore: c.fandomScore,
      buzzTotal: c.buzzTotal,
      buzzRecent: c.buzzRecent,
      channelTitle: c.title,
      thumbnailUrl: c.thumbnailUrl,
      grade: c.grade,
      gradeLabel: c.gradeLabel,
      gradeColor: c.gradeColor,
      loading: false,
    };
    onChange([...cast, member]);
    setNameInput("");
    setCandidates([]);
    setShowCandidates(false);
  }

  // YouTube 채널 없이 이름만 추가
  function addWithoutYoutube() {
    if (!nameInput.trim()) return;
    const member: CastMember = {
      id: crypto.randomUUID(),
      name: nameInput.trim(),
      youtubeUrl: "",
      subscriberCount: 0,
      fandomScore: 0.3,
      loading: false,
    };
    onChange([...cast, member]);
    setNameInput("");
    setCandidates([]);
    setShowCandidates(false);
  }

  function removeMember(id: string) {
    onChange(cast.filter((m) => m.id !== id));
  }

  function formatSubscribers(n: number): string {
    if (n >= 10_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n > 0 ? String(n) : "—";
  }

  return (
    <div className="space-y-3">
      {/* 배우 목록 */}
      {cast.length > 0 && (
        <div className="space-y-2">
          {cast.map((m) => {
            const gradeInfo = m.subscriberCount > 0
              ? getActorGrade(m.subscriberCount)
              : null;
            return (
              <div key={m.id} className="rounded-lg border bg-white">
              <div className="flex items-center gap-2 p-2.5">
                {m.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.thumbnailUrl}
                    alt={m.name}
                    className="h-9 w-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 shrink-0">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium">{m.name}</p>
                    {gradeInfo && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${gradeInfo.color}`}>
                        {gradeInfo.grade}급
                      </span>
                    )}
                  </div>
                  {m.channelTitle && (
                    <p className="text-xs text-gray-400 truncate">{m.channelTitle}</p>
                  )}
                  {m.error && <p className="text-xs text-red-400">{m.error}</p>}
                </div>
                {m.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400 shrink-0" />
                ) : m.subscriberCount > 0 ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <PlayCircle className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-gray-600">
                      {formatSubscribers(m.subscriberCount)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      팬덤 {(m.fandomScore * 100).toFixed(0)}
                    </Badge>
                  </div>
                ) : (
                  <button
                    onClick={() => searchYoutubeForCard(m.id, m.name)}
                    disabled={cardSearch[m.id]?.loading}
                    className="shrink-0 text-xs px-2 py-0.5 rounded border border-dashed border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors flex items-center gap-1"
                    title="YouTube 채널 연결"
                  >
                    {cardSearch[m.id]?.loading
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <PlayCircle className="h-3 w-3" />}
                    YouTube 연결
                  </button>
                )}
                <button
                  onClick={() => toggleSocial(m.id)}
                  className={`ml-1 shrink-0 text-xs px-1.5 py-0.5 rounded border transition-colors ${
                    expandedSocial.has(m.id)
                      ? "border-gray-400 text-gray-600 bg-gray-50"
                      : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                  }`}
                  title="인스타 · X · 스레드 계정 추가"
                >
                  IG·X
                </button>
                <button
                  onClick={() => removeMember(m.id)}
                  className="text-gray-300 hover:text-gray-500 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 소셜 계정 입력 패널 */}
              {expandedSocial.has(m.id) && (
                <div className="mt-2 pt-2 border-t space-y-2">
                  <p className="text-xs text-gray-400">소셜 계정 핸들 입력 시 팔로워 수가 팬덤 점수에 반영됩니다</p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Instagram */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-pink-400 shrink-0 w-4 text-center">IG</span>
                      <Input
                        placeholder="@handle"
                        value={socialInputs[m.id]?.ig ?? m.instagram ?? ""}
                        onChange={(e) => updateSocialInput(m.id, "ig", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    {/* X */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-sky-400 shrink-0 w-4 text-center">X</span>
                      <Input
                        placeholder="@handle"
                        value={socialInputs[m.id]?.x ?? m.twitter ?? ""}
                        onChange={(e) => updateSocialInput(m.id, "x", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    {/* Threads */}
                    <div className="flex items-center gap-1">
                      <AtSign className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      <Input
                        placeholder="@handle"
                        value={socialInputs[m.id]?.th ?? m.threads ?? ""}
                        onChange={(e) => updateSocialInput(m.id, "th", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={m.socialLoading}
                      onClick={() => fetchSocialFollowers(m.id)}
                    >
                      {m.socialLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      팔로워 확인
                    </Button>
                    {/* 팔로워 수 표시 */}
                    {(m.instagramFollowers != null || m.twitterFollowers != null || m.threadsFollowers != null) && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {m.instagramFollowers != null && (
                          <span className="flex items-center gap-0.5">
                            <span className="text-xs font-bold text-pink-400">IG</span>
                            {formatSubscribers(m.instagramFollowers)}
                          </span>
                        )}
                        {m.twitterFollowers != null && (
                          <span className="flex items-center gap-0.5">
                            <span className="text-xs font-bold text-sky-400">X</span>
                            {formatSubscribers(m.twitterFollowers)}
                          </span>
                        )}
                        {m.threadsFollowers != null && (
                          <span className="flex items-center gap-0.5">
                            <AtSign className="h-3 w-3 text-gray-500" />
                            {formatSubscribers(m.threadsFollowers)}
                          </span>
                        )}
                      </div>
                    )}
                    {/* 자동 확인 실패 안내 */}
                    {!m.socialLoading &&
                      (m.instagramFollowers === null || m.twitterFollowers === null || m.threadsFollowers === null) &&
                      (m.instagram || m.twitter || m.threads) && (
                        <span className="text-xs text-gray-400">일부 자동 확인 실패 — 팔로워 수 직접 입력도 가능</span>
                      )}
                  </div>
                </div>
              )}

              {/* 카드별 YouTube 검색 드롭다운 */}
              {cardSearch[m.id]?.show && (
                <div className="border-t">
                  {cardSearch[m.id].loading ? (
                    <div className="flex items-center gap-2 p-3 text-xs text-gray-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      YouTube 채널 검색 중...
                    </div>
                  ) : cardSearch[m.id].candidates.length === 0 ? (
                    <div className="p-3 text-xs text-gray-400 flex items-center justify-between">
                      <span>YouTube 채널을 찾지 못했습니다</span>
                      <button
                        className="text-gray-300 hover:text-gray-500"
                        onClick={() => setCardSearch((prev) => ({ ...prev, [m.id]: { ...prev[m.id], show: false } }))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      {cardSearch[m.id].candidates.map((c) => (
                        <button
                          key={c.channelId}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-0 flex items-center gap-2"
                          onClick={() => linkYoutubeToCard(m.id, c)}
                        >
                          {c.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.thumbnailUrl} alt={c.title} className="h-7 w-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-gray-100 shrink-0 flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium truncate">{c.title}</span>
                              <span className={`text-xs px-1 py-0 rounded shrink-0 ${c.gradeColor}`}>{c.grade}급</span>
                            </div>
                            <span className="text-xs text-gray-400">구독자 {formatSubscribers(c.subscriberCount)}</span>
                          </div>
                          <PlayCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                        </button>
                      ))}
                      <button
                        className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => setCardSearch((prev) => ({ ...prev, [m.id]: { ...prev[m.id], show: false } }))}
                      >
                        <span>닫기</span>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* 이름 검색 입력 */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`아티스트 이름으로 검색 (${GENRE_CONFIG[genre as keyof typeof GENRE_CONFIG]?.exampleCast ?? "홍광호, 조승우..."})`}
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (showCandidates) setShowCandidates(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && searchByName()}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={searchByName}
            disabled={!nameInput.trim() || searching}
            className="shrink-0"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* 검색 결과 드롭다운 */}
        {showCandidates && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg">
            {searching ? (
              <div className="flex items-center gap-2 p-3 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                YouTube 채널 검색 중...
              </div>
            ) : candidates.length === 0 ? (
              <div className="space-y-0">
                <div className="p-3 text-sm text-gray-400">
                  YouTube 채널을 찾지 못했습니다
                </div>
                <button
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 border-t flex items-center gap-2"
                  onClick={addWithoutYoutube}
                >
                  <Plus className="h-4 w-4 text-gray-400" />
                  <span>&apos;{nameInput}&apos;를 YouTube 없이 추가</span>
                </button>
              </div>
            ) : (
              <div>
                {/* 네이버 버즈/트렌드 요약 (검색어 기준) */}
                {buzzSummary && (buzzSummary.buzzRecent > 0 || buzzSummary.trendAvg > 0) && (
                  <div className="px-3 py-2 bg-gray-50 border-b flex items-center gap-3 text-xs text-gray-500">
                    <span>네이버</span>
                    {buzzSummary.buzzRecent > 0 && (
                      <span>뉴스 최근 30일 <span className="font-medium text-blue-500">{buzzSummary.buzzRecent}건</span></span>
                    )}
                    {buzzSummary.trendAvg > 0 && (
                      <span>검색 트렌드 <span className="font-medium text-blue-500">{buzzSummary.trendAvg.toFixed(0)}</span><span className="text-gray-400">/100</span></span>
                    )}
                  </div>
                )}
                {candidates.map((c) => (
                  <button
                    key={c.channelId}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b last:border-0 flex items-center gap-3"
                    onClick={() => selectCandidate(c)}
                  >
                    {c.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.thumbnailUrl}
                        alt={c.title}
                        className="h-9 w-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 shrink-0">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{c.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${c.gradeColor}`}>
                          {c.grade}급
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        구독자 {formatSubscribers(c.subscriberCount)}
                      </span>
                    </div>
                  </button>
                ))}
                <button
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 border-t flex items-center gap-2"
                  onClick={addWithoutYoutube}
                >
                  <Plus className="h-4 w-4" />
                  YouTube 없이 추가
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        이름 검색 → YouTube 자동 연결 · 추가 후 <span className="font-medium text-gray-500">IG·X</span> 버튼으로 인스타·X·스레드 팔로워 반영
      </p>
    </div>
  );
}

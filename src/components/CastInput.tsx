"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, PlayCircle, User, Search } from "lucide-react";
import { getActorGrade } from "@/lib/theaters";

export interface CastMember {
  id: string;
  name: string;
  youtubeUrl: string;
  subscriberCount: number;
  fandomScore: number;
  channelTitle?: string;
  thumbnailUrl?: string;
  grade?: string;
  gradeLabel?: string;
  gradeColor?: string;
  loading: boolean;
  error?: string;
}

interface SearchCandidate {
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  fandomScore: number;
  grade: string;
  gradeLabel: string;
  gradeColor: string;
  youtubeUrl: string;
}

interface Props {
  cast: CastMember[];
  onChange: (cast: CastMember[]) => void;
}

export default function CastInput({ cast, onChange }: Props) {
  const [nameInput, setNameInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<SearchCandidate[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);

  // 이름으로 YouTube 채널 검색
  async function searchByName() {
    if (!nameInput.trim()) return;
    setSearching(true);
    setCandidates([]);
    setShowCandidates(true);
    try {
      const res = await fetch("/api/cast-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const data = await res.json();
      setCandidates(data.candidates ?? []);
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
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-lg border bg-white p-2.5"
              >
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
                  <Badge variant="outline" className="text-xs text-gray-400 shrink-0">
                    YouTube 없음
                  </Badge>
                )}
                <button
                  onClick={() => removeMember(m.id)}
                  className="ml-1 text-gray-300 hover:text-gray-500 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
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
              placeholder="배우 이름으로 검색 (조승우, 김준수...)"
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          구독자 {formatSubscribers(c.subscriberCount)}
                        </span>
                        {c.description && (
                          <span className="text-xs text-gray-300 truncate">
                            {c.description}
                          </span>
                        )}
                      </div>
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
        배우 이름으로 검색하면 YouTube 채널과 등급(S/A/B/C)을 자동으로 확인합니다
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, PlayCircle, User } from "lucide-react";

export interface CastMember {
  id: string;
  name: string;
  youtubeUrl: string;
  subscriberCount: number;
  fandomScore: number;
  channelTitle?: string;
  thumbnailUrl?: string;
  loading: boolean;
  error?: string;
}

interface Props {
  cast: CastMember[];
  onChange: (cast: CastMember[]) => void;
}

export default function CastInput({ cast, onChange }: Props) {
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  async function fetchCastScore(member: CastMember): Promise<CastMember> {
    if (!member.youtubeUrl) return member;
    const res = await fetch("/api/cast-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: member.youtubeUrl }),
    });
    const data = await res.json();
    if (!res.ok) return { ...member, loading: false, error: data.error };
    return {
      ...member,
      loading: false,
      subscriberCount: data.subscriberCount,
      fandomScore: data.fandomScore,
      channelTitle: data.title,
      thumbnailUrl: data.thumbnailUrl,
      error: undefined,
    };
  }

  async function addMember() {
    if (!newName.trim()) return;
    const member: CastMember = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      youtubeUrl: newUrl.trim(),
      subscriberCount: 0,
      fandomScore: 0.5,
      loading: !!newUrl.trim(),
    };
    const next = [...cast, member];
    onChange(next);
    setNewName("");
    setNewUrl("");

    if (newUrl.trim()) {
      const updated = await fetchCastScore(member);
      onChange(next.map((m) => (m.id === updated.id ? updated : m)));
    }
  }

  function removeMember(id: string) {
    onChange(cast.filter((m) => m.id !== id));
  }

  function formatSubscribers(n: number): string {
    if (n >= 10000000) return `${(n / 1000000).toFixed(0)}M`;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 10000) return `${(n / 10000).toFixed(0)}만`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div className="space-y-3">
      {/* 배우 목록 */}
      {cast.length > 0 && (
        <div className="space-y-2">
          {cast.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-lg border bg-white p-2.5"
            >
              {m.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.thumbnailUrl}
                  alt={m.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                {m.channelTitle && (
                  <p className="text-xs text-gray-400 truncate">{m.channelTitle}</p>
                )}
                {m.error && (
                  <p className="text-xs text-red-400">{m.error}</p>
                )}
              </div>
              {m.loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : m.subscriberCount > 0 ? (
                <div className="flex items-center gap-1">
                  <PlayCircle className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-gray-600">
                    {formatSubscribers(m.subscriberCount)}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-xs"
                  >
                    팬덤 {(m.fandomScore * 100).toFixed(0)}
                  </Badge>
                </div>
              ) : (
                <Badge variant="outline" className="text-xs text-gray-400">
                  YouTube 없음
                </Badge>
              )}
              <button
                onClick={() => removeMember(m.id)}
                className="ml-1 text-gray-300 hover:text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 배우 추가 폼 */}
      <div className="flex gap-2">
        <Input
          placeholder="배우 이름"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-28 shrink-0"
          onKeyDown={(e) => e.key === "Enter" && addMember()}
        />
        <Input
          placeholder="YouTube 채널 URL (선택)"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && addMember()}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addMember}
          disabled={!newName.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-gray-400">
        YouTube URL을 입력하면 구독자 수로 팬덤 영향도를 자동 계산합니다
      </p>
    </div>
  );
}

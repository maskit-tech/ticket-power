"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, X } from "lucide-react";
import {
  Theater,
  THEATERS,
  THEATER_GRADE_COLOR,
  searchTheaters,
} from "@/lib/theaters";

interface Props {
  selected: Theater | null;
  onSelect: (theater: Theater | null) => void;
}

export default function TheaterSelect({ selected, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = query.length > 0 ? searchTheaters(query) : THEATERS;

  function handleSelect(theater: Theater) {
    onSelect(theater);
    setQuery("");
    setOpen(false);
  }

  function handleClear() {
    onSelect(null);
    setQuery("");
  }

  const gradeStars: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };

  return (
    <div className="space-y-2">
      {selected ? (
        /* 선택된 극장 카드 */
        <div className="rounded-lg border bg-white p-3 flex items-start gap-3">
          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{selected.name}</span>
              <Badge
                className={`text-xs ${THEATER_GRADE_COLOR[selected.grade]}`}
              >
                {selected.grade}등급
              </Badge>
              <span className="text-xs text-gray-400">{selected.district}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-xs text-gray-500">
                {selected.seatcnt.toLocaleString()}석
              </span>
              <span className="text-xs text-gray-500">
                흥행지수{" "}
                <span className="text-orange-500 font-medium">
                  {"★".repeat(gradeStars[selected.grade])}
                  {"☆".repeat(4 - gradeStars[selected.grade])}
                </span>{" "}
                ({(selected.highRate * 100).toFixed(0)}% 고흥행)
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">
              대표공연: {selected.representativeShows.slice(0, 3).join(", ")}
            </p>
          </div>
          <button
            onClick={handleClear}
            className="text-gray-300 hover:text-gray-500 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* 검색 입력 */
        <div className="relative">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="극장 검색 (블루스퀘어, 대학로...)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              className="pl-9"
            />
          </div>

          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-72 overflow-y-auto">
              {results.length === 0 ? (
                <div className="p-3 text-sm text-gray-400 text-center">
                  검색 결과 없음
                </div>
              ) : (
                results.map((theater) => (
                  <button
                    key={theater.id}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b last:border-0 flex items-center gap-3"
                    onMouseDown={() => handleSelect(theater)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {theater.name}
                        </span>
                        <Badge
                          className={`text-xs shrink-0 ${THEATER_GRADE_COLOR[theater.grade]}`}
                        >
                          {theater.grade}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {theater.district} · {theater.seatcnt.toLocaleString()}석
                        </span>
                        <span className="text-xs text-orange-500">
                          {"★".repeat(gradeStars[theater.grade])}
                          {"☆".repeat(4 - gradeStars[theater.grade])}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

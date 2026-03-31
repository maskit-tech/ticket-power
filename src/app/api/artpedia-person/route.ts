/**
 * Artpedia 연주자 검색 프록시
 * POST /api/artpedia-person  { name: string }
 *
 * artpedia.net public API를 호출해 연주자 정보(공연 빈도/최신성 포함)를 반환.
 */

import { NextRequest, NextResponse } from "next/server";

const ARTPEDIA_BASE = "https://artpedia.net";

export async function POST(req: NextRequest) {
  const { name } = await req.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ people: [] });

  try {
    const url = `${ARTPEDIA_BASE}/api/public/people/search?name=${encodeURIComponent(name.trim())}&limit=5`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ticket-power/1.0" },
      next: { revalidate: 300 },
    });

    if (!res.ok) return NextResponse.json({ people: [] });

    const data = await res.json() as { people: ArtpediaPerson[] };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ people: [] });
  }
}

export interface ArtpediaPerson {
  slug: string;
  name: string;
  nameKo: string;
  imageUrl: string | null;
  type: string | null;
  recentEvents: number;   // 최근 6개월
  upcomingEvents: number;
  totalEvents: number;
  artpediaUrl: string;
}

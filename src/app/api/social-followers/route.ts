/**
 * 소셜 플랫폼 팔로워 수 조회 API
 * - Instagram: HTML og:description 파싱 (공개 프로필)
 * - X (Twitter): 비공개 API 없음 → HTML 파싱 시도
 * - Threads: Instagram 계열, HTML 파싱 시도
 * 모두 fallback graceful (null 반환)
 */

import { NextResponse } from "next/server";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
};

interface SocialResult {
  followers: number | null;
  error?: string;
}

/** 팔로워 수 숫자 파싱: "1.2만", "34.5K", "1,234,567" 등 */
function parseFollowerText(text: string): number | null {
  // "1.2만 팔로워" or "12,345 followers"
  const cleaned = text.replace(/,/g, "").trim();
  const mMatch = cleaned.match(/^([\d.]+)만/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 10000);
  const kMatch = cleaned.match(/^([\d.]+)[Kk]/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const mBigMatch = cleaned.match(/^([\d.]+)[Mm]/);
  if (mBigMatch) return Math.round(parseFloat(mBigMatch[1]) * 1000000);
  const numMatch = cleaned.match(/^[\d]+$/);
  if (numMatch) return parseInt(cleaned);
  return null;
}

async function fetchInstagramFollowers(handle: string): Promise<SocialResult> {
  const username = handle.replace(/^@/, "");
  try {
    // Instagram 내부 API (공개 프로필, 인증 불필요)
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        headers: {
          ...HEADERS,
          "X-IG-App-ID": "936619743392459",
          "X-Requested-With": "XMLHttpRequest",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const count = data?.data?.user?.edge_followed_by?.count;
      if (typeof count === "number") return { followers: count };
    }

    // fallback: og:description 파싱
    const htmlRes = await fetch(`https://www.instagram.com/${username}/`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!htmlRes.ok) return { followers: null, error: `HTTP ${htmlRes.status}` };

    const html = await htmlRes.text();
    // og:description: "1.2만 팔로워, 500 팔로잉, 게시물 84개"
    const ogMatch = html.match(/content="([\d.,만Kk]+)\s*팔로워/i);
    if (ogMatch) {
      const n = parseFollowerText(ogMatch[1]);
      if (n) return { followers: n };
    }
    return { followers: null, error: "파싱 실패" };
  } catch (e) {
    return { followers: null, error: String(e) };
  }
}

async function fetchXFollowers(handle: string): Promise<SocialResult> {
  const username = handle.replace(/^@/, "");
  try {
    // X 공개 프로필 — __NEXT_DATA__ JSON에 팔로워 수 포함된 경우
    const res = await fetch(`https://x.com/${username}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { followers: null, error: `HTTP ${res.status}` };

    const html = await res.text();

    // __NEXT_DATA__ 내 followers_count
    const nextDataMatch = html.match(/"followers_count":(\d+)/);
    if (nextDataMatch) return { followers: parseInt(nextDataMatch[1]) };

    // meta description: "N Followers, M Following, P posts"
    const metaMatch = html.match(/([\d,]+)\s*Followers/i);
    if (metaMatch) {
      const n = parseFollowerText(metaMatch[1]);
      if (n) return { followers: n };
    }

    return { followers: null, error: "파싱 실패 (JS 렌더링)" };
  } catch (e) {
    return { followers: null, error: String(e) };
  }
}

async function fetchThreadsFollowers(handle: string): Promise<SocialResult> {
  const username = handle.replace(/^@/, "");
  try {
    const res = await fetch(`https://www.threads.net/@${username}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { followers: null, error: `HTTP ${res.status}` };

    const html = await res.text();

    // Threads og:description: "X followers"
    const ogMatch = html.match(/content="([\d.,만Kk]+)\s*(followers|팔로워)/i);
    if (ogMatch) {
      const n = parseFollowerText(ogMatch[1]);
      if (n) return { followers: n };
    }

    // __SSR_DATA__ 또는 JSON 블록
    const jsonMatch = html.match(/"follower_count":(\d+)/);
    if (jsonMatch) return { followers: parseInt(jsonMatch[1]) };

    return { followers: null, error: "파싱 실패" };
  } catch (e) {
    return { followers: null, error: String(e) };
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { instagram, twitter, threads } = body as {
    instagram?: string;
    twitter?: string;
    threads?: string;
  };

  const [igResult, xResult, thResult] = await Promise.all([
    instagram ? fetchInstagramFollowers(instagram) : Promise.resolve({ followers: null }),
    twitter ? fetchXFollowers(twitter) : Promise.resolve({ followers: null }),
    threads ? fetchThreadsFollowers(threads) : Promise.resolve({ followers: null }),
  ]);

  return NextResponse.json({
    instagram: igResult,
    twitter: xResult,
    threads: thResult,
  });
}

/**
 * YouTube Data API v3 — 채널 구독자 수 조회
 * URL 형식:
 *   https://www.youtube.com/@channelHandle
 *   https://www.youtube.com/channel/UCxxxxxxx
 *   https://youtube.com/@handle
 */

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

export interface ChannelInfo {
  channelId: string;
  title: string;
  subscriberCount: number;
  viewCount: number;
  thumbnailUrl: string;
}

function extractHandleOrId(url: string): { type: "handle" | "id"; value: string } | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const pathname = u.pathname;

    // @handle 형식
    const handleMatch = pathname.match(/^\/@([^/]+)/);
    if (handleMatch) return { type: "handle", value: handleMatch[1] };

    // /channel/UC... 형식
    const idMatch = pathname.match(/^\/channel\/(UC[^/]+)/);
    if (idMatch) return { type: "id", value: idMatch[1] };

    // /c/name 형식
    const cMatch = pathname.match(/^\/c\/([^/]+)/);
    if (cMatch) return { type: "handle", value: cMatch[1] };

    return null;
  } catch {
    return null;
  }
}

export async function getYoutubeChannelInfo(
  url: string
): Promise<ChannelInfo | null> {
  if (!YT_API_KEY) throw new Error("YOUTUBE_API_KEY 환경변수가 없습니다");

  const extracted = extractHandleOrId(url);
  if (!extracted) return null;

  let apiUrl: string;
  if (extracted.type === "handle") {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(extracted.value)}&key=${YT_API_KEY}`;
  } else {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${extracted.value}&key=${YT_API_KEY}`;
  }

  const res = await fetch(apiUrl);
  if (!res.ok) return null;

  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;

  return {
    channelId: item.id,
    title: item.snippet.title,
    subscriberCount: parseInt(item.statistics.subscriberCount ?? "0"),
    viewCount: parseInt(item.statistics.viewCount ?? "0"),
    thumbnailUrl: item.snippet.thumbnails?.default?.url ?? "",
  };
}

/**
 * 구독자 수 → 팬덤 스코어 (0~1)
 * log scale: 100만 구독자 = ~0.8, 10만 = ~0.6, 1만 = ~0.4
 */
export function subscriberToFandomScore(subscribers: number): number {
  if (subscribers <= 0) return 0;
  // log10(1) = 0, log10(10M) = 7
  const score = Math.log10(subscribers + 1) / 7;
  return Math.min(1, score);
}

/**
 * 배우 여러 명의 팬덤 스코어 합산 (상위 3명 가중 합산)
 */
export function aggregateFandomScore(scores: number[]): number {
  if (scores.length === 0) return 0.5; // 기본값 (데이터 없음)
  const sorted = [...scores].sort((a, b) => b - a);
  // 1위 × 0.5 + 2위 × 0.3 + 3위 × 0.2
  const weights = [0.5, 0.3, 0.2];
  let total = 0;
  let wSum = 0;
  for (let i = 0; i < Math.min(sorted.length, 3); i++) {
    total += sorted[i] * weights[i];
    wSum += weights[i];
  }
  return total / wSum;
}

/** 장르별 플랫폼 가중치 */
const PLATFORM_WEIGHTS: Record<string, { yt: number; ig: number; x: number; th: number }> = {
  musical:     { yt: 0.50, ig: 0.30, x: 0.15, th: 0.05 },
  play:        { yt: 0.45, ig: 0.35, x: 0.15, th: 0.05 },
  classical:   { yt: 0.60, ig: 0.25, x: 0.10, th: 0.05 },
  opera:       { yt: 0.55, ig: 0.28, x: 0.12, th: 0.05 },
  pop_concert: { yt: 0.35, ig: 0.40, x: 0.15, th: 0.10 },
};

/**
 * YouTube + Instagram + X + Threads 팔로워를 합산한 통합 팬덤 스코어 (0~1)
 * 데이터가 없는 플랫폼은 YouTube 스코어로 대체 (최소 보장)
 */
export function combinedFandomScore(params: {
  youtubeSubscribers: number;
  instagramFollowers?: number | null;
  twitterFollowers?: number | null;
  threadsFollowers?: number | null;
  genre?: string;
}): number {
  const w = PLATFORM_WEIGHTS[params.genre ?? "musical"] ?? PLATFORM_WEIGHTS.musical;

  const ytScore = subscriberToFandomScore(params.youtubeSubscribers);
  const igScore = params.instagramFollowers != null
    ? subscriberToFandomScore(params.instagramFollowers)
    : ytScore;  // 데이터 없으면 YouTube 기준으로 대체
  const xScore = params.twitterFollowers != null
    ? subscriberToFandomScore(params.twitterFollowers)
    : ytScore;
  const thScore = params.threadsFollowers != null
    ? subscriberToFandomScore(params.threadsFollowers)
    : ytScore;

  // 소셜 데이터가 하나도 없으면 YouTube만 사용
  const hasAny =
    params.instagramFollowers != null ||
    params.twitterFollowers != null ||
    params.threadsFollowers != null;

  if (!hasAny) return ytScore;

  return w.yt * ytScore + w.ig * igScore + w.x * xScore + w.th * thScore;
}

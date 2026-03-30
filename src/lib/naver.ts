/**
 * 네이버 API 연동
 * 1. 검색 API — 뉴스 버즈 (시간 감쇠 적용)
 * 2. 데이터랩 — 검색어 트렌드 (최근 3개월 평균)
 */

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

const HEADERS = () => ({
  "X-Naver-Client-Id": NAVER_CLIENT_ID!,
  "X-Naver-Client-Secret": NAVER_CLIENT_SECRET!,
  "Content-Type": "application/json",
});

export interface NewsBuzz {
  total: number;
  recentCount: number;
  buzzScore: number;
}

export interface TrendScore {
  avg: number;       // 최근 3개월 평균 검색량 (0~100)
  trendScore: number; // 0~1 정규화
}

/** 경과 일수 → 뉴스 가중치 */
function timeDecay(daysSince: number): number {
  if (daysSince <= 7)  return 1.0;
  if (daysSince <= 30) return 0.5;
  if (daysSince <= 90) return 0.2;
  return 0.05;
}

/** 날짜 포맷 YYYY-MM-DD */
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 네이버 뉴스 버즈 조회 (시간 감쇠 적용)
 */
export async function getNewsBuzz(name: string): Promise<NewsBuzz> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return { total: 0, recentCount: 0, buzzScore: 0 };
  }

  const query = encodeURIComponent(`${name} 공연`);
  const url = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=100&sort=date`;

  const res = await fetch(url, { headers: HEADERS() });
  if (!res.ok) return { total: 0, recentCount: 0, buzzScore: 0 };

  const data = await res.json();
  const total: number = data.total ?? 0;
  const items: Array<{ pubDate: string }> = data.items ?? [];

  const now = Date.now();
  let weightedSum = 0;
  let recentCount = 0;

  for (const item of items) {
    const pub = new Date(item.pubDate).getTime();
    if (isNaN(pub)) continue;
    const daysSince = (now - pub) / (1000 * 60 * 60 * 24);
    weightedSum += timeDecay(daysSince);
    if (daysSince <= 30) recentCount++;
  }

  const buzzScore = Math.min(1, weightedSum / 100);
  return { total, recentCount, buzzScore };
}

/**
 * 네이버 데이터랩 검색어 트렌드 조회
 * 최근 3개월 평균 검색량 → 0~1 트렌드 스코어
 */
export async function getTrendScore(name: string): Promise<TrendScore> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return { avg: 0, trendScore: 0 };
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  const body = JSON.stringify({
    startDate: fmtDate(startDate),
    endDate: fmtDate(endDate),
    timeUnit: "month",
    keywordGroups: [{ groupName: name, keywords: [name] }],
  });

  try {
    const res = await fetch("https://openapi.naver.com/v1/datalab/search", {
      method: "POST",
      headers: HEADERS(),
      body,
    });

    if (!res.ok) return { avg: 0, trendScore: 0 };

    const data = await res.json();
    const ratios: number[] = (data.results?.[0]?.data ?? []).map(
      (d: { ratio: number }) => d.ratio
    );

    if (ratios.length === 0) return { avg: 0, trendScore: 0 };

    const avg = ratios.reduce((s, v) => s + v, 0) / ratios.length;
    // 데이터랩 ratio는 0~100, 50 이상이면 트렌드 강세
    const trendScore = Math.min(1, avg / 100);

    return { avg, trendScore };
  } catch {
    return { avg: 0, trendScore: 0 };
  }
}

/**
 * YouTube + 뉴스 버즈 + 데이터랩 트렌드 합산
 * 장르별 가중치를 받아 계산. 기본값: YouTube 60% + 뉴스 20% + 트렌드 20%
 */
export function combineFandomScore(
  youtubeScore: number,
  buzzScore: number,
  trendScore: number,
  weights = { youtube: 0.6, news: 0.2, trend: 0.2 }
): number {
  return (
    youtubeScore * weights.youtube +
    buzzScore * weights.news +
    trendScore * weights.trend
  );
}

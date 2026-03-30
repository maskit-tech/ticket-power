/**
 * 네이버 검색 API — 뉴스 버즈 조회 (시간 감쇠 적용)
 *
 * 단순 기사 수가 아니라 최신 기사일수록 높은 가중치를 부여한다.
 * 7일 이내 기사 = 1.0 / 30일 이내 = 0.5 / 90일 이내 = 0.2 / 이후 = 0.05
 */

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

export interface NewsBuzz {
  total: number;        // 검색된 총 기사 수
  recentCount: number;  // 최근 30일 기사 수
  buzzScore: number;    // 0~1 시간 감쇠 적용 스코어
}

/** 경과 일수 → 가중치 */
function timeDecay(daysSince: number): number {
  if (daysSince <= 7)  return 1.0;
  if (daysSince <= 30) return 0.5;
  if (daysSince <= 90) return 0.2;
  return 0.05;
}

/**
 * 배우 이름으로 최근 뉴스 기사 조회 + 시간 감쇠 스코어 계산
 * 최근 100건의 pubDate를 파싱해 가중 합산
 */
export async function getNewsBuzz(name: string): Promise<NewsBuzz> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return { total: 0, recentCount: 0, buzzScore: 0 };
  }

  const query = encodeURIComponent(`${name} 공연`);
  const url = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=100&sort=date`;

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    },
  });

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

  // 가중 합산 → 0~1 정규화
  // 최근 100건이 모두 7일 이내면 100점 → 1.0
  const buzzScore = Math.min(1, weightedSum / 100);

  return { total, recentCount, buzzScore };
}

/**
 * YouTube 팬덤 스코어와 뉴스 버즈 스코어를 합산
 * YouTube 70% + 뉴스(최신성 반영) 30%
 */
export function combineFandomScore(youtubeScore: number, buzzScore: number): number {
  return youtubeScore * 0.7 + buzzScore * 0.3;
}

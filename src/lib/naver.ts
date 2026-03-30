/**
 * 네이버 검색 API — 뉴스 버즈 조회
 * 배우/공연 이름으로 최근 뉴스 기사 수를 카운트해 팬덤 보조 지표로 활용
 */

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

export interface NewsBuzz {
  total: number;       // 검색된 총 기사 수
  buzzScore: number;   // 0~1 정규화 스코어
}

/**
 * 배우 이름으로 최근 뉴스 기사 수 조회
 * 검색어: "{name} 뮤지컬" 또는 "{name} 공연"
 */
export async function getNewsBuzz(name: string): Promise<NewsBuzz> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return { total: 0, buzzScore: 0 };
  }

  const query = encodeURIComponent(`${name} 공연`);
  const url = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=1&sort=date`;

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    },
  });

  if (!res.ok) return { total: 0, buzzScore: 0 };

  const data = await res.json();
  const total: number = data.total ?? 0;

  // 기사 수 → 0~1 스코어
  // 1만건 이상이면 1.0 (유명 공연/배우), 100건 미만이면 0.1
  const buzzScore = Math.min(1, Math.log10(total + 1) / 4);

  return { total, buzzScore };
}

/**
 * YouTube 팬덤 스코어와 뉴스 버즈 스코어를 합산
 * YouTube 70% + 뉴스 30% 가중 합산
 */
export function combineFandomScore(youtubeScore: number, buzzScore: number): number {
  return youtubeScore * 0.7 + buzzScore * 0.3;
}

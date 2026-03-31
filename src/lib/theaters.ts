/**
 * 주요 뮤지컬 공연장 데이터
 *
 * highRate: KOPIS 이력상 해당 극장 공연 중 HIGH 티어 비율 (도메인 지식 + 학습 데이터 기반)
 * grade: 흥행지수 등급 (S/A/B/C)
 *   S: highRate 60%+ — 대형 흥행작 전용관
 *   A: highRate 40~60% — 검증된 상업 뮤지컬 무대
 *   B: highRate 20~40% — 중간 규모
 *   C: highRate 20% 미만 — 소극장/실험극
 */

export interface Theater {
  id: string;
  name: string;
  seatcnt: number;
  venueTier: 0 | 1 | 2;
  district: string;         // 지역 (대학로, 강남, 강서 등)
  highRate: number;         // 과거 HIGH 티어 공연 비율 (0~1)
  grade: "S" | "A" | "B" | "C";
  representativeShows: string[]; // 대표 공연
}

export const THEATERS: Theater[] = [
  // ─── 대극장 ───────────────────────────────────────────────────────────
  {
    id: "bluesquare-shinhan",
    name: "블루스퀘어 신한카드홀",
    seatcnt: 1766,
    venueTier: 2,
    district: "한남동",
    highRate: 0.70,
    grade: "S",
    representativeShows: ["지킬앤하이드", "위키드", "레베카", "엘리자벳"],
  },
  {
    id: "charlotte",
    name: "샤롯데씨어터",
    seatcnt: 1232,
    venueTier: 2,
    district: "잠실",
    highRate: 0.65,
    grade: "S",
    representativeShows: ["알라딘", "오페라의 유령", "시카고"],
  },
  {
    id: "sejong-grand",
    name: "세종문화회관 대극장",
    seatcnt: 3022,
    venueTier: 2,
    district: "광화문",
    highRate: 0.55,
    grade: "A",
    representativeShows: ["노트르담 드 파리", "황금별"],
  },
  {
    id: "lg-arts-signature",
    name: "LG아트센터 서울 LG SIGNATURE홀",
    seatcnt: 1335,
    venueTier: 2,
    district: "마곡",
    highRate: 0.68,
    grade: "S",
    representativeShows: ["레베카", "마타하리", "모차르트!"],
  },
  {
    id: "chungmu-grand",
    name: "충무아트센터 대극장",
    seatcnt: 1800,
    venueTier: 2,
    district: "중구",
    highRate: 0.52,
    grade: "A",
    representativeShows: ["영웅", "빈센조"],
  },
  {
    id: "national-haoreum",
    name: "국립극장 해오름극장",
    seatcnt: 1563,
    venueTier: 2,
    district: "장충동",
    highRate: 0.45,
    grade: "A",
    representativeShows: ["명성황후", "젊은 베르테르의 슬픔"],
  },
  {
    id: "olympic-kspo",
    name: "올림픽공원 KSPO DOME",
    seatcnt: 15000,
    venueTier: 2,
    district: "올림픽공원",
    highRate: 0.72,
    grade: "S",
    representativeShows: ["콘서트 뮤지컬"],
  },
  {
    id: "nodelseom-amphitheater",
    name: "노들섬 라이브하우스",
    seatcnt: 3000,
    venueTier: 2,
    district: "노들섬",
    highRate: 0.48,
    grade: "A",
    representativeShows: ["야외 뮤지컬"],
  },

  // ─── 클래식 전용홀 ─────────────────────────────────────────────────────
  {
    id: "arts-concert-hall",
    name: "예술의전당 콘서트홀",
    seatcnt: 2523,
    venueTier: 2,
    district: "서초",
    highRate: 0.62,
    grade: "S",
    representativeShows: ["정명훈", "조성진", "임윤찬", "베를린 필"],
  },
  {
    id: "arts-ibk-chamber",
    name: "예술의전당 IBK챔버홀",
    seatcnt: 354,
    venueTier: 0,
    district: "서초",
    highRate: 0.30,
    grade: "B",
    representativeShows: ["실내악", "독주회"],
  },
  {
    id: "lotte-concert-hall",
    name: "롯데콘서트홀",
    seatcnt: 2036,
    venueTier: 2,
    district: "잠실",
    highRate: 0.55,
    grade: "A",
    representativeShows: ["라이프치히 게반트하우스", "빈 필", "조성진"],
  },
  {
    id: "sejong-chamber",
    name: "세종문화회관 체임버홀",
    seatcnt: 300,
    venueTier: 0,
    district: "광화문",
    highRate: 0.25,
    grade: "B",
    representativeShows: ["실내악", "독주회"],
  },
  {
    id: "kumho-art-hall",
    name: "금호아트홀 연세",
    seatcnt: 396,
    venueTier: 0,
    district: "신촌",
    highRate: 0.28,
    grade: "B",
    representativeShows: ["금호영아티스트", "독주회"],
  },
  {
    id: "national-chamber",
    name: "국립국악원 예악당",
    seatcnt: 1500,
    venueTier: 1,
    district: "서초",
    highRate: 0.35,
    grade: "B",
    representativeShows: ["국악 관현악", "무용"],
  },

  // ─── 중극장 ───────────────────────────────────────────────────────────
  {
    id: "arts-cj-towol",
    name: "예술의전당 CJ토월극장",
    seatcnt: 1002,
    venueTier: 1,
    district: "서초",
    highRate: 0.58,
    grade: "A",
    representativeShows: ["스위니 토드", "넥스트 투 노멀"],
  },
  {
    id: "arts-opera",
    name: "예술의전당 오페라극장",
    seatcnt: 2340,
    venueTier: 2,
    district: "서초",
    highRate: 0.50,
    grade: "A",
    representativeShows: ["오페라의 유령", "레미제라블"],
  },
  {
    id: "hongik-grand",
    name: "홍익대 대학로 아트센터 대극장",
    seatcnt: 1404,
    venueTier: 1,
    district: "대학로",
    highRate: 0.42,
    grade: "A",
    representativeShows: ["드라큘라", "아이다"],
  },
  {
    id: "dcube-link",
    name: "디큐브 링크아트센터",
    seatcnt: 1300,
    venueTier: 1,
    district: "구로",
    highRate: 0.45,
    grade: "A",
    representativeShows: ["베르테르", "팬텀"],
  },
  {
    id: "dongyang1",
    name: "동양예술극장 1관",
    seatcnt: 618,
    venueTier: 1,
    district: "대학로",
    highRate: 0.35,
    grade: "B",
    representativeShows: ["스모크", "인터뷰"],
  },
  {
    id: "doosan-yeongang",
    name: "두산아트센터 연강홀",
    seatcnt: 730,
    venueTier: 1,
    district: "종로",
    highRate: 0.38,
    grade: "B",
    representativeShows: ["나비부인", "오케피!"],
  },
  {
    id: "myungbo",
    name: "명보아트홀",
    seatcnt: 500,
    venueTier: 1,
    district: "충무로",
    highRate: 0.32,
    grade: "B",
    representativeShows: ["형제는 용감했다"],
  },
  {
    id: "sejong-sochang",
    name: "세종문화회관 M씨어터",
    seatcnt: 609,
    venueTier: 1,
    district: "광화문",
    highRate: 0.40,
    grade: "B",
    representativeShows: ["손드하임 시리즈"],
  },
  {
    id: "chungmu-sotheater",
    name: "충무아트센터 중극장 블루",
    seatcnt: 680,
    venueTier: 1,
    district: "중구",
    highRate: 0.36,
    grade: "B",
    representativeShows: ["서편제", "세자매"],
  },

  // ─── 소극장 (대학로) ────────────────────────────────────────────────────
  {
    id: "yes24-stage1",
    name: "예스24 스테이지 1관",
    seatcnt: 278,
    venueTier: 0,
    district: "대학로",
    highRate: 0.20,
    grade: "C",
    representativeShows: ["소규모 창작 뮤지컬"],
  },
  {
    id: "tom1",
    name: "대학로 TOM(티오엠) 1관",
    seatcnt: 295,
    venueTier: 0,
    district: "대학로",
    highRate: 0.22,
    grade: "C",
    representativeShows: ["쓰릴 미", "스웨그에이지"],
  },
  {
    id: "dreamsquare",
    name: "드림씨어터",
    seatcnt: 230,
    venueTier: 0,
    district: "대학로",
    highRate: 0.18,
    grade: "C",
    representativeShows: ["소규모 뮤지컬"],
  },
  {
    id: "arko-daehagno",
    name: "아르코예술극장 대극장",
    seatcnt: 669,
    venueTier: 1,
    district: "대학로",
    highRate: 0.28,
    grade: "B",
    representativeShows: ["창작 뮤지컬"],
  },
  {
    id: "hyehwa-dongsung",
    name: "혜화 동숭아트센터 동숭홀",
    seatcnt: 476,
    venueTier: 0,
    district: "대학로",
    highRate: 0.25,
    grade: "B",
    representativeShows: ["그날들", "마이 버킷 리스트"],
  },
  {
    id: "uniarts",
    name: "유니플렉스 1관",
    seatcnt: 300,
    venueTier: 0,
    district: "대학로",
    highRate: 0.20,
    grade: "C",
    representativeShows: ["창작 소극장 뮤지컬"],
  },
];

// 등급 라벨
export const THEATER_GRADE_LABEL: Record<string, string> = {
  S: "S — 최고 흥행지수",
  A: "A — 검증된 상업 무대",
  B: "B — 중간 규모",
  C: "C — 소극장",
};

export const THEATER_GRADE_COLOR: Record<string, string> = {
  S: "text-red-600 bg-red-50",
  A: "text-orange-600 bg-orange-50",
  B: "text-yellow-600 bg-yellow-50",
  C: "text-gray-600 bg-gray-50",
};

export function getActorGrade(subscriberCount: number): {
  grade: "S" | "A" | "B" | "C" | "D";
  label: string;
  color: string;
} {
  if (subscriberCount >= 1_000_000)
    return { grade: "S", label: "S — 100만+ 구독자", color: "text-red-600 bg-red-50" };
  if (subscriberCount >= 100_000)
    return { grade: "A", label: "A — 10만+ 구독자", color: "text-orange-600 bg-orange-50" };
  if (subscriberCount >= 10_000)
    return { grade: "B", label: "B — 1만+ 구독자", color: "text-yellow-600 bg-yellow-50" };
  if (subscriberCount >= 1_000)
    return { grade: "C", label: "C — 1천+ 구독자", color: "text-blue-600 bg-blue-50" };
  return { grade: "D", label: "D — 신인/데이터 없음", color: "text-gray-500 bg-gray-50" };
}

export function searchTheaters(query: string): Theater[] {
  if (!query.trim()) return THEATERS;
  const q = query.toLowerCase();
  return THEATERS.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.district.toLowerCase().includes(q) ||
      t.representativeShows.some((s) => s.toLowerCase().includes(q))
  );
}

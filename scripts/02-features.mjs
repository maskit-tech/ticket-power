/**
 * 02-features.mjs
 * kopis-raw-v2.json → features-v2.json
 *
 * 신규 피처:
 *   - repertoireGrade: 레퍼토리/작품 브랜드 등급 (0~3)
 *   - priceElasticityPenalty: 가격 탄력성 패널티 (장르별 기준가 초과분)
 *
 * 실행: node scripts/02-features.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IN = path.join(__dirname, "../data/kopis-raw-v2.json");
const OUT = path.join(__dirname, "../data/features-v2.json");

// ── 레퍼토리 등급 분류 ─────────────────────────────────────────────────────────
// 0: 신작/실험작 | 1: 알려진 작품 | 2: 대중적 명작 | 3: 세계적 명작

const WORLD_CLASSICS_MUSICAL = [
  "레미제라블", "오페라의유령", "캣츠", "위키드", "시카고", "맘마미아",
  "미스사이공", "해밀턴", "킹키부츠", "렌트", "지킬앤하이드", "엘리자벳",
  "모차르트", "드라큘라", "마리퀴리", "노트르담 드 파리", "노트르담드파리",
];
const POPULAR_CLASSICS_MUSICAL = [
  "빨래", "광화문연가", "명성황후", "그날들", "사랑의 불시착", "어쩌면해피엔딩",
  "스웨그에이지", "신흥무관학교", "더 모먼트", "알라딘", "라이온킹", "겨울왕국",
  "노트르담", "미녀와야수", "호두까기인형", "카르멘", "투란도트",
];

const WORLD_CLASSICS_CLASSICAL = [
  "베토벤 9번", "베토벤9번", "합창", "운명", "베토벤 5번",
  "차이콥스키", "브람스", "말러", "브루크너", "드보르자크",
  "모차르트 레퀴엠", "사계", "바흐", "헨델", "비발디",
  "슈베르트", "슈만", "멘델스존",
];
const POPULAR_CLASSICS_CLASSICAL = [
  "베토벤", "모차르트", "쇼팽", "리스트", "라흐마니노프",
  "시벨리우스", "드비시", "라벨", "프로코피예프", "스트라빈스키",
  "피아노 협주곡", "바이올린 협주곡", "첼로 협주곡",
];

const WORLD_CLASSICS_OPERA = [
  "라트라비아타", "la traviata", "나비부인", "피가로", "마술피리",
  "리골레토", "아이다", "토스카", "카발레리아", "팔리아치",
  "돈조반니", "코지판투테", "세비야의이발사",
];

const KNOWN_PLAY = [
  "햄릿", "리어왕", "맥베스", "오셀로", "한여름밤의꿈",
  "고도를기다리며", "벚꽃동산", "갈매기", "세자매",
  "유리동물원", "욕망이라는이름의전차",
];

function getRepertoireGrade(prfnm, genre) {
  const name = prfnm.replace(/\s/g, "").toLowerCase();

  if (genre === "musical") {
    if (WORLD_CLASSICS_MUSICAL.some((k) => name.includes(k.replace(/\s/g, "").toLowerCase()))) return 3;
    if (POPULAR_CLASSICS_MUSICAL.some((k) => name.includes(k.replace(/\s/g, "").toLowerCase()))) return 2;
    // 라이선스 작품은 최소 1
    if (/오리지널|브로드웨이|웨스트엔드|라이선스/.test(prfnm)) return Math.max(1, 1);
    return 0;
  }

  if (genre === "classical") {
    if (WORLD_CLASSICS_CLASSICAL.some((k) => prfnm.includes(k))) return 3;
    if (POPULAR_CLASSICS_CLASSICAL.some((k) => prfnm.includes(k))) return 2;
    return 1; // 클래식은 최소 1 (공연 자체가 레퍼토리 기반)
  }

  if (genre === "opera") {
    if (WORLD_CLASSICS_OPERA.some((k) => name.includes(k.replace(/\s/g, "").toLowerCase()))) return 3;
    return 2; // 오페라 자체가 레퍼토리 기반
  }

  if (genre === "play") {
    if (KNOWN_PLAY.some((k) => name.includes(k.replace(/\s/g, "").toLowerCase()))) return 2;
    return 0;
  }

  // pop_concert: 아티스트 팬덤이 레퍼토리 대신
  return 1;
}

// ── 가격 탄력성 패널티 ─────────────────────────────────────────────────────────
// 장르별 "표준 티켓가" 기준. 이를 초과할수록 수요 감소 패널티
// 탄력성 계수: 클래식/오페라는 낮음(고소득층), 뮤지컬/대중음악은 높음

const PRICE_ELASTICITY = {
  musical:     { basePrice: 130000, elasticity: 0.15 }, // 13만원 초과 시 탄력성 0.15
  classical:   { basePrice: 100000, elasticity: 0.08 }, // 10만원 초과 시 0.08 (낮음)
  opera:       { basePrice: 150000, elasticity: 0.06 }, // 고가 공연, 탄력성 낮음
  play:        { basePrice:  80000, elasticity: 0.20 }, // 연극은 고가에 민감
  pop_concert: { basePrice: 150000, elasticity: 0.12 },
};

function getPriceElasticityPenalty(priceMax, genre) {
  if (!priceMax || priceMax <= 0) return 0;
  const { basePrice, elasticity } = PRICE_ELASTICITY[genre] || PRICE_ELASTICITY.musical;
  if (priceMax <= basePrice) return 0;
  // 초과율 × 탄력성 계수 → occupancy penalty (0~1)
  const excess = (priceMax - basePrice) / basePrice;
  return Math.min(0.5, excess * elasticity); // 최대 50% 패널티
}

// ── 제작사/공연장 티어 ─────────────────────────────────────────────────────────

const TOP_COMPANIES = [
  "EMK", "오디컴퍼니", "신시컴퍼니", "CJ ENM", "쇼노트", "설앤컴퍼니",
  "HJ컬쳐", "마스트엔터", "드림씨어터", "프리진", "제이콘텐트리",
  "빅히트", "SM엔터", "YG엔터", "JYP엔터", "카카오", "하이브",
];
const MID_COMPANIES = ["극단", "뮤지컬컴퍼니", "스튜디오", "컴퍼니", "엔터테인먼트"];

const LARGE_VENUES = ["세종문화", "블루스퀘어", "디큐브", "샤롯데", "올림픽", "코엑스", "KSPO", "BEXCO", "킨텍스", "체조경기장", "수원월드컵", "잠실실내체육관"];
const MID_VENUES = ["예술의전당", "홍익대", "두산아트", "국립극장", "명보", "토월", "CJ토월", "롯데콘서트", "IBK챔버", "금호아트홀", "세종체임버"];

function getCompanyTier(company) {
  if (!company) return 0;
  const c = company.toUpperCase();
  if (TOP_COMPANIES.some((t) => c.includes(t.toUpperCase()))) return 2;
  if (MID_COMPANIES.some((t) => c.includes(t.toUpperCase()))) return 1;
  return company.length > 3 ? 1 : 0;
}

function getVenueTier(venue) {
  if (!venue) return 0;
  if (LARGE_VENUES.some((v) => venue.includes(v))) return 2;
  if (MID_VENUES.some((v) => venue.includes(v))) return 1;
  return 0;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

function main() {
  const raw = JSON.parse(fs.readFileSync(IN, "utf-8"));
  const shows = raw.shows;

  // 장르별 타깃 분포 계산 (각 장르 내에서 상대적 순위 사용)
  const byGenre = {};
  for (const s of shows) {
    if (!byGenre[s.genre]) byGenre[s.genre] = [];
    byGenre[s.genre].push(s);
  }

  const features = [];

  for (const [genre, genreShows] of Object.entries(byGenre)) {
    const scores = genreShows.map((s) => s.popularityScore).sort((a, b) => b - a);
    const p70 = scores[Math.floor(scores.length * 0.3)];
    const p30 = scores[Math.floor(scores.length * 0.7)];

    console.log(`\n${genre}: ${genreShows.length}개, HIGH≥${p70}, LOW≤${p30}`);

    for (const s of genreShows) {
      const companyTier = getCompanyTier(s.company);
      const venueTier = getVenueTier(s.venue);
      const repertoireGrade = getRepertoireGrade(s.prfnm, s.genre);
      const priceElasticityPenalty = getPriceElasticityPenalty(s.priceMax, s.genre);

      // 정규화 피처 (0~1)
      const f_seat = Math.min(1, (s.seatcnt || 500) / 3000);
      const f_period = Math.min(1, s.periodDays / 180);
      const f_company = companyTier / 2;
      const f_venue = venueTier / 2;
      const f_imported = s.isImported ? 0.4 : 0;
      const f_tour = s.isTour ? -0.1 : 0;
      const f_cap_adj = s.isImported
        ? Math.min(1, (s.capacity || 1) / 100000)
        : Math.min(1, (s.capacity || 1) / 500000);
      const f_price = Math.min(1, (s.priceMax || 0) / 200000) * (s.isImported ? 0.5 : 1);
      const f_repertoire = repertoireGrade / 3; // 0~1
      const f_price_penalty = priceElasticityPenalty; // occupancy에서 차감될 값

      // 장르 더미 (pop_concert = base)
      const f_musical    = genre === "musical"  ? 1 : 0;
      const f_play       = genre === "play"      ? 1 : 0;
      const f_classical  = genre === "classical" ? 1 : 0;
      const f_opera      = genre === "opera"     ? 1 : 0;

      const tier =
        s.popularityScore >= p70 ? "HIGH"
        : s.popularityScore <= p30 ? "LOW"
        : "MID";

      const f = {
        mt20id: s.mt20id,
        prfnm: s.prfnm,
        genre,
        // 원시값
        seatcnt: s.seatcnt || 0,
        periodDays: s.periodDays,
        priceMax: s.priceMax || 0,
        weeklyShows: s.weeklyShows,
        capacity: s.capacity || 0,
        company: s.company,
        venue: s.venue,
        companyTier,
        venueTier,
        repertoireGrade,
        priceElasticityPenalty,
        isTour: s.isTour,
        isImported: s.isImported,
        // 정규화 피처 벡터 (pop_concert = base category)
        vec: [1, f_seat, f_period, f_company, f_venue, f_imported + f_tour, f_cap_adj, f_price, f_repertoire, f_musical, f_play, f_classical, f_opera],
        // 타깃
        popularityScore: s.popularityScore,
        peakRank: s.peakRank,
        totalWeeksInTop50: s.totalWeeksInTop50,
        tier,
        // 장르별 임계값
        p70, p30,
      };
      features.push(f);
    }
  }

  // 레퍼토리 등급 분포 확인
  console.log("\n\n📊 레퍼토리 등급 분포");
  for (const grade of [0, 1, 2, 3]) {
    const count = features.filter((f) => f.repertoireGrade === grade).length;
    const highRate = features.filter((f) => f.repertoireGrade === grade && f.tier === "HIGH").length;
    console.log(`  등급 ${grade}: ${count}개, HIGH ${highRate}개 (${count > 0 ? ((highRate/count)*100).toFixed(0) : 0}%)`);
  }

  // 가격 탄력성 분포
  console.log("\n💰 가격 탄력성 패널티 > 0.1 공연 수:", features.filter((f) => f.priceElasticityPenalty > 0.1).length);

  const output = {
    builtAt: new Date().toISOString(),
    total: features.length,
    byGenre: Object.fromEntries(
      Object.keys(byGenre).map((g) => [g, features.filter((f) => f.genre === g).length])
    ),
    featureNames: ["bias", "좌석", "기간", "제작사", "공연장", "내한/투어보정", "capacity", "가격", "레퍼토리등급", "장르_뮤지컬", "장르_연극", "장르_클래식", "장르_오페라"],
    features,
  };

  fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
  console.log(`\n💾 저장: ${OUT} (${features.length}개)`);
}

main();

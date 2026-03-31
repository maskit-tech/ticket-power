/**
 * 01-collect.mjs
 * KOPIS 박스오피스 52주 × 5개 장르 수집
 *
 * 실행: node scripts/01-collect.mjs
 * 환경변수: KOPIS_API_KEY
 */

import fs from "fs";
import { parseStringPromise } from "xml2js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY = process.env.KOPIS_API_KEY || "e6ccbaace59c47a3a8d3e45a4f78d8bf";
const BASE = "http://kopis.or.kr/openApi/restful";
const DATA_DIR = path.join(__dirname, "../data");
const OUT = path.join(DATA_DIR, "kopis-raw-v2.json");
const DETAIL_CACHE = path.join(DATA_DIR, "detail-cache-v2.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// 수집 대상 장르 (KOPIS cate 필드값 → 우리 genre 키)
const GENRE_MAP = {
  "뮤지컬": "musical",
  "연극": "play",
  "서양음악(클래식)": "classical",
  "오페라": "opera",
  "대중음악": "pop_concert",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function dateToStr(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchXml(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const xml = await res.text();
    if (xml.includes("INVALID") || xml.includes("returncode")) {
      console.warn("  API 오류:", xml.slice(0, 120));
      return null;
    }
    return await parseStringPromise(xml, { explicitArray: false });
  } catch (e) {
    console.warn("  fetch 실패:", e.message);
    return null;
  }
}

function parsePrice(guidance) {
  if (!guidance) return 0;
  const nums = (guidance.match(/[\d,]+/g) || [])
    .map((s) => parseInt(s.replace(/,/g, "")))
    .filter((n) => n >= 1000 && n <= 2000000);
  return nums.length ? Math.max(...nums) : 0;
}

function parseWeeklyShows(dtguidance) {
  if (!dtguidance) return 5;
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const count = days.filter((d) => dtguidance.includes(d)).length;
  return count > 0 ? Math.min(count * 2, 14) : 5;
}

// ── 박스오피스 수집 ────────────────────────────────────────────────────────────

async function collectBoxoffice(weeksCount) {
  // map: mt20id → { prfnm, cate, seatcnt, weeks: [{rank, stdate}] }
  const map = new Map();

  for (let i = 0; i < weeksCount; i++) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - i * 7 - endDate.getDay()); // 지난 일요일
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);

    const stdate = dateToStr(startDate);
    const eddate = dateToStr(endDate);
    const url = `${BASE}/boxoffice?service=${KEY}&stdate=${stdate}&eddate=${eddate}`;

    process.stdout.write(`  주간 ${stdate}~${eddate} ... `);
    const data = await fetchXml(url);

    if (!data?.boxofs?.boxof) {
      console.log("빈 응답");
      await sleep(300);
      continue;
    }

    const entries = Array.isArray(data.boxofs.boxof)
      ? data.boxofs.boxof
      : [data.boxofs.boxof];

    // 수집 대상 장르만 필터
    const targets = entries.filter((e) => e.cate && GENRE_MAP[e.cate]);

    const summary = {};
    for (const e of targets) {
      const genre = GENRE_MAP[e.cate];
      const id = e.mt20id;
      const existing = map.get(id) || {
        mt20id: id,
        prfnm: e.prfnm,
        cate: e.cate,
        genre,
        seatcnt: parseInt(e.seatcnt) || 0,
        weeks: [],
      };
      existing.weeks.push({ rank: parseInt(e.rnum) || 50, stdate });
      if (parseInt(e.seatcnt) > 0) existing.seatcnt = parseInt(e.seatcnt);
      map.set(id, existing);
      summary[genre] = (summary[genre] || 0) + 1;
    }
    console.log(Object.entries(summary).map(([k, v]) => `${k}:${v}`).join(" ") || "0건");
    await sleep(250);
  }
  return map;
}

// ── 공연 상세 수집 ─────────────────────────────────────────────────────────────

async function fetchDetail(mt20id, cache) {
  if (cache.has(mt20id)) return cache.get(mt20id);

  const url = `${BASE}/pblprfr/${mt20id}?service=${KEY}`;
  const data = await fetchXml(url);
  const detail = data?.dbs?.db || null;
  cache.set(mt20id, detail);
  await sleep(150);
  return detail;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎭 KOPIS 52주 × 5장르 수집 시작");
  console.log("=".repeat(60));

  // 캐시 로드
  const detailCache = new Map(
    fs.existsSync(DETAIL_CACHE)
      ? Object.entries(JSON.parse(fs.readFileSync(DETAIL_CACHE, "utf-8")))
      : []
  );
  console.log(`  캐시 로드: ${detailCache.size}개`);

  // 1단계: 52주 박스오피스 수집
  console.log("\n📊 52주 박스오피스 수집 중...");
  const boxMap = await collectBoxoffice(52);

  const byGenre = {};
  for (const v of boxMap.values()) {
    byGenre[v.genre] = (byGenre[v.genre] || 0) + 1;
  }
  console.log("\n  장르별 고유 공연 수:", byGenre);

  // 2단계: 공연 상세 수집
  console.log("\n🔍 공연 상세 수집 중...");
  const records = [];
  let idx = 0;

  for (const [mt20id, box] of boxMap.entries()) {
    idx++;
    const ranks = box.weeks.map((w) => w.rank);
    const peakRank = Math.min(...ranks);
    const avgRank = ranks.reduce((s, r) => s + r, 0) / ranks.length;
    const popularityScore = ranks.reduce((s, r) => s + (51 - r), 0);
    const totalWeeksInTop50 = ranks.length;

    process.stdout.write(`  [${idx}/${boxMap.size}] ${mt20id} ${box.genre.padEnd(12)} `);

    const detail = await fetchDetail(mt20id, detailCache);

    // 공연 기간 계산
    const from = detail?.prfpdfrom || "";
    const to = detail?.prfpdto || "";
    let periodDays = 30;
    let prfpdfrom = from;
    let prfpdto = to;
    if (from && to) {
      const s = new Date(from.replace(/\./g, "-"));
      const e = new Date(to.replace(/\./g, "-"));
      if (!isNaN(s) && !isNaN(e)) {
        periodDays = Math.max(1, Math.round((e - s) / 86400000));
      }
    }

    const priceMax = parsePrice(detail?.pcseguidance);
    const priceGuidance = detail?.pcseguidance || "";
    const company = (detail?.entrpsnmP || detail?.entrpsnmH || detail?.entrpsnmS || "").trim();
    const cast = (detail?.prfcast || "").trim().slice(0, 200);
    const venue = (detail?.fcltynm || "").trim().split("(")[0].trim();
    const dtguidance = (detail?.dtguidance || "").trim();
    const weeklyShows = parseWeeklyShows(dtguidance);
    const seatcnt = box.seatcnt || 0;
    const capacity = seatcnt > 0
      ? seatcnt * Math.max(1, Math.round((periodDays / 7) * weeklyShows))
      : 0;

    // 내한/투어 여부
    const isImported = /내한|오리지널|브로드웨이|웨스트엔드|월드투어/.test(box.prfnm);
    const isTour = /\[(부산|대구|인천|광주|대전|수원|청주|울산|창원|고양|전주|제주)\]/.test(box.prfnm);

    console.log(
      `peak:${peakRank}위 ${totalWeeksInTop50}주 ${box.prfnm.slice(0, 18)}`
    );

    records.push({
      mt20id,
      prfnm: box.prfnm,
      genre: box.genre,
      cate: box.cate,
      prfpdfrom,
      prfpdto,
      seatcnt,
      periodDays,
      weeklyShows,
      capacity,
      priceMax,
      priceGuidance,
      company,
      cast,
      venue,
      dtguidance,
      isImported,
      isTour,
      weeks: box.weeks,
      peakRank,
      avgRank: Math.round(avgRank * 10) / 10,
      totalWeeksInTop50,
      popularityScore,
    });
  }

  // 캐시 저장
  fs.writeFileSync(DETAIL_CACHE, JSON.stringify(Object.fromEntries(detailCache), null, 2));

  // 결과 저장
  records.sort((a, b) => b.popularityScore - a.popularityScore);
  const output = {
    collectedAt: new Date().toISOString(),
    totalShows: records.length,
    byGenre: Object.fromEntries(
      Object.entries(GENRE_MAP).map(([, g]) => [g, records.filter((r) => r.genre === g).length])
    ),
    shows: records,
  };
  fs.writeFileSync(OUT, JSON.stringify(output, null, 2));

  // 요약
  console.log("\n\n📊 수집 결과 요약");
  console.log("─".repeat(60));
  for (const [genre, count] of Object.entries(output.byGenre)) {
    const genreRecords = records.filter((r) => r.genre === genre);
    const withPrice = genreRecords.filter((r) => r.priceMax > 0).length;
    const withSeat = genreRecords.filter((r) => r.seatcnt > 0).length;
    console.log(`  ${genre.padEnd(15)}: ${count}개 (가격있음 ${withPrice}, 좌석있음 ${withSeat})`);
  }
  console.log(`\n💾 저장: ${OUT}`);
}

main().catch(console.error);

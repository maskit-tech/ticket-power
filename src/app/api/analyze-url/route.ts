/**
 * 공연 URL 자동 분석 API
 * 지원: KOPIS, 인터파크, 예스24, 네이버 예매
 * JSON-LD(Schema.org Event) + OG 태그 + 사이트별 패턴 파싱
 */

import { NextResponse } from "next/server";
import { GENRE_CONFIG } from "@/lib/genres";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

const KOPIS_KEY = process.env.KOPIS_API_KEY || "";
const KOPIS_BASE = "http://kopis.or.kr/openApi/restful";

// ── 유틸리티 ──────────────────────────────────────────────────────────────────

function parsePrice(text: string): { min: number; max: number } {
  const nums = (text.match(/[\d,]+/g) || [])
    .map((s) => parseInt(s.replace(/,/g, "")))
    .filter((n) => n >= 1000 && n <= 2000000)
    .sort((a, b) => a - b);
  if (!nums.length) return { min: 0, max: 0 };
  return { min: nums[0], max: nums[nums.length - 1] };
}

function daysBetween(from: string, to: string): number {
  const s = new Date(from.replace(/\./g, "-"));
  const e = new Date(to.replace(/\./g, "-"));
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
}

function detectGenre(text: string): string {
  const t = text.toLowerCase();
  if (/뮤지컬|musical/.test(t)) return "musical";
  if (/오페라|opera/.test(t)) return "opera";
  if (/클래식|클라식|관현악|교향악|chamber|classical|concert/.test(t)) return "classical";
  if (/연극|play|drama/.test(t)) return "play";
  if (/콘서트|concert|팝|pop|rock|jazz/.test(t)) return "pop_concert";
  return "musical";
}

function parseWeeklyShows(text: string): number {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const count = days.filter((d) => text.includes(d)).length;
  return count > 0 ? Math.min(count * 2, 14) : 8;
}

// ── KOPIS API 파싱 ────────────────────────────────────────────────────────────

async function parseKopis(pblprfrNo: string) {
  const res = await fetch(`${KOPIS_BASE}/pblprfr/${pblprfrNo}?service=${KOPIS_KEY}`, {
    signal: AbortSignal.timeout(10000),
  });
  const xml = await res.text();

  const get = (tag: string) => xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`))?.[1]
    ?? xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))?.[1] ?? "";

  const prfnm = get("prfnm");
  const fcltynm = get("fcltynm");
  const prfpdfrom = get("prfpdfrom");
  const prfpdto = get("prfpdto");
  const pcseguidance = get("pcseguidance");
  const prfcast = get("prfcast");
  const entrpsnm = get("entrpsnmP") || get("entrpsnmH") || get("entrpsnmS");
  const dtguidance = get("dtguidance");
  const genrenm = get("genrenm");
  const seatcnt = parseInt(get("seatcnt")) || 0;
  const prfstate = get("prfstate"); // 공연중, 공연완료, 공연예정

  const genre = detectGenre(genrenm || prfnm);
  const period = daysBetween(prfpdfrom, prfpdto);
  const { min: priceMin, max: priceMax } = parsePrice(pcseguidance);
  const weeklyShows = parseWeeklyShows(dtguidance);
  const isImported = /내한|오리지널|브로드웨이|웨스트엔드/.test(prfnm);
  const isTour = /\[(부산|대구|인천|광주|대전|수원|청주|울산|창원)/.test(prfnm);
  const castNames = prfcast ? prfcast.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : [];

  return {
    source: "kopis",
    title: prfnm,
    venue: fcltynm.split("(")[0].trim(),
    genre,
    seatcnt,
    periodDays: period,
    weeklyShows,
    priceMin,
    priceMax,
    priceAvg: priceMin ? Math.round((priceMin + priceMax) / 2) : priceMax,
    company: entrpsnm,
    castNames,
    isImported,
    isTour,
    dateFrom: prfpdfrom,
    dateTo: prfpdto,
    prfstate,
    raw: { pblprfrNo, genrenm, dtguidance, pcseguidance },
  };
}

// ── JSON-LD / HTML 범용 파싱 ──────────────────────────────────────────────────

async function parseGenericUrl(url: string) {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // JSON-LD 추출
  const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  let jsonLd: Record<string, unknown> | null = null;
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      try {
        const text = block.replace(/<[^>]+>/g, "");
        const data = JSON.parse(text);
        const entries = Array.isArray(data) ? data : [data];
        const event = entries.find((e) => e["@type"] === "Event" || e["@type"] === "MusicEvent" || e["@type"] === "TheaterEvent");
        if (event) { jsonLd = event; break; }
      } catch { /* skip */ }
    }
  }

  // OG 태그
  const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)?.[1] ?? "";
  const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/)?.[1] ?? "";

  // title 태그
  const pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/)?.[1]?.trim() ?? "";

  // 인터파크 전용 패턴
  const isInterpark = url.includes("interpark");
  const isYes24 = url.includes("yes24");

  let title = "", venue = "", dateFrom = "", dateTo = "", castText = "", priceText = "", company = "";

  if (jsonLd) {
    title = (jsonLd.name as string) || "";
    venue = (jsonLd.location as { name?: string })?.name || "";
    dateFrom = (jsonLd.startDate as string) || "";
    dateTo = (jsonLd.endDate as string) || dateFrom;
    const offers = jsonLd.offers as { price?: number; lowPrice?: number; highPrice?: number; description?: string } | undefined;
    if (offers) priceText = `${offers.lowPrice ?? offers.price ?? 0}~${offers.highPrice ?? offers.price ?? 0}`;
    const performers = jsonLd.performer;
    if (Array.isArray(performers)) castText = performers.map((p: { name?: string }) => p.name).join(", ");
    company = (jsonLd.organizer as { name?: string })?.name || "";
  }

  if (!title) title = ogTitle || pageTitle;

  // 인터파크 HTML 패턴
  if (isInterpark && !venue) {
    venue = html.match(/장\s*소\s*[:|]\s*([^\n<]+)/)?.[1]?.trim()
      ?? html.match(/"venue"\s*:\s*"([^"]+)"/)?.[1]
      ?? "";
    if (!dateFrom) {
      const dateMatch = html.match(/(\d{4}[.\-]\d{2}[.\-]\d{2})[^\d]+(\d{4}[.\-]\d{2}[.\-]\d{2})/);
      if (dateMatch) { dateFrom = dateMatch[1]; dateTo = dateMatch[2]; }
    }
    if (!priceText) priceText = html.match(/가\s*격[:|]?\s*([\d,~\s원]+)/)?.[1] ?? "";
    if (!castText) castText = html.match(/출\s*연[:|]?\s*([^\n<]{5,100})/)?.[1] ?? "";
  }

  // YES24 HTML 패턴
  if (isYes24 && !venue) {
    venue = html.match(/공연장\s*[:|]\s*([^\n<]+)/)?.[1]?.trim() ?? "";
    const dateMatch = html.match(/(\d{4}\.\d{2}\.\d{2})\s*~\s*(\d{4}\.\d{2}\.\d{2})/);
    if (dateMatch && !dateFrom) { dateFrom = dateMatch[1]; dateTo = dateMatch[2]; }
    if (!priceText) priceText = html.match(/티켓가격[^:]*:\s*([\d,\s~원A-Z]+)/)?.[1] ?? "";
  }

  const genre = detectGenre(title + " " + ogDesc);
  const { min: priceMin, max: priceMax } = parsePrice(priceText);
  const period = dateFrom && dateTo ? daysBetween(dateFrom, dateTo) : 0;
  const castNames = castText ? castText.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : [];

  return {
    source: isInterpark ? "interpark" : isYes24 ? "yes24" : "web",
    title: title.replace(/\s*[-|]\s*.+$/, "").trim(),
    venue: venue.replace(/\(.+\)/, "").trim(),
    genre,
    seatcnt: 0,
    periodDays: period,
    weeklyShows: 8,
    priceMin,
    priceMax,
    priceAvg: priceMin ? Math.round((priceMin + priceMax) / 2) : priceMax,
    company,
    castNames,
    isImported: /내한|오리지널|브로드웨이|웨스트엔드/.test(title),
    isTour: /\[(부산|대구|인천|광주|대전|수원)/.test(title),
    dateFrom,
    dateTo,
    prfstate: "공연예정",
    raw: { url, ogDesc },
  };
}

// ── 메인 핸들러 ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL이 필요합니다" }, { status: 400 });
  }

  try {
    let result;

    // KOPIS 링크 감지: pblprfrNo 파라미터 또는 /pblprfr/ 경로
    const kopisMatch =
      url.match(/pblprfrNo=([A-Z0-9]+)/i) ??
      url.match(/\/pblprfr\/([A-Z0-9]+)/i) ??
      url.match(/[?&]mt20id=([A-Z0-9]+)/i);

    if (kopisMatch) {
      result = await parseKopis(kopisMatch[1]);
    } else {
      result = await parseGenericUrl(url);
    }

    // 장르 설정 보강
    const genreConfig = GENRE_CONFIG[result.genre as keyof typeof GENRE_CONFIG] ?? GENRE_CONFIG.musical;

    return NextResponse.json({
      ...result,
      genreLabel: genreConfig.label ?? result.genre,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `분석 실패: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}

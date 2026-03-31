/**
 * 공연 URL 자동 분석 API
 * 지원: KOPIS, 인터파크, 예스24, 금호아트홀, 네이버 예매, 기타 (Gemini 폴백)
 */

import { NextResponse } from "next/server";
import { GENRE_CONFIG } from "@/lib/genres";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  // 만원 단위 처리: "5만원" → 50000
  const manwonMatch = text.match(/(\d+(?:\.\d+)?)\s*만\s*원/);
  if (manwonMatch) {
    const val = Math.round(parseFloat(manwonMatch[1]) * 10000);
    return { min: val, max: val };
  }
  const nums = (text.match(/[\d,]+/g) || [])
    .map((s) => parseInt(s.replace(/,/g, "")))
    .filter((n) => n >= 1000 && n <= 2000000)
    .sort((a, b) => a - b);
  if (!nums.length) return { min: 0, max: 0 };
  return { min: nums[0], max: nums[nums.length - 1] };
}

function daysBetween(from: string, to: string): number {
  const normalize = (s: string) => s.replace(/년\s*/g, "-").replace(/월\s*/g, "-").replace(/일.*/g, "").replace(/\./g, "-").trim();
  const s = new Date(normalize(from));
  const e = new Date(normalize(to));
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

function detectGenre(text: string): string {
  const t = text.toLowerCase();
  if (/뮤지컬|musical/.test(t)) return "musical";
  if (/오페라|opera/.test(t)) return "opera";
  if (/클래식|클라식|관현악|교향악|chamber|classical|concert|실내악|앙상블|피아노|바이올린|첼로|리사이틀|recital/.test(t)) return "classical";
  if (/연극|play|drama/.test(t)) return "play";
  if (/콘서트|concert|팝|pop|rock|jazz/.test(t)) return "pop_concert";
  return "musical";
}

function parseWeeklyShows(text: string): number {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const count = days.filter((d) => text.includes(d)).length;
  return count > 0 ? Math.min(count * 2, 14) : 8;
}

/** HTML에서 스크립트·스타일·태그 제거 후 텍스트만 추출 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
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
  const prfstate = get("prfstate");

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

// ── 금호아트홀 전용 파서 ──────────────────────────────────────────────────────

function parseKumhoArthall(html: string) {
  // 공연명: <h3 class="st"> 안
  const title = html.match(/<h3[^>]+class="st"[^>]*>([\s\S]*?)<\/h3>/)?.[1]
    ?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() ?? "";

  // dl.concertInfo의 dt/dd 쌍 파싱
  const concertInfoBlock = html.match(/<dl[^>]+class="concertInfo"[^>]*>([\s\S]*?)<\/dl>/)?.[1] ?? "";
  const dtddPairs: Record<string, string> = {};
  const dtddRegex = /<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g;
  let m: RegExpExecArray | null;
  while ((m = dtddRegex.exec(concertInfoBlock)) !== null) {
    const key = m[1].replace(/<[^>]+>/g, "").trim();
    const val = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    dtddPairs[key] = val;
  }

  const dateRaw = dtddPairs["공연일시"] ?? "";
  // "2026년 04월 02일 (목)" 파싱
  const dateMatch = dateRaw.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  const dateFrom = dateMatch ? `${dateMatch[1]}.${dateMatch[2].padStart(2, "0")}.${dateMatch[3].padStart(2, "0")}` : "";

  const castRaw = dtddPairs["연주자"] ?? dtddPairs["출연자"] ?? dtddPairs["출연"] ?? "";
  const castNames = castRaw ? castRaw.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : [];

  const priceRaw = dtddPairs["티켓정보"] ?? dtddPairs["입장권"] ?? "";
  const { min: priceMin, max: priceMax } = parsePrice(priceRaw);

  const fullText = title + " " + concertInfoBlock;
  const genre = detectGenre(fullText) === "musical" && /피아노|바이올린|첼로|비올라|실내악|앙상블|오케스트라|콘체르토|리사이틀/.test(html)
    ? "classical"
    : detectGenre(fullText);

  return {
    source: "kumho",
    title,
    venue: "금호아트홀 연세",
    genre,
    seatcnt: 410, // 금호아트홀 연세 좌석수
    periodDays: dateFrom ? 1 : 0,
    weeklyShows: 1,
    priceMin,
    priceMax,
    priceAvg: priceMin ? Math.round((priceMin + priceMax) / 2) : priceMax,
    company: "금호문화재단",
    castNames,
    isImported: false,
    isTour: false,
    dateFrom,
    dateTo: dateFrom,
    prfstate: "공연예정",
    raw: { dtddPairs },
  };
}

// ── Gemini 스마트 폴백 파서 ───────────────────────────────────────────────────

async function parseWithGemini(url: string, html: string): Promise<Record<string, unknown>> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY 없음");

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // 관련 텍스트만 추출 (최대 4000자)
  const text = stripHtml(html).slice(0, 4000);

  const prompt = `다음은 한국 공연 페이지의 텍스트입니다. URL: ${url}

아래 JSON으로 공연 정보를 추출해주세요. 없는 항목은 null로 하세요.

{
  "title": "공연명 (공연장명이나 사이트명 제외, 실제 공연 제목만)",
  "genre": "musical | classical | pop_concert | play | opera 중 하나",
  "venue": "공연장명",
  "dateFrom": "YYYY.MM.DD",
  "dateTo": "YYYY.MM.DD",
  "periodDays": 숫자,
  "weeklyShows": 숫자 (단일공연=1),
  "seatcnt": 숫자,
  "priceMin": 숫자 (원 단위),
  "priceMax": 숫자 (원 단위),
  "company": "주최/제작사",
  "castNames": ["이름1", "이름2"],
  "isImported": false,
  "isTour": false
}

JSON만 반환하고 다른 텍스트 없이:

${text}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : raw;
  return JSON.parse(jsonStr);
}

// ── JSON-LD / HTML 범용 파싱 ──────────────────────────────────────────────────

async function parseGenericUrl(url: string) {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // 금호아트홀 전용 파서
  if (url.includes("kumhoarthall") && html.includes("concertDetail")) {
    return parseKumhoArthall(html);
  }

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
  const pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/)?.[1]?.trim() ?? "";

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

  if (isInterpark && !venue) {
    venue = html.match(/장\s*소\s*[:|]\s*([^\n<]+)/)?.[1]?.trim()
      ?? html.match(/"venue"\s*:\s*"([^"]+)"/)?.[1] ?? "";
    if (!dateFrom) {
      const dateMatch = html.match(/(\d{4}[.\-]\d{2}[.\-]\d{2})[^\d]+(\d{4}[.\-]\d{2}[.\-]\d{2})/);
      if (dateMatch) { dateFrom = dateMatch[1]; dateTo = dateMatch[2]; }
    }
    if (!priceText) priceText = html.match(/가\s*격[:|]?\s*([\d,~\s원]+)/)?.[1] ?? "";
    if (!castText) castText = html.match(/출\s*연[:|]?\s*([^\n<]{5,100})/)?.[1] ?? "";
  }

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

  const result = {
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

  // Gemini 폴백: title이 비어있거나 페이지 타이틀(공연장명)과 동일한 경우
  const isBadTitle = !result.title || result.title === pageTitle || result.title === ogTitle;
  if (isBadTitle && process.env.GEMINI_API_KEY) {
    try {
      const geminiData = await parseWithGemini(url, html);
      return {
        ...result,
        source: "gemini",
        title: (geminiData.title as string) || result.title,
        genre: (geminiData.genre as string) || result.genre,
        venue: (geminiData.venue as string) || result.venue,
        seatcnt: (geminiData.seatcnt as number) || result.seatcnt,
        periodDays: (geminiData.periodDays as number) || result.periodDays,
        weeklyShows: (geminiData.weeklyShows as number) || result.weeklyShows,
        priceMin: (geminiData.priceMin as number) || result.priceMin,
        priceMax: (geminiData.priceMax as number) || result.priceMax,
        priceAvg: geminiData.priceMin && geminiData.priceMax
          ? Math.round(((geminiData.priceMin as number) + (geminiData.priceMax as number)) / 2)
          : result.priceAvg,
        company: (geminiData.company as string) || result.company,
        castNames: (geminiData.castNames as string[])?.length ? (geminiData.castNames as string[]) : result.castNames,
        isImported: geminiData.isImported ?? result.isImported,
        isTour: geminiData.isTour ?? result.isTour,
        dateFrom: (geminiData.dateFrom as string) || result.dateFrom,
        dateTo: (geminiData.dateTo as string) || result.dateTo,
      };
    } catch {
      // Gemini 실패 시 기존 결과 반환
    }
  }

  return result;
}

// ── 메인 핸들러 ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL이 필요합니다" }, { status: 400 });
  }

  try {
    let result;

    const kopisMatch =
      url.match(/pblprfrNo=([A-Z0-9]+)/i) ??
      url.match(/\/pblprfr\/([A-Z0-9]+)/i) ??
      url.match(/[?&]mt20id=([A-Z0-9]+)/i);

    if (kopisMatch) {
      result = await parseKopis(kopisMatch[1]);
    } else {
      result = await parseGenericUrl(url);
    }

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

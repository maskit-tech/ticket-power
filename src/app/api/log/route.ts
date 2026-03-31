/**
 * 사용 로그 수집 API
 * - 예측 이벤트, URL 분석 이벤트를 기록
 * - SUPABASE_URL + SUPABASE_ANON_KEY 환경변수가 있으면 DB에 저장
 * - 없으면 Vercel 서버 로그로만 출력 (console.log → Vercel Log Drains로 수집 가능)
 */

import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? "";

export async function POST(req: Request) {
  const body = await req.json();

  const log = {
    ...body,
    ts: new Date().toISOString(),
    ua: req.headers.get("user-agent")?.slice(0, 80) ?? "",
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
  };

  // 항상 서버 로그 (Vercel Functions → Log Explorer에서 조회 가능)
  console.log("[ticket-power]", JSON.stringify(log));

  // Supabase 저장 (환경변수 있을 때만)
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/ticket_power_logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(log),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // 로그 실패가 UX에 영향 주면 안 됨 — silently ignore
    }
  }

  return NextResponse.json({ ok: true });
}

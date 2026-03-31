/**
 * 기획서 파일 분석 API
 * - 지원: PDF, DOCX, TXT
 * - Gemini 1.5 Flash로 공연 정보 추출
 */

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const EXTRACT_PROMPT = `이 문서는 공연 기획서입니다. 아래 JSON 형식으로 공연 정보를 추출해주세요.
없는 항목은 null로 표시하세요.

{
  "title": "공연명",
  "genre": "musical | classical | pop_concert | play | opera 중 하나",
  "venue": "공연장명",
  "dateFrom": "YYYY.MM.DD 형식",
  "dateTo": "YYYY.MM.DD 형식",
  "periodDays": 숫자 (기간(일)),
  "weeklyShows": 숫자 (주당 공연 횟수),
  "seatcnt": 숫자 (좌석수),
  "priceMin": 숫자 (최저 티켓가, 원 단위),
  "priceMax": 숫자 (최고 티켓가, 원 단위),
  "company": "제작사명",
  "castNames": ["배우1", "배우2"],
  "isImported": true/false (내한·라이선스 공연 여부),
  "isTour": true/false (투어·지방 공연 여부),
  "summary": "문서 요약 (2-3줄)"
}

JSON만 반환하고 다른 텍스트는 포함하지 마세요.`;

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY 미설정" }, { status: 500 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "multipart/form-data 필요" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "파일 파싱 실패" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "file 필드 없음" }, { status: 400 });
  }

  // 5MB 제한
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "파일 크기 5MB 초과" }, { status: 400 });
  }

  const mime = file.type;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let result;

    if (mime === "application/pdf" || file.name.endsWith(".pdf")) {
      // PDF: inline base64로 직접 전달
      result = await model.generateContent([
        { inlineData: { mimeType: "application/pdf", data: buffer.toString("base64") } },
        EXTRACT_PROMPT,
      ]);
    } else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      // DOCX: mammoth으로 텍스트 추출
      const mammoth = await import("mammoth");
      const { value: text } = await mammoth.extractRawText({ buffer });
      result = await model.generateContent([EXTRACT_PROMPT, `\n\n문서 내용:\n${text.slice(0, 8000)}`]);
    } else if (mime.startsWith("text/") || file.name.endsWith(".txt")) {
      // TXT: 그대로
      const text = buffer.toString("utf-8");
      result = await model.generateContent([EXTRACT_PROMPT, `\n\n문서 내용:\n${text.slice(0, 8000)}`]);
    } else {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다. PDF, DOCX, TXT만 지원합니다." },
        { status: 400 }
      );
    }

    const text = result.response.text().trim();
    // JSON 블록 추출
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "Gemini 응답 파싱 실패", raw: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ...parsed });
  } catch (e) {
    return NextResponse.json(
      { error: `분석 실패: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}

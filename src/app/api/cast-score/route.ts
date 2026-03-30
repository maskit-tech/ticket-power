import { NextRequest, NextResponse } from "next/server";
import { getYoutubeChannelInfo, subscriberToFandomScore } from "@/lib/youtube";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "url 필요" }, { status: 400 });

    const info = await getYoutubeChannelInfo(url);
    if (!info) {
      return NextResponse.json({ error: "채널을 찾을 수 없습니다" }, { status: 404 });
    }

    return NextResponse.json({
      ...info,
      fandomScore: subscriberToFandomScore(info.subscriberCount),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

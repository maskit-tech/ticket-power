import { NextRequest, NextResponse } from "next/server";
import { subscriberToFandomScore } from "@/lib/youtube";
import { getActorGrade } from "@/lib/theaters";
import { getNewsBuzz, combineFandomScore } from "@/lib/naver";

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "이름을 입력해주세요" }, { status: 400 });
    }
    if (!YT_API_KEY) {
      return NextResponse.json({ error: "YouTube API 키 없음" }, { status: 500 });
    }

    // 1. YouTube 채널 검색 + 뉴스 버즈 병렬 조회
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(name + " 뮤지컬")}&type=channel&maxResults=4&key=${YT_API_KEY}`;
    const [searchRes, buzz] = await Promise.all([
      fetch(searchUrl),
      getNewsBuzz(name),
    ]);
    const searchData = await searchRes.json();

    if (!searchData.items?.length) {
      return NextResponse.json({ candidates: [], buzz });
    }

    // 2. 채널 상세 조회
    const channelIds = searchData.items.map((item: any) => item.id.channelId).join(",");
    const detailUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds}&key=${YT_API_KEY}`;
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json();

    const candidates = (detailData.items ?? []).map((item: any) => {
      const subscribers = parseInt(item.statistics?.subscriberCount ?? "0");
      const ytScore = subscriberToFandomScore(subscribers);
      const fandomScore = combineFandomScore(ytScore, buzz.buzzScore);
      const grade = getActorGrade(subscribers);
      return {
        channelId: item.id,
        title: item.snippet.title,
        description: item.snippet.description?.slice(0, 80) ?? "",
        thumbnailUrl: item.snippet.thumbnails?.default?.url ?? "",
        subscriberCount: subscribers,
        fandomScore,
        ytScore,
        buzzScore: buzz.buzzScore,
        buzzTotal: buzz.total,
        buzzRecent: buzz.recentCount,
        grade: grade.grade,
        gradeLabel: grade.label,
        gradeColor: grade.color,
        youtubeUrl: `https://www.youtube.com/channel/${item.id}`,
      };
    });

    return NextResponse.json({ candidates, buzz });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

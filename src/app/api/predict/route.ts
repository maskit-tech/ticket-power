import { NextRequest, NextResponse } from "next/server";
import { predict, ShowInput } from "@/lib/model";

export async function POST(req: NextRequest) {
  try {
    const body: ShowInput = await req.json();
    const result = predict(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

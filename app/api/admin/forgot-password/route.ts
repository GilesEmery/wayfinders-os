import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Password recovery will be available soon. Contact a Wayfinders administrator for help." }, { status: 503 });
}

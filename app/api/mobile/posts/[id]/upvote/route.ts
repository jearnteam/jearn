import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "MOBILE ROUTE HIT" },
    { status: 418 }
  );
}

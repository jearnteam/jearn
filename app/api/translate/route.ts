import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
// import { getMongoClient } from "@/lib/mongodb"; // (optional for caching later)

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);

  // 🔒 Require auth (same pattern as your APIs)
  if (!session?.user?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { text, target } = await req.json();

    // 🧠 Basic validation
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }

    if (!target || typeof target !== "string") {
      return NextResponse.json(
        { error: "Invalid target language" },
        { status: 400 }
      );
    }

    // ⚠️ Prevent abuse (VERY IMPORTANT)
    if (text.length > 2000) {
      return NextResponse.json({ error: "Text too long" }, { status: 400 });
    }

    // 🌐 Call LibreTranslate (Docker internal)
    const res = await fetch("http://libretranslate:5000/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: "auto",
        target,
        format: "text",
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("LibreTranslate error:", errorText);

      return NextResponse.json(
        { error: errorText }, // 👈 expose actual error
        { status: 500 }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      text: data.translatedText,
    });
  } catch (err) {
    console.error("Translate API error:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

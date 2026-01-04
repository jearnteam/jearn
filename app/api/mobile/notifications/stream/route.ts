// app/api/mobile/notifications/stream/route.ts
export async function GET() {
  return new Response("Mobile notifications disabled", { status: 410 });
}

export async function classifyPost(text: string) {
  const res = await fetch("http://ai:8000/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  return res.json();
}

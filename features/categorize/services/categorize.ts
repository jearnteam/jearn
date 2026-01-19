interface CategoryResult {
  id: string;
  label: string;
  jname?: string;
  myname?: string;
  score: number;
}

export async function categorize(content: string) {
  const res = await fetch("http://ai:8000/categorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: content, topk: 10 }),
  });

  if (!res.ok) throw new Error("AI failed");

  return res.json();
}

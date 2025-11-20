import clientPromise from "@/lib/mongodb";

interface CategoryResult {
  label: string;
  score: number;
}

export async function categorize(content: string): Promise<CategoryResult[]> {
  const client = await clientPromise;
  const db = client.db("jearn");

  const categories = await db
    .collection("categories")
    .find({}, { projection: { _id: 0, name: 1 } })
    .toArray();

  const names = categories.map((c) => c.name);

  const payload = {
    inputs: content,
    parameters: {
      candidate_labels: names,
      multi_label: true,
    },
  };

  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.JEARN_AI}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("❌ HF error:", err);
    throw new Error("Categorization failed: " + err);
  }

  const result = await response.json();

  // ---- 1️⃣ New format: array of {label, score} ----
  if (Array.isArray(result)) {
    return result
      .map((item) => ({
        label: item.label,
        score: item.score,
      }))
      .sort(
        (
          a: { label: string; score: number },
          b: { label: string; score: number }
        ) => b.score - a.score
      );
  }

  // ---- 2️⃣ Old format: {labels:[], scores:[]} ----
  if (result.labels && result.scores) {
    return result.labels
      .map((label: string, i: number) => ({
        label,
        score: result.scores[i],
      }))
      .sort(
        (
          a: { label: string; score: number },
          b: { label: string; score: number }
        ) => b.score - a.score
      );
  }

  // ---- 3️⃣ Unknown format ----
  console.error("❌ Unsupported HF output:", result);
  throw new Error("Invalid HF zero-shot response");
}

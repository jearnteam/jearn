import clientPromise from "@/lib/mongodb";

/**
 * 与えられた文字列をcategoriesコレクションで定義されたカテゴリーでカテゴライズする
 * @param content カテゴライズ対象の文章
 * @returns [{"label": string, "score": number}] or {error: string}
 */
export async function categorize(content: string) {
  const client = await clientPromise;
  const db = client.db("jearn");

  const categories = await db.collection("categories").find({}, { projection: { _id: 0, name: 1 } }).toArray();
  const names = categories.map(doc => doc.name);

  const query = {
    inputs: content,
    parameters: { candidate_labels: names },
  };
  const response = await fetch(
    // "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli",
    "https://router.huggingface.co/hf-inference/models/MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
    {
      headers: {
        Authorization: `Bearer ${process.env.JEARN_AI}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(query),
    }
  );
  const result = await response.json();

  return result;
}

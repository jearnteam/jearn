import { PostType, PostTypes } from "@/types/post";

/* -------------------------------------------------------------------------- */
/* Draft Model                                                                 */
/* -------------------------------------------------------------------------- */

export interface PostDraft {
  postType: PostType;
  title: string;
  content: string;
  updatedAt: number;
}

/* -------------------------------------------------------------------------- */
/* Draft Key                                                                   */
/* -------------------------------------------------------------------------- */

export function draftKey(
  userId: string,
  postType: PostType,
  questionId?: string
): string {
  if (postType === PostTypes.ANSWER) {
    if (!questionId) {
      throw new Error("ANSWER draft requires questionId");
    }
    return `post-draft:${userId}:ANSWER:${questionId}`;
  }

  return `post-draft:${userId}:${postType}`;
}

/* -------------------------------------------------------------------------- */
/* Load Draft                                                                  */
/* -------------------------------------------------------------------------- */

export function loadDraft(
  userId: string,
  postType: PostType,
  questionId?: string
): PostDraft | null {
  try {
    const key = draftKey(userId, postType, questionId);
    const raw = localStorage.getItem(key);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as PostDraft;

    // Basic shape validation (defensive)
    if (
      typeof parsed !== "object" ||
      typeof parsed.title !== "string" ||
      typeof parsed.content !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn("Failed to load draft:", err);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Save Draft                                                                  */
/* -------------------------------------------------------------------------- */

export function saveDraft(
  userId: string,
  postType: PostType,
  draft: Omit<PostDraft, "updatedAt">,
  questionId?: string
) {
  try {
    const { title, content } = draft;

    // ❌ Do not save empty drafts
    if (!title.trim() && (!content || content === "<p></p>")) {
      return;
    }

    const key = draftKey(userId, postType, questionId);

    const payload: PostDraft = {
      ...draft,
      updatedAt: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to save draft:", err);
  }
}

/* -------------------------------------------------------------------------- */
/* Clear Draft                                                                 */
/* -------------------------------------------------------------------------- */

export function clearDraft(
  userId: string,
  postType: PostType,
  questionId?: string
) {
  try {
    const key = draftKey(userId, postType, questionId);
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("Failed to clear draft:", err);
  }
}

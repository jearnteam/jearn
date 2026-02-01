//@/lib/postDraft.ts
import { openDB, STORE } from "@/lib/postDraftDB";
import { PostType, PostTypes } from "@/types/post";

/* -------------------------------------------------------------------------- */
/* Draft Model (IndexedDB)                                                     */
/* -------------------------------------------------------------------------- */

export interface DraftImage {
  id: string;
  buffer: ArrayBuffer;
  mime: string;
}

export interface PostDraftRecord {
  key: string;
  postType: PostType;
  title: string;
  content: string;
  updatedAt: number;
  images: DraftImage[];
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

export async function loadDraft(
  userId: string,
  postType: PostType,
  questionId?: string
): Promise<PostDraftRecord | null> {
  const key = draftKey(userId, postType, questionId);
  const db = await openDB();

  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
}

/* -------------------------------------------------------------------------- */
/* Save Draft                                                                  */
/* -------------------------------------------------------------------------- */

function sanitizeDraftHTML(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll("img[data-type='image-placeholder']").forEach((img) => {
    img.setAttribute("src", "__DRAFT_IMAGE__"); // 🔒 keep node alive
  });

  return doc.body.innerHTML;
}

export async function saveDraft(
  userId: string,
  postType: PostType,
  draft: {
    title: string;
    content: string;
    images: DraftImage[];
  },
  questionId?: string
): Promise<void> {
  const sanitizedContent = sanitizeDraftHTML(draft.content);

  const key = draftKey(userId, postType, questionId);
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");

    tx.objectStore(STORE).put({
      key,
      postType,
      title: draft.title, // "" allowed
      content: sanitizedContent, // "<p></p>" allowed
      images: draft.images,
      updatedAt: Date.now(),
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function isMeaningful(title: string, content: string) {
  return title.trim() || (content && content !== "<p></p>");
}

/* -------------------------------------------------------------------------- */
/* Clear Draft                                                                 */
/* -------------------------------------------------------------------------- */

export async function clearDraft(
  userId: string,
  postType: PostType,
  questionId?: string
) {
  const key = draftKey(userId, postType, questionId);
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(key);
}

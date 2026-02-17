import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { PostTypes, type Post } from "@/types/post";
import { UploadProvider } from "@/components/upload/UploadContext";
import FullPostClient from "@/components/posts/FullPostClient";

interface PageProps {
  params: { id: string };
}

export default async function Page({ params }: PageProps) {
  const { id } = params;

  if (!id) notFound();

  // 🔐 Auth guard
  const session = await getServerSession(authConfig);

  if (!session) {
    redirect(`/post/${id}`);
  }

  // 📦 Fetch post
  const postRes = await fetch(
    `${process.env.NEXTAUTH_URL}/api/posts/${id}`,
    { cache: "no-store" }
  );

  if (!postRes.ok) {
    notFound();
  }

  const post: Post = await postRes.json();

  let comments: Post[] = [];

  if (post.postType !== PostTypes.QUESTION) {
    const commentsRes = await fetch(
      `${process.env.NEXTAUTH_URL}/api/posts/${id}/comments`,
      { cache: "no-store" }
    );

    if (commentsRes.ok) {
      const data = await commentsRes.json();
      comments = Array.isArray(data) ? data : [];
    }
  }

  // ✅ No overlay wrapper
  return (
    <div className="feed-container py-6 space-y-10 max-w-3xl mx-auto pb-32">
      <UploadProvider>
        <FullPostClient
          initialPost={post}
          initialComments={comments}
        />
      </UploadProvider>
    </div>
  );
}

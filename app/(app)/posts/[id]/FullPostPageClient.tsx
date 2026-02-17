"use client";

import { UploadProvider } from "@/components/upload/UploadContext";
import FullPostClient from "@/components/posts/FullPostClient";
import { type Post } from "@/types/post";

interface Props {
  initialPost: Post;
  initialComments: Post[];
}

export default function FullPostPageClient({
  initialPost,
  initialComments,
}: Props) {
  return (
    <div className="feed-container pt-[4.3rem] pb-6 space-y-10">
      <UploadProvider>
        <FullPostClient
          initialPost={initialPost}
          initialComments={initialComments}
        />
      </UploadProvider>
    </div>
  );
}

import { ArrowBigUp, MessageCircle, Share2 } from "lucide-react";
import { usePostUpvote } from "./usePostUpvote";
import Link from "next/link";

export default function PostFooter({
  post,
  isSingle,
  onUpvote,
  onShare,
}: any) {
  const { handleUpvote, hasUpvoted, count } = usePostUpvote(post, onUpvote);

  return (
    <div className="mt-4 flex gap-6 border-t pt-3 text-sm">
      <button onClick={handleUpvote}>
        <ArrowBigUp /> {count}
      </button>

      {!isSingle && (
        <Link href={`/posts/${post._id}#comments`}>
          <MessageCircle /> {post.commentCount}
        </Link>
      )}

      <button onClick={onShare}>
        <Share2 /> Share
      </button>
    </div>
  );
}

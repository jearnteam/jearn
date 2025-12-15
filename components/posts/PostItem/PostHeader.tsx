import Link from "next/link";
import { Network } from "lucide-react";
import PostMenu from "./PostMenu";
import dayjs from "@/lib/dayjs";

export default function PostHeader({
  post,
  onEdit,
  onDelete,
  onToggleGraph,
}: {
  post: any;
  onEdit?: (post: any) => void;
  onDelete?: (id: string) => void;
  onToggleGraph: () => void;
}) {
  return (
    <div className="flex justify-between mb-3">
      <Link href={`/profile/${post.authorId}`} scroll={false}>
        <div>
          <p className="font-semibold">{post.authorName}</p>
          <p className="text-xs text-gray-500">
            {dayjs(post.createdAt).fromNow()}
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <button onClick={onToggleGraph}>
          <Network size={20} />
        </button>

        <PostMenu post={post} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

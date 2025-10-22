import { Post } from "@/features/posts/hooks/usePosts";
import PostItem from "./PostItem";
import { motion } from "framer-motion";

interface UpvoteResponse {
  ok: boolean;
  error?: string;
  action?: "added" | "removed";
}

interface Props {
  posts: Post[];
  onEdit: (id: string, title?: string, content?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpvote: (id: string, userId: string) => Promise<UpvoteResponse>; // ✅ updated
}

export default function PostList({ posts, onEdit, onDelete, onUpvote }: Props) {
  if (posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center justify-center text-gray-500 py-10"
      >
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-5xl">📭</span>
        </div>
        <p className="text-lg font-medium">Loading for posts to show!</p>
      </motion.div>
    );
  }

  return (
    <motion.ul
      initial={{ opacity: 0, filter: "blur(6px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-2"
    >
      {posts.map((post) => (
        <PostItem
          key={post._id}
          post={post}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpvote={onUpvote} // ✅ now typed correctly
        />
      ))}
    </motion.ul>
  );
}

import { motion } from "framer-motion";
import { MathRenderer } from "@/components/math/MathRenderer";
import { usePostCollapse } from "./usePostCollapse";
import { PostTypes } from "@/types/post";
import Link from "next/link";

export default function PostContent({
  post,
  scrollContainerRef,
}: {
  post: any;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const {
    contentRef,
    expanded,
    toggle,
    targetHeight,
    measureDone,
    shouldTruncate,
  } = usePostCollapse(post.content, scrollContainerRef);

  return (
    <>
      <Link href={`/posts/${post._id}`} scroll={false}>
        {post.title && (
          <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
            {post.postType === PostTypes.QUESTION ? <span className="text-red-500">{"Q. "}</span> : ""}
            {post.title}
          </h2>
        )}
      </Link>

      <motion.div
        animate={{ height: targetHeight }}
        transition={{ duration: measureDone ? 0.25 : 0 }}
        className="mt-2 overflow-hidden"
      >
        <div ref={contentRef}>
          <MathRenderer html={post.content} />
        </div>
      </motion.div>

      {shouldTruncate && (
        <button onClick={toggle} className="text-blue-500 text-sm mt-2">
          {expanded ? "Show Less ▲" : "Show More ▼"}
        </button>
      )}
    </>
  );
}

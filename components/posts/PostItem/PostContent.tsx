import { motion } from "framer-motion";
import { MathRenderer } from "@/components/math/MathRenderer";
import { usePostCollapse } from "./usePostCollapse";

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
      <motion.div
        animate={{ height: targetHeight }}
        transition={{ duration: measureDone ? 0.25 : 0 }}
        className="overflow-hidden"
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

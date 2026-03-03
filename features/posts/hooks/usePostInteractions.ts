import type { Post } from "@/types/post";

type VotePollResult = {
  poll: Post["poll"];
  votedOptionIds: string[];
};

type Options = {
  setPosts?: React.Dispatch<React.SetStateAction<Post[]>>;
  setAnsweringPost?: React.Dispatch<React.SetStateAction<Post | null>>;
};

export function usePostInteractions(options: Options = {}) {
  const { setPosts, setAnsweringPost } = options;

  async function upvote(postId: string) {
    const res = await fetch(`/api/posts/${postId}/upvote`, {
      method: "POST",
    });

    if (!res.ok) return;
  }

  async function vote(
    postId: string,
    optionId: string
  ): Promise<VotePollResult | null> {
    const res = await fetch("/api/posts/polls/vote", {
      method: "POST",
      body: JSON.stringify({ postId, optionId }),
    });

    if (!res.ok) return null;

    const { poll, votedOptionIds } = await res.json();

    if (setPosts) {
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? {
                ...p,
                poll: {
                  ...poll,
                  votedOptionIds,
                },
              }
            : p
        )
      );
    }

    return { poll, votedOptionIds };
  }

  function answer(post: Post) {
    setAnsweringPost?.(post);
  }

  return {
    upvote,
    vote,
    answer,
  };
}

"use client";

import PostForm, { PostFormProps } from "./PostForm";

export default function QuestionForm(props: PostFormProps) {
  return (
    <PostForm
      {...props}
      // 質問専用の UI 設定を追加
      mode="question"
    />
  );
}

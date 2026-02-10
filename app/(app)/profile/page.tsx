"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";

import FullScreenLoader from "@/components/common/FullScreenLoader";
import ProfileLayout from "@/components/profile/ProfileLayout";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfilePostsSection from "@/components/profile/ProfilePostsSection";

import { useProfileAuth } from "@/hooks/profile/useProfileAuth";
import { useProfileForm } from "@/hooks/profile/useProfileForm";
import { useUserPosts } from "@/hooks/profile/useUserPosts";

interface ProfilePageProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export default function ProfilePage({ scrollContainerRef }: ProfilePageProps) {
  const { t } = useTranslation();

  const { loading: authLoading } = useProfileAuth();
  const profile = useProfileForm();
  const posts = useUserPosts(profile.user?._id);

  if (authLoading || profile.loading || posts.loading) {
    return <FullScreenLoader text={t("loadingPosts")} />;
  }

  return (
    <ProfileLayout scrollRef={scrollContainerRef}>
      <div className="feed-container mt-10 space-y-16">
        <ProfileHeader {...profile} />
        <ProfilePostsSection
          posts={posts.posts}
          hasMore={posts.hasMore}
          onLoadMore={posts.loadMore}
        />
      </div>
    </ProfileLayout>
  );
}

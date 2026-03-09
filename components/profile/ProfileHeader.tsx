import Image from "next/image";
import FollowStats from "@/components/follow/FollowStats";
import { useTranslation } from "react-i18next";

export default function ProfileHeader({
  user,
  name,
  setName,
  uniqueId,
  setUniqueId,
  bio,
  setBio,
  preview,
  setFile,
  saving,
  save,
}: any) {
  const { t } = useTranslation();
  return (
    <section className="space-y-5">
      {/* ───────── Title ───────── */}
      <header className="flex justify-center">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          {t("profileSetting.settings")}
        </h1>
      </header>

      {/* ───────── Avatar + Stats ───────── */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
        {/* Avatar */}
        <div
          className="relative group cursor-pointer shrink-0"
          onClick={() => document.getElementById("avatarInput")?.click()}
        >
          <div
            className="
      relative
      w-20 h-20 sm:w-24 sm:h-24
      rounded-full
      overflow-hidden
      border border-neutral-300 dark:border-neutral-700
    "
          >
            <Image
              src={preview}
              alt="Profile avatar"
              fill
              sizes="96px"
              style={{ objectFit: "cover" }}
              className="rounded-full"
            />
          </div>

          {/* Hover overlay */}
          <div
            className="
      absolute inset-0 rounded-full
      bg-black/40 text-white
      opacity-0 group-hover:opacity-100
      flex items-center justify-center
      text-xs font-medium
      transition
      pointer-events-none
    "
          >
            {t("profileSetting.change")}
          </div>
        </div>

        {/* Followers / Following */}
        {user?._id && (
          <div className="text-center sm:text-left">
            <FollowStats userId={user._id} direction="column" />
          </div>
        )}

        <input
          id="avatarInput"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* ───────── Form (centered) ───────── */}
      <div className="space-y-5 max-w-xl mx-auto px-4 sm:px-0">
        {/* Name */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("profileSetting.name")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="
              w-full px-3 py-2 rounded-md
              border border-neutral-300 dark:border-neutral-700
              bg-white dark:bg-neutral-900
              text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          />
        </div>

        {/* Unique ID */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("profileSetting.uniqueId")}
          </label>
          <div className="flex gap-2">
            <div className="text-sm py-2 select-none">@</div>
            <input
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value)}
              className="
              w-full px-3 py-2 rounded-md
              border border-neutral-300 dark:border-neutral-700
              bg-white dark:bg-neutral-900
              text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500
              flex-1
            "
            />
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("profileSetting.bio")}
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="
              w-full px-3 py-2 rounded-md
              border border-neutral-300 dark:border-neutral-700
              bg-white dark:bg-neutral-900
              text-sm resize-y
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          />
        </div>

        {/* Save */}
        <div className="pt-2">
          <button
            disabled={saving}
            onClick={save}
            className="w-full sm:w-auto inline-flex items-center justify-center
              px-5 py-2.5 rounded-md
              bg-blue-600 text-white
              text-sm font-medium
              hover:bg-blue-700
              disabled:opacity-60 disabled:cursor-not-allowed
              transition
            "
          >
            {saving ? t("profileSetting.saving") : t("profileSetting.save")}
          </button>
        </div>
      </div>
    </section>
  );
}

// app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

export default function ProfilePage() {
  const { t } = useTranslation();

  const { user, loading, update } = useCurrentUser();
  const { status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const [preview, setPreview] = useState("/default-avatar.png");
  const [file, setFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);

  const sessionLoading = loading || status === "loading";

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionLoading && status === "unauthenticated") {
      router.push("/");
    }
  }, [sessionLoading, status]);

  // Load user data
  useEffect(() => {
    if (!loading && user) {
      setName(user.name || "");
      setBio(user.bio || "");

      // Always cache bust
      setPreview(`/api/user/avatar/${user._id}?v=${Date.now()}`);
    }
  }, [user, loading]);

  // Local preview for uploaded file
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSave() {
    if (!user?._id) {
      alert("Invalid user session.");
      return;
    }

    setUploading(true);

    const fd = new FormData();
    fd.append("userId", user._id); // IMPORTANT — use _id, NOT uid
    fd.append("name", name);
    fd.append("bio", bio);
    if (file) fd.append("picture", file);

    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Update failed");
      }

      // Refresh backend state
      await update();

      // Refresh avatar preview
      setPreview(`/api/user/avatar/${user._id}?v=${Date.now()}`);

      alert("Profile updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to update profile");
    } finally {
      setUploading(false);
    }
  }

  if (sessionLoading)
    return (
      <div className="flex justify-center items-center h-[70vh]">
        {t("loading") || "Loading"}...
      </div>
    );

  if (!user)
    return (
      <div className="flex justify-center items-center h-[70vh]">
        {t("notLoggedIn") || "Not logged in"}
      </div>
    );

  return (
    <div className="max-w-lg mx-auto mt-24 px-4">
      <h1 className="text-2xl font-bold mb-6">{t("profileSettings") || "Profile Settings"}</h1>

      <div className="flex flex-col gap-4">
        {/* Avatar upload */}
        <div className="flex items-center gap-4">
          <div
            className="rounded-full overflow-hidden border flex items-center justify-center"
            style={{ width: 80, height: 80 }}
          >
            <img
              src={preview}
              className="w-full h-full object-cover object-center"
              alt="avatar preview"
            />
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <label>{t("name") || "Name"}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-2 py-1"
        />

        <label>{t("bio") || "Bio"}</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="border rounded px-2 py-1"
        />

        <button
          onClick={handleSave}
          disabled={uploading}
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          {uploading ? "Saving..." : (t("saveChanges") || "Save Changes")}
        </button>
      </div>
    </div>
  );
}

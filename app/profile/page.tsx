"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, loading, update } = useCurrentUser();
  const { status } = useSession();
  const router = useRouter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "/";

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [picture, setPicture] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  const sessionLoading = status === "loading" || loading;

  // 🧭 Redirect if unauthenticated
  useEffect(() => {
    if (!sessionLoading && status === "unauthenticated") {
      console.warn("⚠️ No session detected → redirecting home");
      router.push(appUrl);
    }
  }, [sessionLoading, status, router, appUrl]);

  // 🧾 Fill user info when loaded
  useEffect(() => {
    if (!loading && user) {
      // Avoid overwriting user input if the user starts editing before load
      setName((prev) => (prev === "" ? user.name || "" : prev));
      setBio((prev) => (prev === "" ? user.bio || "" : prev));
      setPicture(`/api/user/avatar/${user.uid}?t=${Date.now()}`);
      setImgLoading(true);
    }
  }, [user, loading]);

  // 🖼️ Preview selected file immediately
  useEffect(() => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPicture(preview);
    setImgLoading(false);
    return () => URL.revokeObjectURL(preview);
  }, [file]);

  const handleSave = async () => {
    if (!user?.uid) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("userId", user.uid);
    formData.append("name", name);
    formData.append("bio", bio);
    if (file) formData.append("picture", file);

    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.ok) {
        await update(); // refresh hook data
        setPicture(`/api/user/avatar/${user.uid}?t=${Date.now()}`); // bust cache
        setImgLoading(true);
        alert("✅ Profile updated!");
      } else {
        alert("❌ " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Upload failed: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // 🌀 Wait for user to load
  if (sessionLoading || loading)
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600">Loading your profile...</p>
      </div>
    );

  if (!user) return null;

  const isChanged =
    name !== (user.name || "") || bio !== (user.bio || "") || !!file;

  return (
    <div className="max-w-lg mx-auto mt-24 px-4">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

      <div className="flex flex-col gap-4">
        {/* 👤 Avatar */}
        <div className="flex items-center gap-4 relative">
          <div className="relative">
            <img
              key={picture}
              src={picture || "/default-avatar.png"}
              alt="avatar"
              className="w-20 h-20 rounded-full object-cover border"
              onLoad={() => {
                setImgLoading(false);
                setImgError(false);
              }}
              onError={() => {
                setImgLoading(false); // ✅ Always stop loading
                setImgError(true);

                if (user?.picture) {
                  // ✅ Retry only if picture exists in DB
                  console.warn("⚠️ Avatar failed to load, retrying...");
                  setTimeout(() => {
                    setImgLoading(true);
                    setPicture(`/api/user/avatar/${user.uid}?v=${Date.now()}`);
                  }, 2000);
                } else {
                  // ✅ No picture? Show default avatar
                  setPicture("/default-avatar.png");
                }
              }}
            />

            {/* 🌀 Loader overlay */}
            {imgLoading && (
              <div className="absolute top-0 left-0 w-20 h-20 flex items-center justify-center bg-white/50 rounded-full">
                <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>

        <label className="text-sm font-medium">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-2 py-1 w-full"
        />

        <label className="text-sm font-medium">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="border rounded px-2 py-1 w-full min-h-[80px]"
        />

        <button
          onClick={handleSave}
          disabled={!isChanged || uploading}
          className={`px-4 py-2 rounded text-white transition-colors ${
            isChanged && !uploading
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {uploading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

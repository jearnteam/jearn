"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, loading } = useCurrentUser();
  const router = useRouter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "/";

  // 🧠 State
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [picture, setPicture] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // 🛑 Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push(appUrl);
    }
  }, [loading, user, router, appUrl]);

  // ✅ Prefill user info
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
      if (user.picture) {
        setPicture(user.picture || "");
      }
    }
  }, [user]);

  // 🪄 Client-side compression & preview
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;

    // Decode image
    const bitmap = await createImageBitmap(originalFile);
    const canvas = document.createElement("canvas");

    const maxWidth = 512;
    const scale = Math.min(1, maxWidth / bitmap.width);
    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // Compress to JPEG
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8)
    );

    const compressedFile = new File(
      [blob],
      originalFile.name.replace(/\.[^/.]+$/, ".jpg"),
      { type: "image/jpeg" }
    );

    setFile(compressedFile);
    setPicture(URL.createObjectURL(compressedFile));
  };

  // 💾 Save profile
  const handleSave = async () => {
    if (!user?._id) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("userId", user._id);
    formData.append("name", name);
    formData.append("bio", bio);
    if (file) formData.append("picture", file);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const res = await fetch("/api/user/update", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        alert("❌ Upload failed: " + text);
        console.error("Upload failed:", text);
        return;
      }

      const data = await res.json();
      if (data.ok) {
        alert("✅ Profile updated!");
        // Force reload the avatar
        setPicture(`/api/user/avatar/${user._id}?t=${Date.now()}`);
        router.refresh();
        router.push("/");
      } else {
        alert("❌ Failed to update: " + data.error);
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
      alert("❌ Upload error: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // ⏳ Loading UI
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600">Loading your profile...</p>
      </div>
    );
  }

  if (!user) return null;

  const defaultAvatar = "/default-avatar.png";
  const isChanged =
    name !== (user.name || "") || bio !== (user.bio || "") || !!file;

  return (
    <div className="max-w-lg mx-auto mt-24 px-4">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

      <div className="flex flex-col gap-4">
        {/* 🖼 Avatar */}
        <div className="flex items-center gap-4">
          <img
            src={picture || defaultAvatar}
            onError={(e) => (e.currentTarget.src = defaultAvatar)}
            alt="avatar"
            className="w-20 h-20 rounded-full object-cover"
          />
          <div className="flex items-center gap-2">
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="avatar-upload"
              className="cursor-pointer bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
            >
              📁 Choose Image
            </label>
            {uploading && (
              <span className="text-xs text-gray-500">Saving...</span>
            )}
          </div>
        </div>

        {/* 🪪 Name */}
        <div>
          <label className="block text-sm mb-1 font-medium">Name</label>
          <input
            type="text"
            placeholder={
              user?.name ? `Current: ${user.name}` : "Enter your name"
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>

        {/* 📝 Bio */}
        <div>
          <label className="block text-sm mb-1 font-medium">Bio</label>
          <textarea
            placeholder={
              user?.bio
                ? `Current: ${user.bio}`
                : "Tell people something about you..."
            }
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="border rounded px-2 py-1 w-full min-h-[80px]"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!isChanged || uploading}
          className={`px-4 py-2 rounded text-white ${
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

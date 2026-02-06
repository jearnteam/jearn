import { useEffect, useState } from "react";
import { avatarUrl } from "@/lib/avatarUrl";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function useProfileForm() {
  const { user, loading, update } = useCurrentUser();

  const [name, setName] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [bio, setBio] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      setName(user.name ?? "");
      setUniqueId(user.uniqueId ?? "");
      setBio(user.bio ?? "");
      setPreview(avatarUrl(user._id, user.avatarUpdatedAt));
    }
  }, [user, loading]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save() {
    if (!user?._id) return;

    setSaving(true);

    const fd = new FormData();
    fd.append("user_id", user._id);
    fd.append("name", name);
    fd.append("uniqueId", uniqueId);
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

      await update();
      setPreview(avatarUrl(user._id, new Date()));
      setFile(null);
    } finally {
      setSaving(false);
    }
  }

  return {
    name, setName,
    uniqueId, setUniqueId,
    bio, setBio,
    preview,
    setFile,
    saving,
    save,
    user,
    loading,
  };
}

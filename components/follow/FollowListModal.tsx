// components/follow/FollowListModal.tsx
"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import FollowButton from "./FollowButton";

export default function FollowListModal({
  userId,
  type,
  onClose,
}: {
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
}) {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/follow/${type}/${userId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setUsers);
  }, [userId, type]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-black w-full max-w-md rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">
            {type === "followers" ? "Followers" : "Following"}
          </h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {users.map((u) => (
            <div key={u.uid} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar id={u.uid} size={36} />
                <span>{u.name}</span>
              </div>

              <FollowButton targetUserId={u.uid} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

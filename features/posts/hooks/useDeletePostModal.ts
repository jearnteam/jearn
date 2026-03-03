
import { useState } from "react";

export function useDeletePostModal() {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function requestDelete(id: string) {
    setDeleteId(id);
  }

  function closeDelete() {
    setDeleteId(null);
  }

  return {
    deleteId,
    requestDelete,
    closeDelete,
  };
}

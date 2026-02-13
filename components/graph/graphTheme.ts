export function getGraphPalette(isDark: boolean) {
    return isDark
      ? {
          background: "#0f172a",
          post: "#22c55e",
          category: "#3b82f6",
          tag: "#a855f7",
          comment: "#334155",
          author: "#f59e0b",
          text: "#f8fafc",
          edge: "#545454",
          popupBg: "#1e293b",
        }
      : {
          background: "#f8fafc",
          post: "#B4FFB3",
          category: "#B3F8FF",
          tag: "#EFB3FF",
          comment: "#e5e7eb",
          author: "#d97706",
          text: "#0f172a",
          edge: "#C9C9C9",
          popupBg: "#ffffff",
        };
  }
  
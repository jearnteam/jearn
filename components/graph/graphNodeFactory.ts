import { avatarUrl } from "@/lib/avatarUrl";
import { createColorStates } from "./graphColorFactory";

type Palette = ReturnType<any>; // you can type properly if you want


export function createPostNode(post: any, palette: any, isDark: boolean) {
  return {
    id: post._id,
    label: post.label,
    shape: "box",
    mass: 6,
    borderWidth: 1,
    margin: { top: 12, right: 16, bottom: 12, left: 16 },
    color: createColorStates(palette.post, palette.post, palette, isDark),
    font: { color: palette.text },
  };
}

export function createReferencePostNode(
  post: any,
  palette: any,
  isDark: boolean
) {
  const borderColor = isDark ? "#3b82f6" : "#2563eb";
  const backgroundColor = isDark ? "#1e293b" : "#eff6ff";

  return {
    id: `ref-${post._id}`,
    label: post.label,
    shape: "box",
    mass: 3,
    borderWidth: 1,
    margin: { top: 8, right: 12, bottom: 8, left: 12 },

    color: createColorStates(borderColor, backgroundColor, palette, isDark),

    font: {
      color: palette.text,
      size: 13,
      face: "Inter, system-ui, sans-serif",
    },

    data: {
      type: "post",
      id: post._id,
      isReference: true,
    },
  };
}

export function createAuthorNode(
  authorId: string,
  authorName: string,
  palette: any,
  isDark: boolean
) {
  return {
    id: `author-${authorId}`,
    label: authorName,
    shape: "circularImage",
    image: avatarUrl(authorId),
    borderWidth: 2,
    color: { border: palette.edge },
    mass: 3,
    font: {
      color: palette.text,
      size: 14,
      face: "Inter, system-ui, sans-serif",
      strokeColor: isDark ? "#0f172a" : "#ffffff",
    },
  };
}

export function createHubNode(
  id: string,
  iconLight: string,
  iconDark: string,
  borderColor: string,
  palette: any,
  isDark: boolean,
  label?: string
) {
  return {
    id,
    label: label ?? "",
    shape: "circularImage",
    image: isDark ? iconDark : iconLight,
    size: 20,
    borderWidth: 2,
    mass: 3,
    color: createColorStates(
      borderColor,
      isDark ? "#1e293b" : "#ffffff",
      palette,
      isDark
    ),
    font: {
      size: 12,
      color: palette.text,
    },
  };
}

export function createBoxNode(
  id: string,
  label: string,
  borderColor: string,
  backgroundColor: string,
  palette: any,
  isDark: boolean,
  mass = 1
) {
  return {
    id,
    label,
    shape: "box",
    mass,
    color: createColorStates(borderColor, backgroundColor, palette, isDark),
    font: { color: palette.text },
  };
}

export function createMentionUserNode(
  userId: string,
  userName: string,
  palette: any,
  isDark: boolean
) {
  const borderColor = isDark ? "#ef4444" : "#dc2626"; // red-500 / red-600
  const backgroundColor = isDark ? "#2a0f0f" : "#fff1f2"; // subtle red tint

  return {
    id: `mention-${userId}`,
    label: userName,
    shape: "circularImage",
    image: avatarUrl(userId),
    size: 28,
    mass: 1,
    borderWidth: 2,
    color: {
      border: borderColor,
      background: backgroundColor,

      highlight: {
        border: isDark ? "#fb7185" : "#991b1b", // brighter red on select
        background: isDark ? "#381313" : "#fecdd3",
      },
    },

    font: {
      color: isDark ? "#f8fafc" : "#0f172a",
      size: 13,
      face: "Inter, system-ui, sans-serif",
      strokeWidth: 2,
      strokeColor: isDark ? "#0f172a" : "#ffffff",
    },

    data: {
      type: "mention-user",
      userId,
    },
  };
}

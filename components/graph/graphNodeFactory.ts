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
  isDark: boolean
) {
  return {
    id,
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
    shadow: {
      enabled: true,
      color: borderColor,
      size: 18,
      x: 0,
      y: 0,
    },
    font: { size: 0 },
  };
}

export function createBoxNode(
  id: string,
  label: string,
  borderColor: string,
  backgroundColor: string,
  palette: any,
  isDark: boolean,
  mass = 2
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

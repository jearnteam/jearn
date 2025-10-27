import { AVATAR_MAX_SIZE, AVATAR_MIME, AVATAR_QUALITY } from "./config";

export async function compressImageFile(file: File): Promise<string> {
  // read as data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > height) {
    if (width > AVATAR_MAX_SIZE) {
      height *= AVATAR_MAX_SIZE / width;
      width = AVATAR_MAX_SIZE;
    }
  } else {
    if (height > AVATAR_MAX_SIZE) {
      width *= AVATAR_MAX_SIZE / height;
      height = AVATAR_MAX_SIZE;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas not supported");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL(AVATAR_MIME, AVATAR_QUALITY);
}

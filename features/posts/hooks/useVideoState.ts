import { useRef, useState, useEffect } from "react";

export function useVideoState() {
  const videoFileRef = useRef<File | null>(null);
  const thumbnailFileRef = useRef<File | null>(null);

  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] =
    useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (thumbnailPreviewUrl)
        URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [videoPreviewUrl, thumbnailPreviewUrl]);

  const selectVideo = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      if (videoPreviewUrl)
        URL.revokeObjectURL(videoPreviewUrl);

      videoFileRef.current = file;
      setVideoPreviewUrl(URL.createObjectURL(file));
    };

    input.click();
  };

  const selectThumbnail = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      if (thumbnailPreviewUrl)
        URL.revokeObjectURL(thumbnailPreviewUrl);

      thumbnailFileRef.current = file;
      setThumbnailPreviewUrl(URL.createObjectURL(file));
    };

    input.click();
  };

  return {
    videoFileRef,
    thumbnailFileRef,
    videoPreviewUrl,
    thumbnailPreviewUrl,
    selectVideo,
    selectThumbnail,
  };
}

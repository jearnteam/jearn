"use client";

type Props = {
  videoPreviewUrl: string | null;
  thumbnailPreviewUrl: string | null;
  selectVideo: () => void;
  selectThumbnail: () => void;
};

export default function PostFormVideo({
  videoPreviewUrl,
  thumbnailPreviewUrl,
  selectVideo,
  selectThumbnail,
}: Props) {
  return (
    <div className="space-y-4">
      {/* 🎥 Video Preview */}
      {videoPreviewUrl ? (
        <video
          src={videoPreviewUrl}
          controls
          className="w-full max-h-[360px] rounded-lg bg-black"
        />
      ) : (
        <div className="border-2 border-dashed rounded-lg p-6 text-center text-gray-500">
          No video selected
        </div>
      )}

      {/* 🎥 Select Video */}
      <button
        type="button"
        onClick={selectVideo}
        className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
      >
        Select Video
      </button>

      {/* 🖼 Thumbnail Preview */}
      {thumbnailPreviewUrl ? (
        <img
          src={thumbnailPreviewUrl}
          alt="Thumbnail preview"
          className="w-full max-h-[200px] object-cover rounded-lg border"
        />
      ) : (
        <div className="text-sm text-gray-500">
          If the thumbnail is not selected, first frame will be used
        </div>
      )}

      {/* 🖼 Select Thumbnail */}
      <button
        type="button"
        onClick={selectThumbnail}
        className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
      >
        Select Thumbnail
      </button>
    </div>
  );
}

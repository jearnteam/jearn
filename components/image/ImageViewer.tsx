// components/image/ImageViewer.tsx
"use client";

import { useEffect, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export default function ImageViewer() {
  const [src, setSrc] = useState<string | null>(null);
  const btnClass =
    "p-2 rounded-full backdrop-blur-md bg-black/50 border border-white/20 text-white shadow-lg hover:bg-black/70 active:scale-95 transition";

  useEffect(() => {
    function handler(e: any) {
      setSrc(e.detail.src);
      document.body.style.overflow = "hidden";
    }

    window.addEventListener("image:open", handler);
    return () => window.removeEventListener("image:open", handler);
  }, []);

  function close() {
    setSrc(null);
    document.body.style.overflow = "";
  }

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] bg-black/90 flex items-center justify-center"
      onClick={(e) => {
        // ✅ only close if clicking background (not dragging image)
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="relative w-full h-full flex items-center justify-center overflow-visible">
        {/* CLOSE */}
        <button
          onClick={close}
          className="
    absolute top-4 right-4 z-50
    p-2 rounded-full
    backdrop-blur-md
    bg-black/60
    border border-white/20
    text-white
    shadow-lg
    hover:bg-black/80
    active:scale-95
    transition
  "
        >
          <X size={28} />
        </button>

        <TransformWrapper
          initialScale={1}
          minScale={1}
          maxScale={6}
          wheel={{ step: 0.2 }}
          pinch={{ step: 5 }}
          doubleClick={{ mode: "toggle" }}
          limitToBounds={false}
          panning={{ velocityDisabled: false }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* CONTROLS */}
              <div className="absolute bottom-6 right-6 z-50">
                <div className="flex gap-2 p-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 shadow-lg">
                  <button onClick={() => zoomIn()} className={btnClass}>
                    <ZoomIn size={18} />
                  </button>

                  <button onClick={() => zoomOut()} className={btnClass}>
                    <ZoomOut size={18} />
                  </button>

                  <button onClick={() => resetTransform()} className={btnClass}>
                    <RotateCcw size={18} />
                  </button>
                </div>
              </div>

              {/* IMAGE */}
              <div className="w-full h-full flex items-center justify-center overflow-visible">
                <TransformComponent wrapperClass="!overflow-visible">
                  <img
                    src={src}
                    draggable={false}
                    className="select-none pointer-events-none"
                    style={{
                      maxWidth: "100vw",
                      maxHeight: "100vh",
                    }}
                  />
                </TransformComponent>
              </div>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
}

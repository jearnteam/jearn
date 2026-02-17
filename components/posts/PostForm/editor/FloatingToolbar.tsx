"use client";

import type { Editor } from "@tiptap/react";
import clsx from "clsx";
import type { FloatingMenuAction } from "./FLOATING_MENU_ACTIONS";

interface Props {
  editor: Editor;
  actions: FloatingMenuAction[];
  withRestore: any;
  menuRef: React.RefObject<HTMLDivElement>;
}

export function FloatingToolbar({
  editor,
  actions,
  withRestore,
  menuRef,
}: Props) {
  const toolBtn =
    "h-9 min-w-[36px] px-2 flex items-center justify-center rounded-md text-sm font-medium transition select-none touch-manipulation";

  return (
    <div
      ref={menuRef}
      className="
        flex items-center gap-1
        bg-white dark:bg-neutral-900
        border border-gray-300 dark:border-gray-700
        rounded-xl shadow-lg
        px-2 py-1
        backdrop-blur-md
        max-w-full
        overflow-x-auto
        scrollbar-none
        touch-pan-x
      "
    >
      {actions.map((action, index) => {
        const active = action.isActive?.(editor) ?? false;

        return (
          <button
            key={action.id}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => action.run(editor, withRestore)}
            title={action.shortcut ?? "No shortcut"}
            className={`${toolBtn} ${
              active
                ? "bg-black text-white dark:bg-white dark:text-black shadow"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {action.label}

            {/* shortcut index badge */}
            {action.id === "clear" ? (
              <span
                className="
                  ml-1
                  px-1
                  rounded
                  text-[10px]
                  opacity-60
                  bg-black/10
                  dark:bg-white/10
                  font-mono
                "
              >
                \
              </span>
            ) : (
              index < 10 && (
                <span
                  className="
                    ml-1
                    px-1
                    rounded
                    text-[10px]
                    opacity-60
                    bg-black/10
                    dark:bg-white/10
                  "
                >
                  {index === 9 ? "0" : index + 1}
                </span>
              )
            )}
          </button>
        );
      })}
    </div>
  );
}

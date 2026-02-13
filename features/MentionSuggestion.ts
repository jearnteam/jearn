// features/MentionSuggestion.ts
import { Extension } from "@tiptap/core";
import Suggestion, {
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import { PluginKey } from "prosemirror-state";
import tippy, { type Instance } from "tippy.js";
import "tippy.js/dist/tippy.css";

export interface MentionUser {
  uid: string;
  uniqueId: string;
  name: string;
  picture?: string | null;
}

const key = new PluginKey("mention-suggestion");

/* Avatar helper */
function avatar(u: MentionUser) {
  if (u.picture && u.picture.startsWith("http")) return u.picture;
  return `/api/user/avatar/${u.uid}`;
}

export const MentionSuggestion = Extension.create({
  name: "mentionSuggestion",

  addProseMirrorPlugins() {
    return [
      Suggestion<MentionUser>({
        pluginKey: key,
        editor: this.editor,
        char: "@",
        allowSpaces: false,
        startOfLine: false,

        /**
         * ITEMS
         * This is called for every query string after "@"
         * e.g. "@o" -> query = "o"
         */
        items: async ({ query }) => {
          const raw = (query ?? "").trim();

          // Only "@" typed (no text) -> nothing fetched, but dropdown can stay
          if (!raw) {
            return [];
          }

          // For "@o", raw should be "o" (1 char) -> this WILL fetch
          const res = await fetch(
            `/api/user/search?q=${encodeURIComponent(raw)}`,
            { cache: "no-store" }
          );

          const data = await res.json();
          const users = Array.isArray(data.users ?? data) ? data.users : [];

          return users.map((u: any) => {
            const fallbackUniqueId =
              typeof u.uniqueId === "string" && u.uniqueId.trim() !== ""
                ? u.uniqueId
                : u.name.replace(/\s+/g, "_").toLowerCase(); // convert name → safe id

            return {
              uid: u._id,
              uniqueId: fallbackUniqueId,
              name: u.name,
              picture: u.picture ?? null,
              hasNoUniqueId: !u.uniqueId,
            };
          });
        },

        /**
         * INSERT NODE
         */
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertMention({
              uid: props.uid,
              uniqueId: props.uniqueId,
            })
            .run();
        },

        /**
         * RENDER DROPDOWN
         */
        render: () => {
          let popup: Instance | null = null;
          let root: HTMLDivElement | null = null;

          let currentItems: MentionUser[] = [];
          let lastProps: SuggestionProps<MentionUser> | null = null;
          let selectedIndex = 0;

          const renderList = () => {
            if (!root) return;

            root.innerHTML = "";

            if (currentItems.length === 0) {
              const empty = document.createElement("div");
              empty.className =
                "px-3 py-2 text-gray-500 dark:text-gray-400 text-sm";

              const rawText = lastProps?.text ?? "";
              const clean = rawText.replace(/^@/, "").trim();

              empty.textContent =
                clean === "" ? "Type to search" : "No users found";
              root.appendChild(empty);
              return;
            }

            currentItems.forEach((u, i) => {
              const row = document.createElement("div");
              row.className =
                "flex items-center gap-2 px-3 py-2 cursor-pointer rounded transition";

              if (i === selectedIndex) {
                row.classList.add(
                  "bg-blue-600",
                  "text-white",
                  "dark:bg-blue-500"
                );
              } else {
                row.classList.add(
                  "hover:bg-gray-100",
                  "dark:hover:bg-gray-700",
                  "text-gray-800",
                  "dark:text-gray-200"
                );
              }

              row.onclick = () => lastProps?.command(u);

              // ✅ avatar <img> with fallback
              const img = document.createElement("img");
              img.className = "w-6 h-6 rounded-full object-cover";
              img.referrerPolicy = "no-referrer"; // optional, helps with some external pictures

              const src = avatar(u); // your helper
              img.src = src;

              img.onerror = () => {
                img.onerror = null; // prevent infinite loop if default missing
                img.src = "/default-avatar.png";
              };

              const label = document.createElement("span");
              label.textContent = `@${u.uniqueId} — ${u.name}`;

              row.appendChild(img);
              row.appendChild(label);

              root!.appendChild(row);
            });
          };

          return {
            /**
             * OPEN POPUP
             */
            onStart: (props: SuggestionProps<MentionUser>) => {
              lastProps = props;
              currentItems = props.items ?? [];
              selectedIndex = 0;

              root = document.createElement("div");
              root.className =
                "bg-white dark:bg-neutral-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg p-1 w-64";

              const reference = document.createElement("div");
              reference.style.position = "absolute";
              reference.style.left = "0";
              reference.style.top = "0";
              document.body.appendChild(reference);

              popup = tippy(reference, {
                appendTo: document.body,
                trigger: "manual",
                interactive: true,
                placement: "bottom-start",
                content: root,
                zIndex: 999999,
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? new DOMRect(),
              });

              popup.show();
              renderList();
            },

            /**
             * UPDATE POPUP
             */
            onUpdate: (props: SuggestionProps<MentionUser>) => {
              lastProps = props;
              currentItems = props.items ?? [];

              if (selectedIndex >= currentItems.length) {
                selectedIndex = Math.max(currentItems.length - 1, 0);
              }

              renderList();

              popup?.setProps({
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? new DOMRect(),
              });
            },

            /**
             * KEYBOARD HANDLING
             */
            onKeyDown: (props: SuggestionKeyDownProps) => {
              const { event } = props;

              if (!currentItems.length) return false;

              if (event.key === "ArrowDown") {
                selectedIndex = (selectedIndex + 1) % currentItems.length;
                renderList();
                return true;
              }

              if (event.key === "ArrowUp") {
                selectedIndex =
                  (selectedIndex - 1 + currentItems.length) %
                  currentItems.length;
                renderList();
                return true;
              }

              if (event.key === "Enter") {
                lastProps?.command(currentItems[selectedIndex]);
                return true;
              }

              if (event.key === "Escape") {
                popup?.hide();
                popup?.destroy();
                popup = null;
                return true;
              }

              return false;
            },

            /**
             * CLOSE POPUP
             */
            onExit: () => {
              popup?.destroy();
              popup = null;
              root = null;
              currentItems = [];
              lastProps = null;
              selectedIndex = 0;
            },
          };
        },
      }),
    ];
  },
});

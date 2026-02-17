import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { isWhitelisted } from "./embedWhitelist";

const key = new PluginKey("linkcard-plugin");

const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;

function extractUrl(text: string) {
  const trimmed = text.trim();
  const m = trimmed.match(URL_RE);
  return m ? trimmed : null;
}

function isJearnUrl(raw: string) {
  try {
    const u = new URL(raw.startsWith("http") ? raw : "https://" + raw);
    return u.hostname.endsWith("jearn.site");
  } catch {
    return false;
  }
}

export const LinkCardPlugin = Extension.create({
  name: "linkCardPlugin",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain")?.trim();

            if (!text) return false;

            const url = extractUrl(text);
            if (!url) return false;

            const normalizedUrl = url.startsWith("http")
              ? url
              : `https://${url}`;

            const { from, to } = view.state.selection;

            event.preventDefault();

            // 🔥 CASE 1: JEARN → popup mode
            if (isJearnUrl(normalizedUrl)) {
              let tr = view.state.tr
                .insertText(normalizedUrl, from, to)
                .setStoredMarks([])
                .setMeta("jearnLinkDetected", {
                  url: normalizedUrl,
                  from,
                  to: from + normalizedUrl.length,
                });

              view.dispatch(tr);
              return true;
            }

            console.log("JEARN detected", normalizedUrl);

            // 🔥 CASE 2: Whitelisted → embed
            if (isWhitelisted(normalizedUrl)) {
              const { state } = view;
              const schema = state.schema;
              const nodeType = schema.nodes.embedBlock;
              if (!nodeType) return false;

              const $from = state.selection.$from;
              const paragraphStart = $from.before();
              const paragraphEnd = $from.after();

              let tr = state.tr.delete(paragraphStart, paragraphEnd);

              const embedNode = nodeType.create({ url: normalizedUrl });
              tr = tr.insert(paragraphStart, embedNode);

              const paragraph = schema.nodes.paragraph.create();
              tr = tr.insert(paragraphStart + embedNode.nodeSize, paragraph);

              tr = tr.setSelection(
                TextSelection.create(
                  tr.doc,
                  paragraphStart + embedNode.nodeSize + 1
                )
              );

              view.dispatch(tr);
              return true;
            }

            // 🔥 CASE 3: Fallback → linkCard
            const { state } = view;
            const schema = state.schema;
            const linkCardType = schema.nodes.linkCard;

            if (!linkCardType) return false;

            const $from = state.selection.$from;
            const paragraphStart = $from.before();
            const paragraphEnd = $from.after();

            let tr = state.tr.delete(paragraphStart, paragraphEnd);

            const linkCardNode = linkCardType.create({
              url: normalizedUrl,
              loading: true,
            });

            tr = tr.insert(paragraphStart, linkCardNode);

            const paragraph = schema.nodes.paragraph.create();
            tr = tr.insert(paragraphStart + linkCardNode.nodeSize, paragraph);

            tr = tr.setSelection(
              TextSelection.create(
                tr.doc,
                paragraphStart + linkCardNode.nodeSize + 1
              )
            );

            view.dispatch(tr);
            return true;
          },
          handleKeyDown: (view, event) => {
            if (event.key !== " ") return false;

            const { state } = view;
            const { from, to } = state.selection;

            if (from !== to) return false;

            const $from = state.selection.$from;

            if ($from.parent.type.name !== "paragraph") return false;

            const paragraphStart = $from.start();
            const paragraphEnd = from; // 🔥 only up to cursor

            const rawText = state.doc.textBetween(
              paragraphStart,
              paragraphEnd,
              " "
            );

            const trimmed = rawText.trim();
            const url = extractUrl(trimmed);
            if (!url) return false;

            const normalizedUrl = url.startsWith("http")
              ? url
              : `https://${url}`;

            event.preventDefault();

            // 🔥 Delete only the URL range (not whole paragraph)
            let tr = state.tr.delete(paragraphStart, paragraphEnd);

            // JEARN
            if (isJearnUrl(normalizedUrl)) {
              const { state } = view;
              const { from, to } = state.selection;

              let tr = state.tr.delete(from, to);

              tr = tr.insertText(normalizedUrl, from);

              tr = tr.setMeta("jearnLinkDetected", {
                url: normalizedUrl,
                from,
                to: from + normalizedUrl.length,
              });

              view.dispatch(tr);
              return true;
            }

            // WHITELIST
            if (isWhitelisted(normalizedUrl)) {
              const schema = state.schema;
              const nodeType = schema.nodes.embedBlock;
              if (!nodeType) return false;
              let tr = state.tr.delete(paragraphStart, paragraphEnd);

              tr = tr.insertText(normalizedUrl, paragraphStart);

              tr = tr.setMeta("jearnLinkDetected", {
                url: normalizedUrl,
                from: paragraphStart,
                to: paragraphStart + normalizedUrl.length,
              });

              view.dispatch(tr);
              return true;
            }

            // FALLBACK linkCard
            const schema = state.schema;
            const linkCardType = schema.nodes.linkCard;
            if (!linkCardType) return false;

            // 🔥 delete entire paragraph for block insertion
            const blockStart = $from.before();
            const blockEnd = $from.after();

            let blockTr = state.tr.delete(blockStart, blockEnd);

            const linkCardNode = linkCardType.create({
              url: normalizedUrl,
              loading: true,
            });

            blockTr = blockTr.insert(blockStart, linkCardNode);

            const paragraph = schema.nodes.paragraph.create();
            blockTr = blockTr.insert(
              blockStart + linkCardNode.nodeSize,
              paragraph
            );

            blockTr = blockTr.setSelection(
              TextSelection.create(
                blockTr.doc,
                blockStart + linkCardNode.nodeSize + 1
              )
            );

            view.dispatch(blockTr);
            return true;
          },
        },
      }),
    ];
  },
});

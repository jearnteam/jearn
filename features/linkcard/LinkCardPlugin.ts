import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { isWhitelisted } from "./embedWhitelist";

const key = new PluginKey("linkcard-plugin");

const URL_RE = /https?:\/\/[^\s]+/i;

function extractUrlWithPos(text: string) {
  const match = text.match(URL_RE);
  if (!match) return null;

  return {
    url: match[0],
    index: match.index ?? 0,
  };
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
          handleKeyDown: (view, event) => {
            if (event.key !== " ") return false;

            const { state } = view;
            const { from, to } = state.selection;
            if (from !== to) return false;

            const $from = state.selection.$from;
            if ($from.parent.type.name !== "paragraph") return false;

            const paragraphStart = $from.start();
            const paragraphEnd = from;

            const rawText = state.doc.textBetween(
              paragraphStart,
              paragraphEnd,
              " "
            );

            const found = extractUrlWithPos(rawText);
            if (!found) return false;

            const { url, index } = found;
            const normalizedUrl = url.startsWith("http")
              ? url
              : `https://${url}`;

            event.preventDefault();

            const urlStart = paragraphStart + index;
            const urlEnd = urlStart + url.length;

            let tr = state.tr.delete(urlStart, urlEnd);

            // ===== JEARN (inline popup) =====
            if (isJearnUrl(normalizedUrl)) {
              tr = tr.insertText(normalizedUrl, urlStart);

              tr = tr.setMeta("jearnLinkDetected", {
                url: normalizedUrl,
                from: urlStart,
                to: urlStart + normalizedUrl.length,
              });

              view.dispatch(tr);
              return true;
            }

            // ===== WHITELIST (embed block) =====
            if (isWhitelisted(normalizedUrl)) {
              const schema = state.schema;
              const embedType = schema.nodes.embedBlock;
              if (!embedType) return false;

              const embedNode = embedType.create({ url: normalizedUrl });

              const paragraph = schema.nodes.paragraph.create();

              tr = tr.insert(urlStart, embedNode);

              const afterEmbed = tr.mapping.map(
                urlStart + embedNode.nodeSize
              );

              tr = tr.insert(afterEmbed, paragraph);

              tr = tr.setSelection(
                TextSelection.create(tr.doc, afterEmbed + 1)
              );

              view.dispatch(tr);
              return true;
            }

            // ===== LINK CARD (block, new line) =====
            const schema = state.schema;
            const linkCardType = schema.nodes.linkCard;
            if (!linkCardType) return false;

            const linkCardNode = linkCardType.create({
              url: normalizedUrl,
              loading: true,
            });

            const paragraph = schema.nodes.paragraph.create();

            // insert line break (paragraph)
            tr = tr.insert(urlStart, paragraph);

            const afterParagraph = tr.mapping.map(
              urlStart + paragraph.nodeSize
            );

            // insert card
            tr = tr.insert(afterParagraph, linkCardNode);

            const afterCard = tr.mapping.map(
              afterParagraph + linkCardNode.nodeSize
            );

            // insert trailing paragraph
            tr = tr.insert(afterCard, schema.nodes.paragraph.create());

            // move cursor
            tr = tr.setSelection(
              TextSelection.create(tr.doc, afterCard + 1)
            );

            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
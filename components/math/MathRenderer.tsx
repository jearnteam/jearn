"use client";

import { memo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import "katex/dist/katex.min.css";

import { stripEditorUI } from "./dom/editor";
import { renderEmbeds } from "./dom/embeds";
import { renderMath } from "./dom/math";
import { styleMentions, setupMentions } from "./dom/mentions";
import { setupTags } from "./dom/tags";
import { setupLegacyImages } from "./dom/images";
import { renderPrism } from "./dom/prism";
import { addCopyButtons } from "./dom/copy";
import { loadTwitterWidgets } from "./dom/embeds";
import { setupMentionHoverPopups } from "./dom/mentionHoverPopup";

function MathRendererBase({
  html,
  openLinksInNewTab = false,
}: {
  html: string;
  openLinksInNewTab?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    stripEditorUI(el);
    renderEmbeds(el, { openInNewTab: openLinksInNewTab });
    renderMath(el);
    styleMentions(el);
    setupMentions(el, router);
    setupMentionHoverPopups(el, router);
    setupTags(el);
    setupLegacyImages(el);
    renderPrism(el);
    addCopyButtons(el);
    loadTwitterWidgets(el);
  }, [html]);

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "b", "i", "strong", "em", "a", "code", "pre",
      "span", "div", "br", "ul", "ol", "li",
      "img", "blockquote"
    ],
    ALLOWED_ATTR: [
      "href", "src", "class", "data-*"
    ],
    ALLOWED_URI_REGEXP: /^(https?|mailto|tel):/i,
  });

  return (
    <div
      ref={ref}
      className="math-content break-words"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export const MathRenderer = memo(
  MathRendererBase,
  (prev, next) => prev.html === next.html
);

"use client";

import { memo, useEffect, useRef } from "react";
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

function MathRendererBase({
  html,
  openLinksInNewTab = false,
}: {
  html: string;
  openLinksInNewTab?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    stripEditorUI(el);
    renderEmbeds(el, { openInNewTab: openLinksInNewTab });
    renderMath(el);
    styleMentions(el);
    setupMentions(el);
    setupTags(el);
    setupLegacyImages(el);
    renderPrism(el);
    addCopyButtons(el);
    loadTwitterWidgets(el);
  }, [html]);

  return (
    <div
      ref={ref}
      className="math-content break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const MathRenderer = memo(
  MathRendererBase,
  (prev, next) => prev.html === next.html
);

export function stripEditorUI(el: HTMLElement) {
    el.querySelectorAll("[data-editor-only]").forEach((n) => n.remove());
  }
  
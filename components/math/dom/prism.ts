import Prism from "@/lib/prism";

export function renderPrism(el: HTMLElement) {
  const blocks = el.querySelectorAll("pre > code[class*='language-']");

  blocks.forEach((code) => {
    const codeEl = code as HTMLElement;
    const text = codeEl.textContent ?? "";
    codeEl.innerHTML = "";
    codeEl.textContent = text;
    Prism.highlightElement(codeEl);
  });
}

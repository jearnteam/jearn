import { lucide } from "@/lib/lucide-icons";

export function addCopyButtons(el: HTMLElement) {
  const blocks = el.querySelectorAll("pre > code");

  blocks.forEach((code) => {
    const pre = code.parentElement as HTMLElement | null;
    if (!pre || pre.querySelector("[data-copy-btn]")) return;

    const btn = document.createElement("button");
    btn.setAttribute("data-copy-btn", "true");
    btn.innerHTML = lucide.copy;

    btn.className = `
      absolute top-2 right-2
      h-7 w-7
      flex items-center justify-center
      rounded
      bg-black/60 hover:bg-black/80
      text-white
      transition
    `;

    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const text = code.textContent ?? "";
      await navigator.clipboard.writeText(text);
    };

    pre.classList.add("relative", "group");
    pre.appendChild(btn);
  });
}

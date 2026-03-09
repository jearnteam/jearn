import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function styleMentions(el: HTMLElement) {
  const mentions = el.querySelectorAll(
    "span[data-mention='true']"
  ) as NodeListOf<HTMLElement>;

  mentions.forEach((mentionEl) => {
    mentionEl.classList.add(
      "mention",
      "px-1",
      "py-0.5",
      "rounded",
      "bg-blue-100",
      "dark:bg-blue-900",
      "text-blue-700",
      "dark:text-blue-300",
      "font-medium"
    );
  });
}



export function setupMentions(el: HTMLElement, router: AppRouterInstance) {
  const mentions = el.querySelectorAll(
    "span[data-mention]"
  ) as NodeListOf<HTMLElement>;

  const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  mentions.forEach((mentionEl) => {
    mentionEl.style.cursor = "pointer";

    const uid = mentionEl.getAttribute("data-uid");
    if (!uid) return;

    if (isMobile) return;

    mentionEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/profile/${uid}`);
    });
  });
}
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
  
  export function setupMentions(el: HTMLElement) {
    const mentions = el.querySelectorAll(
      "span[data-mention]"
    ) as NodeListOf<HTMLElement>;
  
    mentions.forEach((mentionEl) => {
      mentionEl.style.cursor = "pointer";
    });
  }
  
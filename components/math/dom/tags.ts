export function setupTags(el: HTMLElement) {
    el.addEventListener(
      "click",
      (e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
  
        const tagEl = target.closest("[data-type='tag']") as HTMLElement | null;
        if (!tagEl) return;
  
        const value = tagEl.dataset.value;
        if (!value) return;
  
        e.preventDefault();
        e.stopImmediatePropagation();
  
        window.dispatchEvent(
          new CustomEvent("app:navigate", {
            detail: { href: `/tags/${encodeURIComponent(value)}` },
          })
        );
      },
      true
    );
  }
  
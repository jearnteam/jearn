import { lucide } from "@/lib/lucide-icons";

export function addCopyButtons(el: HTMLElement) {
  const blocks = el.querySelectorAll("pre > code");

  blocks.forEach((code) => {
    const pre = code.parentElement as HTMLElement | null;
    if (!pre || pre.closest("[data-copy-wrapper]")) return;

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-copy-wrapper", "true");
    wrapper.className = "relative group";

    // Replace pre with wrapper
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    // Create button
    const btn = document.createElement("button");
    btn.setAttribute("data-copy-btn", "true");
    btn.innerHTML = lucide.copy;

    btn.className = `
      absolute top-2 right-2 z-10
      h-7 w-7
      flex items-center justify-center
      rounded
      bg-black/60 hover:bg-black/80
      text-white
      transition
      opacity-0 group-hover:opacity-100
    `;

    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const text = code.textContent ?? "";

      try {
        await navigator.clipboard.writeText(text);

        // 🔁 Switch to check icon
        btn.innerHTML = lucide.check;

        // ✨ Optional little scale animation
        btn.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.2)" },
            { transform: "scale(1)" },
          ],
          { duration: 250 }
        );

        // ⏳ Revert after 1.5s
        setTimeout(() => {
          btn.innerHTML = lucide.copy;
        }, 1500);
      } catch {
        // Optional: error state
        btn.innerHTML = lucide.x;
        btn.classList.add("bg-red-600");

        setTimeout(() => {
          btn.innerHTML = lucide.copy;
          btn.classList.remove("bg-red-600");
        }, 1500);
      }
    };

    wrapper.appendChild(btn);
  });
}

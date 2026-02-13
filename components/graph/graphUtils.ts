export function safeTextPreview(html: string, max: number ) {
    if (!html) return "";
  
    const div = document.createElement("div");
    div.innerHTML = html;
  
    // 🔥 Replace math nodes with latex string
    div.querySelectorAll(".math-node").forEach((el) => {
      const latex = el.getAttribute("latex") || "";
      el.replaceWith(document.createTextNode(`$${latex}$`));
    });
  
    const text = (div.textContent || "").trim();
  
    return text.length > max ? text.slice(0, max) + "…" : text;
  }
  
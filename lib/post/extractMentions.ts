export function extractMentionedUsers(html: string): string[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
  
    const ids = new Set<string>();
  
    const mentions = Array.from(
      doc.querySelectorAll("[data-mention='true'][data-uid]")
    );
  
    for (const el of mentions) {
      const uid = el.getAttribute("data-uid");
      if (!uid) continue;
  
      // ensure valid 24 char Mongo ID
      if (/^[a-f0-9]{24}$/i.test(uid)) {
        ids.add(uid);
      }
    }
  
    return Array.from(ids);
  }
  
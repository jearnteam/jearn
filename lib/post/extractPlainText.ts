export function extractPlainText(html: string): string {
    if (!html) return "";
  
    return html
      // remove script/style
      .replace(/<(script|style)[^>]*>.*?<\/\1>/gis, " ")
      // remove all tags
      .replace(/<[^>]+>/g, " ")
      // decode basic entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      // collapse whitespace
      .replace(/\s+/g, " ")
      .trim();
  }
// lib/insertImageHtml.ts
export function buildImagePlaceholderHTML(
  id: string,
  width: number,
  height: number
) {
  return `
    <div 
      data-type="image-placeholder"
      data-id="${id}"
      data-width="${width}"
      data-height="${height}"
      class="image-placeholder"
    ></div>
  `;
}

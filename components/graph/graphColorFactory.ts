export function createColorStates(
    baseBorder: string,
    baseBackground: string,
    palette: any,
    isDark: boolean
  ) {
    return {
      background: baseBackground,
      border: baseBorder,
  
      hover: {
        background: isDark ? lighten(baseBorder, 0.25) : lighten(baseBorder, 0.35),
        border: baseBorder,
      },
  
      highlight: {
        background: isDark ? lighten(baseBorder, 0.35) : lighten(baseBorder, 0.45),
        border: baseBorder,
      },
    };
  }
  
  /* Simple lighten helper */
  function lighten(hex: string, amount: number) {
    const num = parseInt(hex.replace("#", ""), 16);
  
    const r = Math.min(255, ((num >> 16) & 0xff) + 255 * amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + 255 * amount);
    const b = Math.min(255, (num & 0xff) + 255 * amount);
  
    return `rgb(${r},${g},${b})`;
  }
  
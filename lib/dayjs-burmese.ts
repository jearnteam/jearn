import dayjs from "dayjs";

// Burmese number map
const burmeseDigitsMap: Record<string, string> = {
  "0": "၀",
  "1": "၁",
  "2": "၂",
  "3": "၃",
  "4": "၄",
  "5": "၅",
  "6": "၆",
  "7": "၇",
  "8": "၈",
  "9": "၉",
};

function toBurmeseDigits(input: string | number): string {
  return input
    .toString()
    .split("")
    .map((c) => burmeseDigitsMap[c] ?? c)
    .join("");
}

// Relative time
const relativeTime: any = {
  future: "%sအတွင်း",
  past: "%s",
  s: "စက္ကန့်အနည်းငယ်က",
  m: "၁ မိနစ်က",
  mm: (n: number) => `${toBurmeseDigits(n)} မိနစ်က`,
  h: "၁ နာရီက",
  hh: (n: number) => `${toBurmeseDigits(n)} နာရီက`,
  d: "၁ ရက်က",
  dd: (n: number) => {
    if (n === 20) {
      return "ရက်၂၀က";
    }
    return `${toBurmeseDigits(n)} ရက်က`;
  },
  M: "၁ လက",
  MM: (n: number) => `${toBurmeseDigits(n)} လက`,
  y: "၁ နှစ်က",
  yy: (n: number) => `${toBurmeseDigits(n)} နှစ်က`,
};

// Register only Burmese locale
dayjs.locale("my", {
  name: "my",
  relativeTime,
} as any);

// ❗ Export nothing — just registering the locale
export {};

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

// Relative time with Burmese numbers
const relativeTime: any = {
  future: "%sအတွင်း",
  past: "%s",

  s: "စက္ကန့်အနည်းငယ်အကြာက",
  m: "၁မိနစ် အကြာက",

  mm: (n: number) => `${toBurmeseDigits(n)}မိနစ် အကြာက`,
  h: "၁နာရီ အကြာက",
  hh: (n: number) => `${toBurmeseDigits(n)}နာရီ အကြာက`,
  d: "၁ရက် အကြာက",
  dd: (n: number) => `${toBurmeseDigits(n)}ရက် အကြာက`,
  M: "၁လ အကြာက",
  MM: (n: number) => `${toBurmeseDigits(n)}လ အကြာက`,
  y: "၁နှစ် အကြာက",
  yy: (n: number) => `${toBurmeseDigits(n)}နှစ် အကြာက`,
};

// Register Burmese locale (skip typing check)
dayjs.locale("my", {
  name: "my",
  relativeTime,
} as any);

export default dayjs;

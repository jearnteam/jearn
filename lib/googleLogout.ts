// @/lib/googleLogout.ts
export const getGoogleLogoutUrl = () => {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const returnUrl = `${base}/after-google-logout`;

  return `https://accounts.google.com/Logout?continue=${encodeURIComponent(
    returnUrl
  )}`;
};

export const getGoogleLogoutUrl = () => {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_BASE_URL is missing");

  const returnUrl = `${base}/after-google-logout`;

  return `https://accounts.google.com/Logout?continue=${encodeURIComponent(
    returnUrl
  )}`;
};

// features/googleForceLogout.ts
export const googleForceLogout = async () => {
  try {
    // Just poke the logout endpoint, no redirect, no continue=
    await fetch("https://accounts.google.com/Logout", { mode: "no-cors" });
  } catch (e) {
    console.warn("Google background logout failed (can be ignored):", e);
  }

  // Give the browser ~0.5s to clear Google cookies if it wants to
  await new Promise((res) => setTimeout(res, 500));
};

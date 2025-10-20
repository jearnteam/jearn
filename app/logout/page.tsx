"use client";
import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    // 👇 Your official Cloudflare Access team domain
    const teamDomain = "https://www.jearn.site";

    // 👇 Official logout endpoint with return_to param
    const logoutUrl = `${teamDomain}/cdn-cgi/access/logout`;

    // 🔁 Redirect to Cloudflare’s official logout page
    window.location.href = logoutUrl;
  }, []);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
        <p className="text-lg font-medium">Logging out...</p>
      </div>
    </div>
  );
}

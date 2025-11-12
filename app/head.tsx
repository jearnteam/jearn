export default function Head() {
  return (
    <>
      <title>JEARN</title>

      {/* Full-bleed content into notches / safe areas */}
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

      {/* Manifest + theme color */}
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="theme-color" content="#000000" />

      {/* Android hint (legacy but harmless) */}
      <meta name="mobile-web-app-capable" content="yes" />

      {/* iOS standalone support */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="JEARN" />
      <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    </>
  );
}

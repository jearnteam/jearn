export default function AppLayout({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay: React.ReactNode;
}) {
  return (
    <>
      {children}
      {overlay}
    </>
  );
}

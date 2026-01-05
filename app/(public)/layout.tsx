import PublicNavbar from "@/components/PublicNavbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNavbar />
      <div className="pt-[4.3rem]">{children}</div>
    </>
  );
}

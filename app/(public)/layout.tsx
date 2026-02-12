import I18nProvider from "@/components/I18nProvider";
import LanguageInitializer from "@/components/LanguageInitializer";
import PublicNavbar from "@/components/PublicNavbar";
import UserThemeSync from "@/components/UserThemeSync";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LanguageInitializer />
      <UserThemeSync />
      <I18nProvider>
        <PublicNavbar />
        <div className="pt-[4.3rem]">{children}</div>
      </I18nProvider>
    </>
  );
}

// app/(app)/profile/layout.tsx
import SimpleLayout from "../_layouts/SimpleLayout";

// Next.js が生成する型と一致させる
interface ProfileLayoutProps {
  children: React.ReactNode;
  overlay?: React.ReactNode;
}

export default function ProfileLayout({
  children,
  overlay,
}: ProfileLayoutProps) {
  return <SimpleLayout overlay={overlay}>{children}</SimpleLayout>;
}

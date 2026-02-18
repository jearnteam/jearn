// app/(app)/category/layout.tsx
import SimpleLayout from "../_layouts/SimpleLayout";

interface CategoryLayoutProps {
  children: React.ReactNode;
  // overlay は定義しない
}

export default function CategoryLayout({ children }: CategoryLayoutProps) {
  // SimpleLayout には children だけ渡す
  return <SimpleLayout>{children}</SimpleLayout>;
}

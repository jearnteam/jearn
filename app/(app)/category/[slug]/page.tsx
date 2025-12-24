import CategoryPageClientWrapper from "./CategoryPageClientWrapper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  return <CategoryPageClientWrapper slug={params.slug} />;
}

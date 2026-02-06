import CategoryPageClientWrapper from "./CategoryPageClientWrapper";

/**
 * Route configuration
 *
 * - dynamic = "force-dynamic"
 *   → Disable static optimization
 *   → Always render on request
 *
 * - revalidate = 0
 *   → Disable ISR caching
 *   → Required for real-time / frequently updated data
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * CategoryPage (Server Component)
 *
 * Responsibilities:
 * - Receive route params from Next.js
 * - Pass slug to client-side wrapper
 *
 * All data fetching and effects
 * are delegated to CategoryPageClientWrapper.
 */
export default function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  return <CategoryPageClientWrapper slug={params.slug} />;
}

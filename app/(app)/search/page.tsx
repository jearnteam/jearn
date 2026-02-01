import SearchPageClientWrapper from "@/features/search/SearchPageClientWrapper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SearchPage() {
  return <SearchPageClientWrapper />;
}

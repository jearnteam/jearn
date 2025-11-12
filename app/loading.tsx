// app/loading.tsx
import LoadingOwl from "@/components/LoadingOwl";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-neutral-900 z-[9999]">
      <div className="w-full h-full">
        <LoadingOwl />
      </div>
    </div>
  );
}

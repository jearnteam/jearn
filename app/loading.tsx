export default function Loading() {
  return (
    <div className="space-y-3 p-4">
      <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse" />
      <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
      <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse" />
    </div>
  );
}
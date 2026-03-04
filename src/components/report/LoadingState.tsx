import { Skeleton } from '@/components/ui/skeleton';

export function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="ml-auto flex gap-3">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Score cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-5 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-16" />
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-sm rounded-md" />
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <div className="pt-4 grid grid-cols-2 gap-4">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

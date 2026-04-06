import Skeleton from './Skeleton'

export default function DocumentListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
          <Skeleton className="h-8 w-8 rounded shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

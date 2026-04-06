import Skeleton from './Skeleton'

export default function RequirementListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-slate-200 rounded-lg p-4">
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-4 w-3/4 mb-1.5" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

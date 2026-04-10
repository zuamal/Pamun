interface SkeletonProps {
  className?: string
  height?: number | string
  width?: number | string
}

export default function Skeleton({ className = '', height, width }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] rounded dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 ${className}`}
      style={{ height, width }}
    />
  )
}

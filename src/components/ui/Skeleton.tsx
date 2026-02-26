'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'skeleton-shimmer rounded-xl bg-white/5',
            className
          )}
        />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass rounded-[20px] p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="glass rounded-[20px] p-8">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="glass rounded-[20px] p-6 space-y-3">
        <Skeleton className="h-4 w-full" count={5} />
      </div>
    </div>
  );
}

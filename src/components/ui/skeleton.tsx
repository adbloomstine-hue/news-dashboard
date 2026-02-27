import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-surface-raised",
        "after:absolute after:inset-0 after:bg-shimmer-gradient after:bg-[length:200%_100%] after:animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

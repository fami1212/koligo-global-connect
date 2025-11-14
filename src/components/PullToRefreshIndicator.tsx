import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  threshold: number;
}

export function PullToRefreshIndicator({
  isPulling,
  isRefreshing,
  pullDistance,
  threshold,
}: PullToRefreshIndicatorProps) {
  if (!isPulling && !isRefreshing) return null;

  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const opacity = Math.min(pullDistance / threshold, 1);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-200"
      style={{
        height: `${pullDistance}px`,
        opacity,
      }}
    >
      <div className="bg-background/90 backdrop-blur-sm rounded-full p-3 shadow-lg border border-border">
        {isRefreshing ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <ArrowDown
            className="h-6 w-6 text-primary transition-transform duration-200"
            style={{
              transform: `rotate(${progress >= 100 ? 180 : 0}deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
}

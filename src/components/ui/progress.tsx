import * as React from 'react';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className = '', value, max = 100, showLabel = false, variant = 'default', ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const variants = {
      default: 'bg-blue-600',
      success: 'bg-green-600',
      warning: 'bg-yellow-500',
      danger: 'bg-red-600',
    };

    return (
      <div className={`w-full ${className}`} ref={ref} {...props}>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all duration-300 ease-out ${variants[variant]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <p className="mt-1 text-right text-xs text-gray-600">{percentage.toFixed(0)}%</p>
        )}
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function StatCard({ title, value, icon: Icon, description, trend }: StatCardProps) {
  return (
    <div className="bg-white p-6 border border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-500">{title}</h3>
        <div className="p-2 bg-neutral-50 ">
          <Icon className="h-5 w-5 text-neutral-700" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-semibold text-neutral-900">{value}</p>
        {(description || trend) && (
          <div className="mt-1 flex items-center gap-2">
            {trend && (
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '+' : '-'}
                {Math.abs(trend.value)}%
              </span>
            )}
            {description && <span className="text-sm text-neutral-500">{description}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

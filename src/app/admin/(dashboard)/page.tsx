import StatCard from '@/components/admin/StatCard';
import { ShoppingBag, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard Overview</h1>
        <p className="text-neutral-500 mt-1">
          Welcome back. Here is what is happening with your catalog today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Items"
          value="124"
          icon={ShoppingBag}
          description="vs 118 last month"
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard title="Available" value="82" icon={CheckCircle} description="Ready for rent" />
        <StatCard
          title="Currently Rented"
          value="35"
          icon={Clock}
          description="Returns expected soon"
        />
        <StatCard
          title="In Maintenance"
          value="7"
          icon={AlertTriangle}
          description="Needs cleaning/repair"
        />
      </div>

      <div className="bg-white border border-neutral-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[
            {
              action: 'Status changed',
              item: 'Kebaya Modern Brokat (KMB-01)',
              status: 'Rented',
              time: '2 hours ago',
            },
            {
              action: 'New item added',
              item: 'Kebaya Klasik Payet (KKP-05)',
              status: 'Available',
              time: '5 hours ago',
            },
            {
              action: 'Status changed',
              item: 'Kebaya Bludru Hitam (KBH-02)',
              status: 'Maintenance',
              time: '1 day ago',
            },
            {
              action: 'Status changed',
              item: 'Kebaya Kutu Baru (KKB-11)',
              status: 'Available',
              time: '1 day ago',
            },
          ].map((activity, i) => (
            <div
              key={i}
              className="flex items-start justify-between py-3 border-b border-neutral-100 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{activity.action}</p>
                <p className="text-sm text-neutral-500">{activity.item}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-700">
                  {activity.status}
                </span>
                <p className="text-xs text-neutral-400 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

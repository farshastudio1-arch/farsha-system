import { Plus, Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import Image from 'next/image';

const mockCatalog = [
  { id: 1, code: 'KMB-01', name: 'Kebaya Modern Brokat', price: 'Rp 350.000', status: 'available', image: 'https://images.unsplash.com/photo-1574880521404-58bc443685db?q=80&w=200&auto=format&fit=crop' },
  { id: 2, code: 'KKP-05', name: 'Kebaya Klasik Payet', price: 'Rp 450.000', status: 'rented', image: 'https://images.unsplash.com/photo-1610444521447-0e69cb4ec49a?q=80&w=200&auto=format&fit=crop' },
  { id: 3, code: 'KBH-02', name: 'Kebaya Bludru Hitam', price: 'Rp 400.000', status: 'maintenance', image: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=200&auto=format&fit=crop' },
  { id: 4, code: 'KKB-11', name: 'Kebaya Kutu Baru', price: 'Rp 300.000', status: 'available', image: 'https://images.unsplash.com/photo-1589417859846-51e9389ea524?q=80&w=200&auto=format&fit=crop' },
];

const statusStyles: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  rented: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  archived: 'bg-neutral-100 text-neutral-700',
};

export default function CatalogManagement() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Catalog</h1>
          <p className="text-neutral-500 mt-1">Manage your kebaya inventory and pricing.</p>
        </div>
        <button className="bg-neutral-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-neutral-800 transition-colors">
          <Plus className="h-4 w-4" />
          Add New Item
        </button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input 
              type="text"
              placeholder="Search by name or code..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <select className="bg-white border border-neutral-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-900">
              <option>All Status</option>
              <option>Available</option>
              <option>Rented</option>
              <option>Maintenance</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-medium">Item</th>
                <th className="px-6 py-4 font-medium">Code</th>
                <th className="px-6 py-4 font-medium">Rental Price</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {mockCatalog.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md overflow-hidden bg-neutral-100 shrink-0 relative">
                        {/* We use standard img for simplicity in mock, next/image would require domain config */}
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <span className="font-medium text-neutral-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-neutral-500">{item.code}</td>
                  <td className="px-6 py-4 font-medium text-neutral-900">{item.price}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors rounded-md hover:bg-neutral-100">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-neutral-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-neutral-200 flex items-center justify-between text-sm text-neutral-500">
          <span>Showing 1 to 4 of 124 results</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-neutral-200 rounded-md hover:bg-neutral-50 disabled:opacity-50">Prev</button>
            <button className="px-3 py-1 border border-neutral-200 rounded-md hover:bg-neutral-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

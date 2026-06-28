import { Save, Image as ImageIcon } from 'lucide-react';

export default function CMSManagement() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Content Management</h1>
          <p className="text-neutral-500 mt-1">Manage fixed content sections of the public website.</p>
        </div>
        <button className="bg-neutral-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-neutral-800 transition-colors">
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>

      <div className="space-y-6">
        {/* Hero Section */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Hero Banner</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
              <input 
                type="text"
                defaultValue="Elegansi Kebaya Tradisional & Modern"
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Subtitle</label>
              <textarea 
                rows={3}
                defaultValue="Temukan koleksi kebaya terbaik untuk momen spesial Anda. Tersedia berbagai ukuran dan model."
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Hero Image</label>
              <div className="flex items-center justify-center w-full h-32 px-4 py-6 border-2 border-dashed border-neutral-300 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer">
                <div className="flex flex-col items-center">
                  <ImageIcon className="h-6 w-6 text-neutral-400 mb-2" />
                  <span className="text-sm text-neutral-500">Click to upload a new image</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Promotion Section */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Promotion Banner</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Promo Text (Top Bar)</label>
              <input 
                type="text"
                defaultValue="Promo spesial: Diskon 15% untuk penyewaan akhir pekan ini!"
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="show-promo" defaultChecked className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
              <label htmlFor="show-promo" className="text-sm text-neutral-700">Show promotion banner active</label>
            </div>
          </div>
        </div>

        {/* About Us Section */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">About Us</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
              <textarea 
                rows={5}
                defaultValue="Farsha Studio adalah pusat penyewaan kebaya yang menghadirkan perpaduan antara keindahan klasik dan sentuhan modern. Kami berkomitmen untuk..."
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

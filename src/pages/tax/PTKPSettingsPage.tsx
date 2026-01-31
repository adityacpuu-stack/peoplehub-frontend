import { useState } from 'react';
import {
  Users,
  Edit2,
  Save,
  X,
  Info,
  Calendar,
  CheckCircle,
  History,
  UserCircle,
  Heart,
  Baby,
  AlertTriangle,
} from 'lucide-react';

interface PTKPCategory {
  id: string;
  code: string;
  description: string;
  amount: number;
  breakdown: {
    wp: number;
    kawin: number;
    tanggungan: number;
  };
}

// PTKP 2024 (berlaku sejak 2016)
const ptkpCategories: PTKPCategory[] = [
  {
    id: '1',
    code: 'TK/0',
    description: 'Tidak Kawin tanpa tanggungan',
    amount: 54000000,
    breakdown: { wp: 54000000, kawin: 0, tanggungan: 0 },
  },
  {
    id: '2',
    code: 'TK/1',
    description: 'Tidak Kawin dengan 1 tanggungan',
    amount: 58500000,
    breakdown: { wp: 54000000, kawin: 0, tanggungan: 4500000 },
  },
  {
    id: '3',
    code: 'TK/2',
    description: 'Tidak Kawin dengan 2 tanggungan',
    amount: 63000000,
    breakdown: { wp: 54000000, kawin: 0, tanggungan: 9000000 },
  },
  {
    id: '4',
    code: 'TK/3',
    description: 'Tidak Kawin dengan 3 tanggungan',
    amount: 67500000,
    breakdown: { wp: 54000000, kawin: 0, tanggungan: 13500000 },
  },
  {
    id: '5',
    code: 'K/0',
    description: 'Kawin tanpa tanggungan',
    amount: 58500000,
    breakdown: { wp: 54000000, kawin: 4500000, tanggungan: 0 },
  },
  {
    id: '6',
    code: 'K/1',
    description: 'Kawin dengan 1 tanggungan',
    amount: 63000000,
    breakdown: { wp: 54000000, kawin: 4500000, tanggungan: 4500000 },
  },
  {
    id: '7',
    code: 'K/2',
    description: 'Kawin dengan 2 tanggungan',
    amount: 67500000,
    breakdown: { wp: 54000000, kawin: 4500000, tanggungan: 9000000 },
  },
  {
    id: '8',
    code: 'K/3',
    description: 'Kawin dengan 3 tanggungan',
    amount: 72000000,
    breakdown: { wp: 54000000, kawin: 4500000, tanggungan: 13500000 },
  },
  {
    id: '9',
    code: 'K/I/0',
    description: 'Kawin, penghasilan digabung, tanpa tanggungan',
    amount: 112500000,
    breakdown: { wp: 108000000, kawin: 4500000, tanggungan: 0 },
  },
  {
    id: '10',
    code: 'K/I/1',
    description: 'Kawin, penghasilan digabung, 1 tanggungan',
    amount: 117000000,
    breakdown: { wp: 108000000, kawin: 4500000, tanggungan: 4500000 },
  },
  {
    id: '11',
    code: 'K/I/2',
    description: 'Kawin, penghasilan digabung, 2 tanggungan',
    amount: 121500000,
    breakdown: { wp: 108000000, kawin: 4500000, tanggungan: 9000000 },
  },
  {
    id: '12',
    code: 'K/I/3',
    description: 'Kawin, penghasilan digabung, 3 tanggungan',
    amount: 126000000,
    breakdown: { wp: 108000000, kawin: 4500000, tanggungan: 13500000 },
  },
];

// PTKP Base components
const ptkpComponents = [
  { label: 'PTKP Wajib Pajak', amount: 54000000, icon: UserCircle, color: 'blue' },
  { label: 'Tambahan Kawin', amount: 4500000, icon: Heart, color: 'rose' },
  { label: 'Tambahan per Tanggungan (max 3)', amount: 4500000, icon: Baby, color: 'amber' },
  { label: 'Tambahan Istri Bekerja', amount: 54000000, icon: Users, color: 'purple' },
];

export function PTKPSettingsPage() {
  const [selectedCategory, setSelectedCategory] = useState<PTKPCategory | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (code: string) => {
    if (code.startsWith('K/I')) return 'bg-purple-100 text-purple-700';
    if (code.startsWith('K/')) return 'bg-rose-100 text-rose-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">PTKP Settings</h1>
              <p className="text-blue-100">Penghasilan Tidak Kena Pajak</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Berlaku sejak: Tahun 2016</span>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-800">Tentang PTKP</p>
            <p className="text-sm text-blue-600 mt-1">
              PTKP (Penghasilan Tidak Kena Pajak) adalah batas penghasilan minimum yang tidak dikenakan pajak. PTKP
              digunakan sebagai pengurang dalam perhitungan Penghasilan Kena Pajak (PKP) untuk menentukan PPh 21
              terutang.
            </p>
          </div>
        </div>
      </div>

      {/* PTKP Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ptkpComponents.map((component, index) => {
          const Icon = component.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-${component.color}-100`}>
                  <Icon className={`w-5 h-5 text-${component.color}-600`} />
                </div>
                <span className="text-sm text-gray-500">{component.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(component.amount)}</p>
              <p className="text-xs text-gray-400 mt-1">per tahun</p>
            </div>
          );
        })}
      </div>

      {/* PTKP Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Daftar Kategori PTKP</h3>
          <p className="text-sm text-gray-500 mt-1">Berdasarkan PMK No. 101/PMK.010/2016</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Kode
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Keterangan
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  PTKP per Tahun
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  PTKP per Bulan
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ptkpCategories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(category.code)}`}>
                      {category.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">{category.description}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-gray-900">{formatCurrency(category.amount)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-gray-600">{formatCurrency(category.amount / 12)}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedCategory(category)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h4 className="font-medium text-gray-900 mb-4">Keterangan Kode PTKP</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700">TK</span>
            <span className="text-gray-600">Tidak Kawin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-rose-100 text-rose-700">K</span>
            <span className="text-gray-600">Kawin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-700">K/I</span>
            <span className="text-gray-600">Kawin, Penghasilan Istri Digabung</span>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>• Angka setelah garis miring (/0, /1, /2, /3) menunjukkan jumlah tanggungan</p>
          <p>• Maksimal tanggungan yang diperhitungkan adalah 3 orang</p>
        </div>
      </div>

      {/* Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Catatan Penting</p>
            <ul className="text-sm text-amber-600 mt-2 space-y-1 list-disc list-inside">
              <li>Tanggungan yang diperhitungkan adalah anggota keluarga sedarah dan semenda dalam garis keturunan lurus</li>
              <li>Tanggungan harus tidak memiliki penghasilan dan menjadi tanggungan sepenuhnya</li>
              <li>Anak yang diperhitungkan: anak kandung, anak angkat, anak tiri yang belum berusia 21 tahun atau belum menikah</li>
              <li>K/I berlaku jika istri bekerja dan penghasilan digabung dengan suami</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" />
          <span>Berlaku sejak: 1 Januari 2016</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>PMK No. 101/PMK.010/2016</span>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Detail PTKP</h3>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Category Header */}
              <div className="text-center">
                <span className={`inline-flex px-4 py-2 rounded-full text-lg font-bold ${getStatusColor(selectedCategory.code)}`}>
                  {selectedCategory.code}
                </span>
                <p className="mt-2 text-gray-600">{selectedCategory.description}</p>
              </div>

              {/* Breakdown */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">Rincian Perhitungan</h5>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">PTKP Wajib Pajak</span>
                    <span className="font-medium">{formatCurrency(selectedCategory.breakdown.wp)}</span>
                  </div>
                  {selectedCategory.breakdown.kawin > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tambahan Kawin</span>
                      <span className="font-medium">{formatCurrency(selectedCategory.breakdown.kawin)}</span>
                    </div>
                  )}
                  {selectedCategory.breakdown.tanggungan > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Tambahan Tanggungan ({selectedCategory.breakdown.tanggungan / 4500000} orang)
                      </span>
                      <span className="font-medium">{formatCurrency(selectedCategory.breakdown.tanggungan)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="font-medium text-gray-900">Total PTKP per Tahun</span>
                    <span className="font-bold text-blue-600">{formatCurrency(selectedCategory.amount)}</span>
                  </div>
                </div>
              </div>

              {/* Monthly */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">PTKP per Bulan</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(selectedCategory.amount / 12)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setSelectedCategory(null)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

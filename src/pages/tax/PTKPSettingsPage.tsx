import { insightNumber } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import './tax-workflows.css';
import { Modal } from '@/components/ui';
import { useState } from 'react';
import { Users, Info, CheckCircle, History, UserCircle, Heart, Baby, AlertTriangle } from 'lucide-react';

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
  { get label() { return t('PTKP Wajib Pajak'); }, amount: 54000000, icon: UserCircle, color: 'blue' },
  { get label() { return t('Tambahan Kawin'); }, amount: 4500000, icon: Heart, color: 'rose' },
  { get label() { return t('Tambahan per Tanggungan (max 3)'); }, amount: 4500000, icon: Baby, color: 'amber' },
  { get label() { return t('Tambahan Istri Bekerja'); }, amount: 54000000, icon: Users, color: 'purple' },
];

export function PTKPSettingsPage() {
  useLocale();
  const [selectedCategory, setSelectedCategory] = useState<PTKPCategory | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(intlLocale(), {
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
    <div className="ph-workflow tax-workflow">
      {/* Header */}
      <header className="ph-page-header tax-page-header"><div><h1>{t("PTKP Settings")}</h1><p>{t("Penghasilan Tidak Kena Pajak")}</p></div><div className="ph-actions tax-header-actions"><span className="text-sm">{t("Berlaku sejak: Tahun 2016")}</span></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Referensi kategori PTKP dan rincian komponennya. Halaman ini tidak mengubah status PTKP karyawan atau konfigurasi payroll.")}</p>

      {/* Info Alert */}
      <div className="ph-section tax-section tax-reference-note">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-medium text-blue-800">{t("Tentang PTKP")}</p>
            <p className="text-sm text-blue-600 mt-1">{t("PTKP (Penghasilan Tidak Kena Pajak) adalah batas penghasilan minimum yang tidak dikenakan pajak. PTKP digunakan sebagai pengurang dalam perhitungan Penghasilan Kena Pajak (PKP) untuk menentukan PPh 21 terutang.")} </p>
          </div>
        </div>
      </div>

      {/* PTKP Components */}
      <div className="tax-summary">
        {ptkpComponents.map((component, index) => {
          const Icon = component.icon;
          return (
            <div key={index} className="tax-summary-item">
              <div className="flex items-center gap-3 mb-3">
                <Icon className={`w-5 h-5 text-${component.color}-600`} />
                <span className="text-sm text-gray-500">{component.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(component.amount)}</p>
              <p className="text-xs text-gray-400 mt-1">{t("per tahun")}</p>
            </div>
          );
        })}
      </div>

      {/* PTKP Table */}
      <div className="ph-section tax-section tax-register">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{t("Daftar Kategori PTKP")}</h3>
          <p className="text-sm text-gray-500 mt-1">{t("Berdasarkan PMK No. 101/PMK.010/2016")}</p>
        </div>

        <div className="ph-table-scroll tax-table-scroll">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Kode")} </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Keterangan")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("PTKP per Tahun")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("PTKP per Bulan")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Aksi")} </th>
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
                    <span className="text-gray-900">{t(category.description)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-gray-900">{formatCurrency(category.amount)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-gray-600">{formatCurrency(category.amount / 12)}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button type="button" aria-label={t("Detail")}
                      onClick={() => setSelectedCategory(category)}
                      className="ph-button tax-button"
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
      <div className="ph-section tax-section">
        <h4 className="font-medium text-gray-900 mb-4">{t("Keterangan Kode PTKP")}</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700">{t("TK")}</span>
            <span className="text-gray-600">{t("Tidak Kawin")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-rose-100 text-rose-700">{t("K")}</span>
            <span className="text-gray-600">{t("Kawin")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-700">{t("K/I")}</span>
            <span className="text-gray-600">{t("Kawin, Penghasilan Istri Digabung")}</span>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>{t("• Angka setelah garis miring (/0, /1, /2, /3) menunjukkan jumlah tanggungan")}</p>
          <p>{t("• Maksimal tanggungan yang diperhitungkan adalah 3 orang")}</p>
        </div>
      </div>

      {/* Note */}
      <div className="ph-section tax-section">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">{t("Catatan Penting")}</p>
            <ul className="text-sm text-amber-600 mt-2 space-y-1 list-disc list-inside">
              <li>{t("Tanggungan yang diperhitungkan adalah anggota keluarga sedarah dan semenda dalam garis keturunan lurus")}</li>
              <li>{t("Tanggungan harus tidak memiliki penghasilan dan menjadi tanggungan sepenuhnya")}</li>
              <li>{t("Anak yang diperhitungkan: anak kandung, anak angkat, anak tiri yang belum berusia 21 tahun atau belum menikah")}</li>
              <li>{t("K/I berlaku jika istri bekerja dan penghasilan digabung dengan suami")}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" />
          <span>{t("Berlaku sejak: 1 Januari 2016")}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>{t("PMK No. 101/PMK.010/2016")}</span>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCategory && (
        <Modal isOpen={true} onClose={() => setSelectedCategory(null)} title={t("Detail PTKP")} size="lg">
<div className="ph-workflow tax-workflow tax-detail"><div className="tax-dialog-body">
              {/* Category Header */}
              <div className="text-center">
                <span className={`inline-flex px-4 py-2 rounded-full text-lg font-bold ${getStatusColor(selectedCategory.code)}`}>
                  {selectedCategory.code}
                </span>
                <p className="mt-2 text-gray-600">{t(selectedCategory.description)}</p>
              </div>

              {/* Breakdown */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">{t("Rincian Perhitungan")}</h5>
                <div className="ph-section tax-section tax-stack">
                  <dl className="ph-kv tax-kv-row"><dt>{t("PTKP Wajib Pajak")}</dt><dd>{formatCurrency(selectedCategory.breakdown.wp)}</dd></dl>
                  {selectedCategory.breakdown.kawin > 0 && (
                    <dl className="ph-kv tax-kv-row"><dt>{t("Tambahan Kawin")}</dt><dd>{formatCurrency(selectedCategory.breakdown.kawin)}</dd></dl>
                  )}
                  {selectedCategory.breakdown.tanggungan > 0 && (
                    <dl className="ph-kv tax-kv-row"><dt>{t("Tambahan Tanggungan (")}{' '}{insightNumber(selectedCategory.breakdown.tanggungan / 4500000)}{' '}{t("orang)")} </dt><dd>{formatCurrency(selectedCategory.breakdown.tanggungan)}</dd></dl>
                  )}
                  <dl className="ph-kv tax-kv-row"><dt>{t("Total PTKP per Tahun")}</dt><dd>{formatCurrency(selectedCategory.amount)}</dd></dl>
                </div>
              </div>

              {/* Monthly */}
              <div className="ph-section tax-section">
                <dl className="ph-kv tax-kv-row"><dt>{t("PTKP per Bulan")}</dt><dd>
                    {formatCurrency(selectedCategory.amount / 12)}
                  </dd></dl>
              </div>
            </div><div className="ph-dialog-footer tax-dialog-actions">
              <button type="button"
                onClick={() => setSelectedCategory(null)}
                className="ph-button tax-button ph-button-primary"
              >{t("Tutup")} </button>
            </div></div>
</Modal>
      )}
    </div>
  );
}

import { insightNumber } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import './tax-workflows.css';
import { useState } from 'react';
import { Info, AlertTriangle, CheckCircle, History } from 'lucide-react';

interface TaxBracket {
  id: string;
  minIncome: number;
  maxIncome: number | null;
  rate: number;
  description: string;
}

interface BPJSRate {
  id: string;
  program: string;
  employeeRate: number;
  companyRate: number;
  maxSalary: number | null;
  description: string;
}

// PPh 21 Tax Brackets (TER - Tarif Efektif Rata-rata) 2024
const pph21Brackets: TaxBracket[] = [
  { id: '1', minIncome: 0, maxIncome: 60000000, rate: 5, description: 'Penghasilan s/d 60 juta' },
  { id: '2', minIncome: 60000000, maxIncome: 250000000, rate: 15, description: 'Penghasilan 60 - 250 juta' },
  { id: '3', minIncome: 250000000, maxIncome: 500000000, rate: 25, description: 'Penghasilan 250 - 500 juta' },
  { id: '4', minIncome: 500000000, maxIncome: 5000000000, rate: 30, description: 'Penghasilan 500 juta - 5 M' },
  { id: '5', minIncome: 5000000000, maxIncome: null, rate: 35, description: 'Penghasilan di atas 5 M' },
];

// PPh 23 Rates
const pph23Rates = [
  { id: '1', type: 'Dividen', rate: 15, description: 'Dividen kepada WP Badan/OP' },
  { id: '2', type: 'Bunga', rate: 15, description: 'Bunga termasuk premium, diskonto' },
  { id: '3', type: 'Royalti', rate: 15, description: 'Royalti' },
  { id: '4', type: 'Hadiah', rate: 15, description: 'Hadiah dan penghargaan selain undian' },
  { id: '5', type: 'Sewa', rate: 2, description: 'Sewa harta selain tanah/bangunan' },
  { id: '6', type: 'Jasa Teknik', rate: 2, description: 'Jasa teknik, manajemen, konsultan' },
  { id: '7', type: 'Jasa Lain', rate: 2, description: 'Jasa lainnya sesuai PMK' },
];

// BPJS Rates
const bpjsRates: BPJSRate[] = [
  {
    id: '1',
    program: 'BPJS Kesehatan',
    employeeRate: 1,
    companyRate: 4,
    maxSalary: 12000000,
    description: 'Jaminan Kesehatan',
  },
  {
    id: '2',
    program: 'JKK (Kecelakaan Kerja)',
    employeeRate: 0,
    companyRate: 0.24,
    maxSalary: null,
    description: 'Kategori I - Risiko sangat rendah',
  },
  {
    id: '3',
    program: 'JKM (Kematian)',
    employeeRate: 0,
    companyRate: 0.3,
    maxSalary: null,
    description: 'Jaminan Kematian',
  },
  {
    id: '4',
    program: 'JHT (Hari Tua)',
    employeeRate: 2,
    companyRate: 3.7,
    maxSalary: null,
    description: 'Jaminan Hari Tua',
  },
  {
    id: '5',
    program: 'JP (Pensiun)',
    employeeRate: 1,
    companyRate: 2,
    maxSalary: 10042300,
    description: 'Jaminan Pensiun (per Jan 2025)',
  },
];

export function TaxRatesPage() {
  useLocale();
  const [activeTab, setActiveTab] = useState<'pph21' | 'pph23' | 'bpjs'>('pph21');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatIncomeRange = (min: number, max: number | null) => {
    if (max === null) {
      return `> ${formatCurrency(min)}`;
    }
    if (min === 0) {
      return `≤ ${formatCurrency(max)}`;
    }
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  };

  return (
    <div className="ph-workflow tax-workflow">
      {/* Header */}
      <header className="ph-page-header tax-page-header"><div><h1>{t("Tax Rates")}</h1><p>{t("Tarif pajak PPh 21, PPh 23, dan BPJS")}</p></div><div className="ph-actions tax-header-actions"><span className="text-sm">{t("Berlaku: Tahun Pajak 2024/2025")}</span></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Referensi tarif pada halaman ini mengikuti periode yang tercantum. Halaman ini tidak mengubah konfigurasi atau perhitungan payroll.")}</p>

      {/* Info Alert */}
      <div className="ph-section tax-section tax-reference-note">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-medium text-blue-800">{t("Informasi Tarif Pajak")}</p>
            <p className="text-sm text-blue-600 mt-1">{t("Tabel ini menampilkan referensi untuk periode yang tercantum. Tarif pada halaman ini tidak diperbarui otomatis dan tidak mengubah pengaturan perhitungan payroll.")} </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ph-section tax-section">
        <div className="border-b border-gray-100">
          <div className="flex">
            <button aria-pressed={activeTab === 'pph21'} type="button"
              onClick={() => setActiveTab('pph21')}
              className="tax-tab"
            >{t("PPh 21")} {activeTab === 'pph21' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
              )}
            </button>
            <button aria-pressed={activeTab === 'pph23'} type="button"
              onClick={() => setActiveTab('pph23')}
              className="tax-tab"
            >{t("PPh 23")} {activeTab === 'pph23' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
              )}
            </button>
            <button aria-pressed={activeTab === 'bpjs'} type="button"
              onClick={() => setActiveTab('bpjs')}
              className="tax-tab"
            >{t("BPJS")} {activeTab === 'bpjs' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* PPh 21 Tab */}
          {activeTab === 'pph21' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t("Tarif Progresif PPh 21")}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t("Berdasarkan UU HPP No. 7 Tahun 2021")}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">{t("Aktif")} </span>
              </div>

              <div className="ph-table-scroll tax-table-scroll">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Layer")} </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Penghasilan Kena Pajak (PKP)")} </th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Tarif")} </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Keterangan")} </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pph21Brackets.map((bracket, index) => (
                      <tr key={bracket.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm">
                            {insightNumber(index + 1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">
                            {formatIncomeRange(bracket.minIncome, bracket.maxIncome)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">
                            {insightNumber(bracket.rate)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{t(bracket.description)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TER Info */}
              <div className="ph-section tax-section">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">{t("Catatan TER (Tarif Efektif Rata-rata)")}</p>
                    <p className="text-sm text-amber-600 mt-1">{t("Mulai Januari 2024, pemotongan PPh 21 bulanan menggunakan TER (Tarif Efektif Rata-rata) sesuai PP 58/2023. Tarif progresif di atas digunakan untuk perhitungan PPh 21 tahunan.")} </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PPh 23 Tab */}
          {activeTab === 'pph23' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t("Tarif PPh 23")}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t("Pajak atas penghasilan dari modal, jasa, dan hadiah")}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">{t("Aktif")} </span>
              </div>

              <div className="ph-table-scroll tax-table-scroll">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Jenis Penghasilan")} </th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Tarif")} </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Keterangan")} </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pph23Rates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">{t(rate.type)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full font-bold ${
                              rate.rate === 15
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {insightNumber(rate.rate)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{t(rate.description)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Note */}
              <div className="ph-section tax-section">
                <p className="text-sm text-gray-600">
                  <strong>{t("Catatan:")}</strong>{t("WP yang tidak memiliki NPWP dikenakan tarif lebih tinggi 100% dari tarif normal. Tarif PPh 23 atas jasa tertentu dapat berbeda sesuai dengan ketentuan yang berlaku.")} </p>
              </div>
            </div>
          )}

          {/* BPJS Tab */}
          {activeTab === 'bpjs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t("Tarif Iuran BPJS")}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t("BPJS Kesehatan dan BPJS Ketenagakerjaan")}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">{t("Aktif 2025")} </span>
              </div>

              <div className="ph-table-scroll tax-table-scroll">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Program")} </th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Karyawan")} </th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Perusahaan")} </th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Total")} </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("Batas Gaji")} </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bpjsRates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-medium text-gray-900">{t(rate.program)}</span>
                            <p className="text-sm text-gray-500">{t(rate.description)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">
                            {insightNumber(rate.employeeRate)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-bold">
                            {insightNumber(rate.companyRate)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                            {insightNumber(rate.employeeRate + rate.companyRate)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {rate.maxSalary ? (
                            <span className="text-gray-900">{formatCurrency(rate.maxSalary)}</span>
                          ) : (
                            <span className="text-gray-400">{t("Tidak ada")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="ph-section tax-section">
                  <p className="text-sm text-gray-500">{t("Total Iuran Karyawan")}</p>
                  <p className="text-2xl font-bold text-blue-600">4%</p>
                  <p className="text-xs text-gray-400 mt-1">{t("JHT 2% + JP 1% + Kes 1%")}</p>
                </div>
                <div className="ph-section tax-section">
                  <p className="text-sm text-gray-500">{t("Total Iuran Perusahaan")}</p>
                  <p className="text-2xl font-bold text-purple-600">10.24%</p>
                  <p className="text-xs text-gray-400 mt-1">{t("JKK + JKM + JHT + JP + Kes")}</p>
                </div>
                <div className="ph-section tax-section">
                  <p className="text-sm text-gray-500">{t("Total Keseluruhan")}</p>
                  <p className="text-2xl font-bold text-emerald-600">14.24%</p>
                  <p className="text-xs text-gray-400 mt-1">{t("Karyawan + Perusahaan")}</p>
                </div>
              </div>

              {/* JKK Categories Note */}
              <div className="ph-section tax-section">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">{t("Tarif JKK Berdasarkan Kategori Risiko")}</p>
                    <div className="text-sm text-amber-600 mt-2 space-y-1">
                      <p>{t("• Kategori I (Sangat Rendah): 0.24%")}</p>
                      <p>{t("• Kategori II (Rendah): 0.54%")}</p>
                      <p>{t("• Kategori III (Sedang): 0.89%")}</p>
                      <p>{t("• Kategori IV (Tinggi): 1.27%")}</p>
                      <p>{t("• Kategori V (Sangat Tinggi): 1.74%")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" />
          <span>{t("Terakhir diperbarui: 1 Januari 2025")}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>{t("Referensi sesuai periode yang tercantum")}</span>
        </div>
      </div>
    </div>
  );
}

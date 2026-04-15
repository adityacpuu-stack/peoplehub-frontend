import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Calculator,
  Settings,
  Percent,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Database,
  CheckCircle,
  XCircle,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { payrollSettingService } from '@/services/payroll-setting.service';
import type { TaxConfiguration, TaxBracket, PTKP } from '@/services/payroll-setting.service';

type SettingsTab = 'ter' | 'brackets' | 'ptkp';

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '–';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const formatPercent = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '–';
  return `${(value * 100).toFixed(2)}%`;
};

const TH = 'text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider';
const TD = 'py-3 px-4 text-sm';

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
      <p className="text-xs text-gray-400">Halaman {page} dari {totalPages}</p>
      <div className="flex gap-1">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyData({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={10} className="text-center py-10 text-sm text-gray-400">
        {label} — klik <span className="font-medium text-slate-600">"Seed Data Pajak"</span> untuk menginisialisasi
      </td>
    </tr>
  );
}

export function PayrollSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ter');
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const [terConfigs, setTerConfigs] = useState<TaxConfiguration[]>([]);
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([]);
  const [ptkpList, setPtkpList] = useState<PTKP[]>([]);

  const [terPage, setTerPage] = useState(1);
  const [terTotalPages, setTerTotalPages] = useState(1);
  const [bracketsPage, setBracketsPage] = useState(1);
  const [bracketsTotalPages, setBracketsTotalPages] = useState(1);
  const [ptkpPage, setPtkpPage] = useState(1);
  const [ptkpTotalPages, setPtkpTotalPages] = useState(1);

  const [terCategory, setTerCategory] = useState<string>('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [terRes, bracketsRes, ptkpRes] = await Promise.all([
        payrollSettingService.getTaxConfigurations({ page: terPage, limit: 20, tax_category: terCategory || undefined }),
        payrollSettingService.getTaxBrackets({ page: bracketsPage, limit: 10 }),
        payrollSettingService.getPtkpList({ page: ptkpPage, limit: 20 }),
      ]);
      setTerConfigs(terRes.data);
      setTerTotalPages(terRes.pagination?.totalPages || 1);
      setTaxBrackets(bracketsRes.data);
      setBracketsTotalPages(bracketsRes.pagination?.totalPages || 1);
      setPtkpList(ptkpRes.data);
      setPtkpTotalPages(ptkpRes.pagination?.totalPages || 1);
    } catch {
      toast.error('Gagal memuat data pengaturan payroll');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [terPage, bracketsPage, ptkpPage, terCategory]);

  const handleSeedAll = async () => {
    if (!confirm('Inisialisasi semua data pajak? Data yang sudah ada tidak akan ditimpa.')) return;
    setIsSeeding(true);
    try {
      const result = await payrollSettingService.seedAllTaxData();
      toast.success(`Berhasil! TER: ${result.ter_rates.created} baru, Brackets: ${result.tax_brackets.created} baru, PTKP: ${result.ptkp.created} baru`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal menginisialisasi data');
    } finally {
      setIsSeeding(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'ter', label: 'Tarif Efektif (TER)', icon: <Calculator className="w-4 h-4" />, count: terConfigs.length },
    { id: 'brackets', label: 'Tarif Progresif', icon: <Percent className="w-4 h-4" />, count: taxBrackets.length },
    { id: 'ptkp', label: 'PTKP', icon: <Users className="w-4 h-4" />, count: ptkpList.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pengaturan Payroll</h1>
            <p className="text-sm text-gray-500">Kelola tarif pajak, PTKP, dan konfigurasi PPh 21</p>
          </div>
        </div>
        <button
          onClick={handleSeedAll}
          disabled={isSeeding}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {isSeeding
            ? <><Loader2 className="w-4 h-4 animate-spin" />Menginisialisasi...</>
            : <><Database className="w-4 h-4" />Seed Data Pajak</>
          }
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'TER Config', value: terConfigs.length, icon: <Calculator className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Tax Brackets', value: taxBrackets.length, icon: <Percent className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Status PTKP', value: ptkpList.length, icon: <Users className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="p-6">

            {/* TER Tab */}
            {activeTab === 'ter' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Tarif Efektif Rata-rata (TER)</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Konfigurasi tarif PPh 21 metode TER sesuai PMK 168/2023</p>
                  </div>
                  <div className="relative">
                    <select
                      value={terCategory}
                      onChange={(e) => { setTerCategory(e.target.value); setTerPage(1); }}
                      className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:border-slate-400 focus:outline-none appearance-none bg-white"
                    >
                      <option value="">Semua Kategori</option>
                      <option value="TER_A">TER A (TK/0, TK/1)</option>
                      <option value="TER_B">TER B (TK/2, TK/3, K/0, K/1)</option>
                      <option value="TER_C">TER C (K/2, K/3)</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className={TH}>Kategori</th>
                        <th className={TH + ' text-right'}>Min. Penghasilan</th>
                        <th className={TH + ' text-right'}>Max. Penghasilan</th>
                        <th className={TH + ' text-right'}>Tarif</th>
                        <th className={TH + ' text-center'}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {terConfigs.length === 0
                        ? <EmptyData label="Belum ada data TER" />
                        : terConfigs.map(config => (
                          <tr key={config.id} className="hover:bg-gray-50 transition-colors">
                            <td className={TD}>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                config.tax_category === 'TER_A' ? 'bg-blue-50 text-blue-700' :
                                config.tax_category === 'TER_B' ? 'bg-indigo-50 text-indigo-700' :
                                'bg-purple-50 text-purple-700'
                              }`}>
                                {config.tax_category}
                              </span>
                            </td>
                            <td className={TD + ' text-right text-gray-700'}>{formatCurrency(config.min_income)}</td>
                            <td className={TD + ' text-right text-gray-700'}>{config.max_income ? formatCurrency(config.max_income) : <span className="text-gray-400 italic text-xs">Tidak terbatas</span>}</td>
                            <td className={TD + ' text-right font-semibold text-gray-900'}>{formatPercent(config.tax_rate)}</td>
                            <td className={TD + ' text-center'}>
                              {config.is_active
                                ? <CheckCircle className="w-4 h-4 text-emerald-500 inline" />
                                : <XCircle className="w-4 h-4 text-red-400 inline" />
                              }
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
                <Pagination page={terPage} totalPages={terTotalPages} onChange={setTerPage} />
              </div>
            )}

            {/* Brackets Tab */}
            {activeTab === 'brackets' && (
              <div>
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900">Tarif Progresif PPh 21</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Layer pajak penghasilan berdasarkan PKP tahunan</p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className={TH}>Layer</th>
                        <th className={TH + ' text-right'}>Min. PKP</th>
                        <th className={TH + ' text-right'}>Max. PKP</th>
                        <th className={TH + ' text-right'}>Tarif</th>
                        <th className={TH + ' text-center'}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {taxBrackets.length === 0
                        ? <EmptyData label="Belum ada data tarif progresif" />
                        : taxBrackets.map((bracket, i) => (
                          <tr key={bracket.id} className="hover:bg-gray-50 transition-colors">
                            <td className={TD}>
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                                  {i + 1}
                                </span>
                                <span className="font-medium text-gray-900 text-sm">{bracket.bracket_name}</span>
                              </div>
                            </td>
                            <td className={TD + ' text-right text-gray-700'}>{formatCurrency(bracket.min_income)}</td>
                            <td className={TD + ' text-right text-gray-700'}>{bracket.max_income ? formatCurrency(bracket.max_income) : <span className="text-gray-400 italic text-xs">Tidak terbatas</span>}</td>
                            <td className={TD + ' text-right'}>
                              <span className="text-sm font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
                                {formatPercent(bracket.rate)}
                              </span>
                            </td>
                            <td className={TD + ' text-center'}>
                              {bracket.is_active
                                ? <CheckCircle className="w-4 h-4 text-emerald-500 inline" />
                                : <XCircle className="w-4 h-4 text-red-400 inline" />
                              }
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
                <Pagination page={bracketsPage} totalPages={bracketsTotalPages} onChange={setBracketsPage} />

                {taxBrackets.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ringkasan Layer</p>
                    <div className="flex flex-wrap gap-2">
                      {['5%', '15%', '25%', '30%', '35%'].map((rate, i) => (
                        <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
                          Layer {i + 1}: <span className="font-semibold text-purple-700">{rate}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PTKP Tab */}
            {activeTab === 'ptkp' && (
              <div>
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900">Penghasilan Tidak Kena Pajak (PTKP)</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Nilai PTKP per tahun berdasarkan status perkawinan dan tanggungan</p>
                </div>

                {ptkpList.length === 0 ? (
                  <div className="text-center py-10 text-sm text-gray-400 bg-gray-50 rounded-xl">
                    Belum ada data PTKP — klik <span className="font-medium text-slate-600">"Seed Data Pajak"</span> untuk menginisialisasi
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ptkpList.map(ptkp => (
                      <div key={ptkp.id} className={`p-4 rounded-xl border transition-all ${
                        ptkp.is_active ? 'bg-white border-gray-200 hover:border-emerald-200' : 'bg-gray-50 border-gray-100 opacity-60'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                            {ptkp.status}
                          </span>
                          {ptkp.is_active
                            ? <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                            : <span className="w-2 h-2 bg-gray-300 rounded-full" />
                          }
                        </div>
                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">{ptkp.description}</p>
                        <p className="text-base font-bold text-gray-900">{formatCurrency(ptkp.amount)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">per tahun</p>
                      </div>
                    ))}
                  </div>
                )}
                <Pagination page={ptkpPage} totalPages={ptkpTotalPages} onChange={setPtkpPage} />

                {ptkpList.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { title: 'Tidak Kawin (TK)', items: ['TK/0 = 0 tanggungan', 'TK/1 = 1 tanggungan', 'TK/2 = 2 tanggungan', 'TK/3 = 3 tanggungan'] },
                      { title: 'Kawin (K)', items: ['K/0 = 0 tanggungan', 'K/1 = 1 tanggungan', 'K/2 = 2 tanggungan', 'K/3 = 3 tanggungan'] },
                    ].map(group => (
                      <div key={group.title} className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.title}</p>
                        <div className="space-y-1">
                          {group.items.map(item => (
                            <p key={item} className="text-xs text-gray-600">{item}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

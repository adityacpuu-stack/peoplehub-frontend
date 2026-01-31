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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, PageSpinner } from '@/components/ui';
import { payrollSettingService } from '@/services/payroll-setting.service';
import type { TaxConfiguration, TaxBracket, PTKP } from '@/services/payroll-setting.service';

type SettingsTab = 'ter' | 'brackets' | 'ptkp';

export function PayrollSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ter');
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Data states
  const [terConfigs, setTerConfigs] = useState<TaxConfiguration[]>([]);
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([]);
  const [ptkpList, setPtkpList] = useState<PTKP[]>([]);

  // Pagination states
  const [terPage, setTerPage] = useState(1);
  const [terTotalPages, setTerTotalPages] = useState(1);
  const [bracketsPage, setBracketsPage] = useState(1);
  const [bracketsTotalPages, setBracketsTotalPages] = useState(1);
  const [ptkpPage, setPtkpPage] = useState(1);
  const [ptkpTotalPages, setPtkpTotalPages] = useState(1);

  // Filter states
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
    } catch (error) {
      console.error('Failed to fetch payroll settings:', error);
      toast.error('Gagal memuat data pengaturan payroll');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [terPage, bracketsPage, ptkpPage, terCategory]);

  const handleSeedAll = async () => {
    if (!confirm('Apakah Anda yakin ingin menginisialisasi semua data pajak? Data yang sudah ada tidak akan ditimpa.')) {
      return;
    }

    setIsSeeding(true);
    try {
      const result = await payrollSettingService.seedAllTaxData();
      toast.success(`Berhasil! TER: ${result.ter_rates.created} baru, Brackets: ${result.tax_brackets.created} baru, PTKP: ${result.ptkp.created} baru`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Gagal menginisialisasi data');
    } finally {
      setIsSeeding(false);
    }
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return `${(value * 100).toFixed(2)}%`;
  };

  const tabs = [
    { id: 'ter' as const, label: 'Tarif Efektif (TER)', icon: Calculator },
    { id: 'brackets' as const, label: 'Tarif Progresif', icon: Percent },
    { id: 'ptkp' as const, label: 'PTKP', icon: Users },
  ];

  if (isLoading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <Settings className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Pengaturan Payroll
                  </h1>
                  <p className="text-emerald-100 text-sm mt-1">
                    Kelola tarif pajak, PTKP, dan konfigurasi payroll sistem
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSeedAll}
              disabled={isSeeding}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-700 rounded-xl hover:bg-emerald-50 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50"
            >
              {isSeeding ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Menginisialisasi...</span>
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  <span>Seed Data Pajak</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total TER Config</p>
                <p className="text-3xl font-bold text-gray-900">{terConfigs.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tax Brackets</p>
                <p className="text-3xl font-bold text-gray-900">{taxBrackets.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Percent className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">PTKP Status</p>
                <p className="text-3xl font-bold text-gray-900">{ptkpList.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100">
          <nav className="flex space-x-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* TER Tab */}
        {activeTab === 'ter' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tarif Efektif Rata-rata (TER)</h3>
                <p className="text-sm text-gray-500">Konfigurasi tarif PPh 21 metode TER</p>
              </div>
              <select
                value={terCategory}
                onChange={(e) => {
                  setTerCategory(e.target.value);
                  setTerPage(1);
                }}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">Semua Kategori</option>
                <option value="TER_A">TER A (TK/0, TK/1)</option>
                <option value="TER_B">TER B (TK/2, TK/3, K/0, K/1)</option>
                <option value="TER_C">TER C (K/2, K/3)</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Kategori</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Min. Penghasilan</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Max. Penghasilan</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Tarif</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {terConfigs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        Belum ada data TER. Klik "Seed Data Pajak" untuk menginisialisasi.
                      </td>
                    </tr>
                  ) : (
                    terConfigs.map((config) => (
                      <tr key={config.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700">
                            {config.tax_category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-700">
                          {formatCurrency(config.min_income)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-700">
                          {config.max_income ? formatCurrency(config.max_income) : 'Tidak terbatas'}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                          {formatPercent(config.tax_rate)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {config.is_active ? (
                            <CheckCircle className="w-5 h-5 text-green-500 inline" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 inline" />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {terTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Halaman {terPage} dari {terTotalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTerPage((p) => Math.max(1, p - 1))}
                    disabled={terPage === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTerPage((p) => Math.min(terTotalPages, p + 1))}
                    disabled={terPage === terTotalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tax Brackets Tab */}
        {activeTab === 'brackets' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tarif Progresif PPh 21</h3>
                <p className="text-sm text-gray-500">Layer pajak penghasilan berdasarkan PKP</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Layer</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Min. PKP</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Max. PKP</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Tarif</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {taxBrackets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        Belum ada data tarif progresif. Klik "Seed Data Pajak" untuk menginisialisasi.
                      </td>
                    </tr>
                  ) : (
                    taxBrackets.map((bracket) => (
                      <tr key={bracket.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900">{bracket.bracket_name}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-700">
                          {formatCurrency(bracket.min_income)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-700">
                          {bracket.max_income ? formatCurrency(bracket.max_income) : 'Tidak terbatas'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold bg-purple-50 text-purple-700">
                            {formatPercent(bracket.rate)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {bracket.is_active ? (
                            <CheckCircle className="w-5 h-5 text-green-500 inline" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 inline" />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <h4 className="font-semibold text-purple-900 mb-2">Informasi Tarif Progresif</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>Layer 1: 5% untuk PKP s/d Rp 60 juta</li>
                <li>Layer 2: 15% untuk PKP Rp 60 juta - Rp 250 juta</li>
                <li>Layer 3: 25% untuk PKP Rp 250 juta - Rp 500 juta</li>
                <li>Layer 4: 30% untuk PKP Rp 500 juta - Rp 5 miliar</li>
                <li>Layer 5: 35% untuk PKP di atas Rp 5 miliar</li>
              </ul>
            </div>
          </div>
        )}

        {/* PTKP Tab */}
        {activeTab === 'ptkp' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Penghasilan Tidak Kena Pajak (PTKP)</h3>
                <p className="text-sm text-gray-500">Nilai PTKP berdasarkan status perkawinan dan tanggungan</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ptkpList.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  Belum ada data PTKP. Klik "Seed Data Pajak" untuk menginisialisasi.
                </div>
              ) : (
                ptkpList.map((ptkp) => (
                  <div
                    key={ptkp.id}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-emerald-100 text-emerald-700">
                        {ptkp.status}
                      </span>
                      {ptkp.is_active ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Nonaktif</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{ptkp.description}</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(ptkp.amount)}</p>
                    <p className="text-xs text-gray-500 mt-1">per tahun</p>
                  </div>
                ))
              )}
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <h4 className="font-semibold text-emerald-900 mb-2">Keterangan Status PTKP</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-emerald-700">
                <div>
                  <p><strong>TK/0</strong> = Tidak Kawin, 0 Tanggungan</p>
                  <p><strong>TK/1</strong> = Tidak Kawin, 1 Tanggungan</p>
                  <p><strong>TK/2</strong> = Tidak Kawin, 2 Tanggungan</p>
                  <p><strong>TK/3</strong> = Tidak Kawin, 3 Tanggungan</p>
                </div>
                <div>
                  <p><strong>K/0</strong> = Kawin, 0 Tanggungan</p>
                  <p><strong>K/1</strong> = Kawin, 1 Tanggungan</p>
                  <p><strong>K/2</strong> = Kawin, 2 Tanggungan</p>
                  <p><strong>K/3</strong> = Kawin, 3 Tanggungan</p>
                </div>
              </div>
              <p className="text-sm text-emerald-700 mt-2">
                <strong>K/I/x</strong> = Kawin dengan penghasilan istri digabung
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

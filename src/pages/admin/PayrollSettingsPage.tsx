import { t, useLocale, intlLocale } from '@/i18n';
import { useReportConfirmation } from '@/pages/dashboard/useReportConfirmation';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import './admin-workflows.css';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Calculator, Percent, Users, ChevronLeft, ChevronRight, RefreshCw, Database, CheckCircle, XCircle, ChevronDown, Loader2 } from 'lucide-react';
import { payrollSettingService } from '@/services/payroll-setting.service';
import type { TaxConfiguration, TaxBracket, PTKP } from '@/services/payroll-setting.service';

type SettingsTab = 'ter' | 'brackets' | 'ptkp';

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '–';
  return new Intl.NumberFormat(intlLocale(), { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const formatPercent = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '–';
  return `${(value * 100).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })}%`;
};

const TH = 'text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider';
const TD = 'py-3 px-4 text-sm';

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  useLocale();
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
      <p className="text-xs text-gray-400">{t("Halaman")} {(page).toLocaleString(intlLocale())}{' '}{t("dari")} {(totalPages).toLocaleString(intlLocale())}</p>
      <div className="flex gap-1">
        <button aria-label={t("Halaman sebelumnya")} onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button aria-label={t("Halaman berikutnya")} onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyData({ label }: { label: string }) {
  useLocale();
  return (
    <tr>
      <td colSpan={10} className="text-center py-10 text-sm text-gray-400">
        {label}{' '}{t("— klik")} <span className="font-medium text-slate-600">{t("\"Seed Data Pajak\"")}</span>{' '}{t("untuk menginisialisasi")} </td>
    </tr>
  );
}

export function PayrollSettingsPage() {
  useLocale();
  const { confirm, dialog: confirmationDialog } = useReportConfirmation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('ter');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const loadSequence = useRef(0);
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
    const sequence = ++loadSequence.current;
    setIsLoading(true);
    setLoadError(false);
    try {
      const [terRes, bracketsRes, ptkpRes] = await Promise.all([
        payrollSettingService.getTaxConfigurations({ page: terPage, limit: 20, tax_category: terCategory || undefined }),
        payrollSettingService.getTaxBrackets({ page: bracketsPage, limit: 10 }),
        payrollSettingService.getPtkpList({ page: ptkpPage, limit: 20 }),
      ]);
      if (sequence !== loadSequence.current) return;
      setTerConfigs(terRes.data);
      setTerTotalPages(terRes.pagination?.totalPages || 1);
      setTaxBrackets(bracketsRes.data);
      setBracketsTotalPages(bracketsRes.pagination?.totalPages || 1);
      setPtkpList(ptkpRes.data);
      setPtkpTotalPages(ptkpRes.pagination?.totalPages || 1);
    } catch {
      if (sequence !== loadSequence.current) return;
      setLoadError(true);
      toast.error(t("Gagal memuat data pengaturan payroll"));
    } finally {
      if (sequence === loadSequence.current) setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [terPage, bracketsPage, ptkpPage, terCategory]);

  const handleSeedAll = async () => {
    if (!(await confirm(t("Inisialisasi semua data pajak? Data yang sudah ada tidak akan ditimpa.")))) return;
    setIsSeeding(true);
    try {
      const result = await payrollSettingService.seedAllTaxData();
      toast.success(t("Berhasil! TER: {ter} baru, Brackets: {brackets} baru, PTKP: {ptkp} baru", { ter: result.ter_rates.created.toLocaleString(intlLocale()), brackets: result.tax_brackets.created.toLocaleString(intlLocale()), ptkp: result.ptkp.created.toLocaleString(intlLocale()) }));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('Gagal menginisialisasi data'), { id: 'api-error' });
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
    <ReportPage  className="ph-admin-page">{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl font-bold text-gray-900">{t("Pengaturan Payroll")}</h1><p className="text-sm text-gray-500">{t("Kelola tarif pajak, PTKP, dan konfigurasi PPh 21")}</p></div>
<div className="report-header-context"><button
          onClick={handleSeedAll}
          disabled={isSeeding || isLoading || loadError}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-md transition-colors disabled:opacity-50"
        >
          {isSeeding
            ? <><Loader2 className="w-4 h-4 animate-spin" />{t("Menginisialisasi...")}</>
            : <><Database className="w-4 h-4" />{t("Seed Data Pajak")}</>
          }
        </button></div>
</ReportHeader>{/* Stats */}<ReportSummary>{[
          { label: 'TER Config', value: terConfigs.length, icon: <Calculator className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Tax Brackets', value: taxBrackets.length, icon: <Percent className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Status PTKP', value: ptkpList.length, icon: <Users className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className="report-metric"><div className="report-metric-context">{s.icon}</div><div>
              <p className="report-metric-label">{t(s.label)}</p>
              <p className="report-metric-value">{isLoading || loadError ? '—' : s.value.toLocaleString(intlLocale())}</p>
            </div></div>
        ))}</ReportSummary>{/* Main Panel */}<ReportSection  className="overflow-hidden">{/* Tabs */}<div className="ph-tabs admin-payroll-tabs">
          {tabs.map(tab => (
            <button aria-selected={activeTab === tab.id}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-slate-800 text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              {t(tab.label)}
              {!isLoading && !loadError && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {(tab.count).toLocaleString(intlLocale())}
                </span>
              )}
            </button>
          ))}
        </div>{/* Loading */}{isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : loadError ? (
          <div className="admin-load-error" role="alert">
            <h3>{t("Pengaturan payroll belum bisa dimuat")}</h3>
            <p>{t("Coba muat ulang untuk melihat data tarif yang tersimpan.")}</p>
            <button className="ph-button" onClick={fetchData}>{t("Coba lagi")}</button>
          </div>
        ) : (
          <div className="admin-payroll-content">

            {/* TER Tab */}
            {activeTab === 'ter' && (
              <div>
                <div className="admin-payroll-filter">
                  <div>
                    <h3 className="font-semibold text-gray-900">{t("Tarif Efektif Rata-rata (TER)")}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{t("Konfigurasi tarif PPh 21 metode TER sesuai PMK 168/2023")}</p>
                  </div>
                  <div className="relative">
                    <select
                      value={terCategory}
                      onChange={(e) => { setTerCategory(e.target.value); setTerPage(1); }}
                      className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-md focus:border-slate-400 focus:outline-none appearance-none bg-white"
                    >
                      <option value="">{t("Semua Kategori")}</option>
                      <option value="TER_A">{"TER A (TK/0, TK/1)"}</option>
                      <option value="TER_B">{"TER B (TK/2, TK/3, K/0, K/1)"}</option>
                      <option value="TER_C">{"TER C (K/2, K/3)"}</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div  className="ph-table-scroll overflow-x-auto rounded-md border border-gray-100"><table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className={TH}>{t("Kategori")}</th>
                        <th className={TH + " text-right"}>{t("Min. Penghasilan")}</th>
                        <th className={TH + " text-right"}>{t("Max. Penghasilan")}</th>
                        <th className={TH + " text-right"}>{t("Tarif")}</th>
                        <th className={TH + " text-center"}>{t("Status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {terConfigs.length === 0
                        ? <EmptyData label={t("Belum ada data TER")} />
                        : terConfigs.map(config => (
                          <tr key={config.id} className="hover:bg-gray-50 transition-colors">
                            <td className={TD}>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                config.tax_category === "TER_A" ? "bg-blue-50 text-blue-700" :
                                config.tax_category === "TER_B" ? "bg-indigo-50 text-indigo-700" :
                                "bg-purple-50 text-purple-700"
                              }`}>
                                {config.tax_category}
                              </span>
                            </td>
                            <td className={TD + " text-right text-gray-700"}>{formatCurrency(config.min_income)}</td>
                            <td className={TD + " text-right text-gray-700"}>{config.max_income ? formatCurrency(config.max_income) : <span className="text-gray-400 italic text-xs">{t("Tidak terbatas")}</span>}</td>
                            <td className={TD + " text-right font-semibold text-gray-900"}>{formatPercent(config.tax_rate)}</td>
                            <td className={TD + " text-center"}>
                              {config.is_active
                                ? <CheckCircle className="w-4 h-4 text-emerald-500 inline" />
                                : <XCircle className="w-4 h-4 text-red-400 inline" />
                              }
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table></div>
                <Pagination page={terPage} totalPages={terTotalPages} onChange={setTerPage} />
              </div>
            )}

            {/* Brackets Tab */}
            {activeTab === 'brackets' && (
              <div>
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900">{t("Tarif Progresif PPh 21")}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{t("Layer pajak penghasilan berdasarkan PKP tahunan")}</p>
                </div>

                <div  className="ph-table-scroll overflow-x-auto rounded-md border border-gray-100"><table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className={TH}>{t("Layer")}</th>
                        <th className={TH + " text-right"}>{t("Min. PKP")}</th>
                        <th className={TH + " text-right"}>{t("Max. PKP")}</th>
                        <th className={TH + " text-right"}>{t("Tarif")}</th>
                        <th className={TH + " text-center"}>{t("Status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {taxBrackets.length === 0
                        ? <EmptyData label={t("Belum ada data tarif progresif")} />
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
                            <td className={TD + " text-right text-gray-700"}>{formatCurrency(bracket.min_income)}</td>
                            <td className={TD + " text-right text-gray-700"}>{bracket.max_income ? formatCurrency(bracket.max_income) : <span className="text-gray-400 italic text-xs">{t("Tidak terbatas")}</span>}</td>
                            <td className={TD + " text-right"}>
                              <span className="text-sm font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
                                {formatPercent(bracket.rate)}
                              </span>
                            </td>
                            <td className={TD + " text-center"}>
                              {bracket.is_active
                                ? <CheckCircle className="w-4 h-4 text-emerald-500 inline" />
                                : <XCircle className="w-4 h-4 text-red-400 inline" />
                              }
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table></div>
                <Pagination page={bracketsPage} totalPages={bracketsTotalPages} onChange={setBracketsPage} />

                {taxBrackets.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <p className="text-xs font-semibold text-gray-400 mb-2">{t("Ringkasan Layer")}</p>
                    <div className="flex flex-wrap gap-2">
                      {['5%', '15%', '25%', '30%', '35%'].map((rate, i) => (
                        <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">{t("Layer")} {i + 1}: <span className="font-semibold text-purple-700">{rate}</span>
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
                  <h3 className="font-semibold text-gray-900">{t("Penghasilan Tidak Kena Pajak (PTKP)")}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{t("Nilai PTKP per tahun berdasarkan status perkawinan dan tanggungan")}</p>
                </div>

                {ptkpList.length === 0 ? (
                  <div className="text-center py-10 text-sm text-gray-400 bg-gray-50 rounded-md">{t("Belum ada data PTKP — klik")} <span className="font-medium text-slate-600">{t("\"Seed Data Pajak\"")}</span>{' '}{t("untuk menginisialisasi")} </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ptkpList.map(ptkp => (
                      <div key={ptkp.id} className={`p-4 rounded-xl border transition-all ${
                        ptkp.is_active ? "bg-white border-gray-200 hover:border-emerald-200" : "bg-gray-50 border-gray-100 opacity-60"
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
                        <p className="text-xs text-gray-400 mt-0.5">{t("per tahun")}</p>
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
                      <div key={group.title} className="p-4 bg-gray-50 rounded-md">
                        <p className="text-xs font-semibold text-gray-500 mb-2">{t(group.title)}</p>
                        <div className="space-y-1">
                          {group.items.map(item => (
                            <p key={item} className="text-xs text-gray-600">{t(item)}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}</ReportSection>{confirmationDialog}</ReportPage>
  );
}

import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Settings,
  Users,
  Clock,
  CalendarDays,
  Wallet,
  Target,
  CheckCircle,
  XCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, Badge } from '@/components/ui';
import { companyService, type CompanyWithFeatures } from '@/services/company.service';

interface FeatureToggleProps {
  enabled: boolean;
  isLoading: boolean;
  onToggle: () => void;
  label: string;
  icon: React.ReactNode;
}

function FeatureToggle({ enabled, isLoading, onToggle, label, icon }: FeatureToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={isLoading}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
        enabled
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
      ) : enabled ? (
        <ToggleRight className="h-5 w-5 ml-auto" />
      ) : (
        <ToggleLeft className="h-5 w-5 ml-auto" />
      )}
    </button>
  );
}

export function CompanyFeaturesPage() {
  const [companies, setCompanies] = useState<CompanyWithFeatures[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const data = await companyService.getFeatureTogglesList();
      setCompanies(data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast.error('Gagal memuat data perusahaan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (
    companyId: number,
    feature: 'attendance_enabled' | 'leave_enabled' | 'payroll_enabled' | 'performance_enabled'
  ) => {
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;

    const key = `${companyId}-${feature}`;
    if (updatingIds.has(key)) return;

    setUpdatingIds((prev) => new Set(prev).add(key));

    try {
      const newValue = !company[feature];
      await companyService.updateFeatureToggles(companyId, { [feature]: newValue });

      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, [feature]: newValue } : c))
      );

      const featureNames: Record<string, string> = {
        attendance_enabled: 'Attendance',
        leave_enabled: 'Leave',
        payroll_enabled: 'Payroll',
        performance_enabled: 'Performance',
      };
      toast.success(`${featureNames[feature]} ${newValue ? 'diaktifkan' : 'dinonaktifkan'} untuk ${company.name}`);
    } catch (error: any) {
      console.error('Failed to update feature toggle:', error);
      toast.error(error.response?.data?.error || 'Gagal mengubah pengaturan fitur');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      company.code.toLowerCase().includes(search.toLowerCase())
  );

  const getCompanyTypeColor = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case 'holding':
        return 'bg-purple-100 text-purple-700';
      case 'subsidiary':
        return 'bg-blue-100 text-blue-700';
      case 'branch':
        return 'bg-cyan-100 text-cyan-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Stats
  const attendanceEnabled = companies.filter((c) => c.attendance_enabled).length;
  const leaveEnabled = companies.filter((c) => c.leave_enabled).length;
  const payrollEnabled = companies.filter((c) => c.payroll_enabled).length;
  const performanceEnabled = companies.filter((c) => c.performance_enabled).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 backdrop-blur-xl rounded-xl">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Company Feature Settings
                </h1>
              </div>
              <p className="text-purple-100 max-w-xl">
                Kelola fitur mana yang aktif untuk setiap perusahaan. Fitur yang dinonaktifkan tidak akan muncul di menu karyawan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Attendance Active</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {attendanceEnabled}/{companies.length}
                </p>
              </div>
              <Clock className="h-10 w-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Leave Active</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {leaveEnabled}/{companies.length}
                </p>
              </div>
              <CalendarDays className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-orange-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Payroll Active</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {payrollEnabled}/{companies.length}
                </p>
              </div>
              <Wallet className="h-10 w-10 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-pink-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Performance Active</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {performanceEnabled}/{companies.length}
                </p>
              </div>
              <Target className="h-10 w-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari perusahaan berdasarkan nama atau kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-800 font-medium">Catatan Penting</p>
          <p className="text-sm text-amber-700 mt-1">
            Mengnonaktifkan fitur akan menyembunyikan menu terkait dari karyawan perusahaan tersebut.
            Data yang sudah ada tetap tersimpan dan dapat diakses kembali saat fitur diaktifkan.
          </p>
        </div>
      </div>

      {/* Companies Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
            <p className="text-gray-500">Memuat data perusahaan...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="border-0 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Company Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <Building2 className="h-7 w-7 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-gray-500">{company.code}</span>
                        {company.company_type && (
                          <Badge className={getCompanyTypeColor(company.company_type)}>
                            {company.company_type}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="h-3 w-3" />
                          <span>{company._count?.employees || 0} karyawan</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature Toggles */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:flex-shrink-0">
                    <FeatureToggle
                      enabled={company.attendance_enabled}
                      isLoading={updatingIds.has(`${company.id}-attendance_enabled`)}
                      onToggle={() => handleToggle(company.id, 'attendance_enabled')}
                      label="Attendance"
                      icon={<Clock className="h-4 w-4" />}
                    />
                    <FeatureToggle
                      enabled={company.leave_enabled}
                      isLoading={updatingIds.has(`${company.id}-leave_enabled`)}
                      onToggle={() => handleToggle(company.id, 'leave_enabled')}
                      label="Leave"
                      icon={<CalendarDays className="h-4 w-4" />}
                    />
                    <FeatureToggle
                      enabled={company.payroll_enabled}
                      isLoading={updatingIds.has(`${company.id}-payroll_enabled`)}
                      onToggle={() => handleToggle(company.id, 'payroll_enabled')}
                      label="Payroll"
                      icon={<Wallet className="h-4 w-4" />}
                    />
                    <FeatureToggle
                      enabled={company.performance_enabled}
                      isLoading={updatingIds.has(`${company.id}-performance_enabled`)}
                      onToggle={() => handleToggle(company.id, 'performance_enabled')}
                      label="Performance"
                      icon={<Target className="h-4 w-4" />}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredCompanies.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Tidak ada perusahaan ditemukan</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

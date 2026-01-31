import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  Building2,
  TrendingUp,
  Calendar,
  ArrowRight,
  RefreshCw,
  Crown,
  FileCheck,
  FileX,
  FileClock
} from 'lucide-react';
import { contractService, type GroupContractStatistics } from '@/services/contract.service';
import { useAuthStore } from '@/stores/auth.store';

// Format number helper
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('id-ID').format(num);
};

// Format date helper
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Days until expiry helper
const daysUntil = (dateStr: string): number => {
  const today = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export function GroupContractsPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<GroupContractStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await contractService.getGroupStatistics();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-gray-600">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, by_company, expiring_contracts, recent_contracts } = data;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="contract-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#contract-grid)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                <Crown className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Contract Overview
                </h1>
                <p className="text-amber-100 text-sm mt-1">
                  Executive view - All companies contract management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/20">
                <Building2 className="h-4 w-4" />
                {by_company.length} Companies
              </span>
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/20 hover:bg-white/30 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-500">TOTAL</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.total_contracts)}</p>
          <p className="text-xs text-gray-500">All Contracts</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <FileCheck className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-green-600">ACTIVE</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.active_contracts)}</p>
          <p className="text-xs text-gray-500">Active Contracts</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <FileClock className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-amber-600">EXPIRING</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.expiring_30_days)}</p>
          <p className="text-xs text-gray-500">Within 30 Days</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
              <FileX className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-red-600">EXPIRED</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.expired_contracts)}</p>
          <p className="text-xs text-gray-500">Expired Contracts</p>
        </div>
      </div>

      {/* Contract Type Distribution */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Permanent (PKWTT)</span>
            <span className="text-xs text-gray-400">
              {summary.total_contracts > 0
                ? Math.round((summary.by_type.permanent / summary.total_contracts) * 100)
                : 0}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.by_type.permanent)}</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
              style={{ width: `${summary.total_contracts > 0 ? (summary.by_type.permanent / summary.total_contracts) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Contract (PKWT)</span>
            <span className="text-xs text-gray-400">
              {summary.total_contracts > 0
                ? Math.round((summary.by_type.contract / summary.total_contracts) * 100)
                : 0}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.by_type.contract)}</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
              style={{ width: `${summary.total_contracts > 0 ? (summary.by_type.contract / summary.total_contracts) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Probation</span>
            <span className="text-xs text-gray-400">
              {summary.total_contracts > 0
                ? Math.round((summary.by_type.probation / summary.total_contracts) * 100)
                : 0}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.by_type.probation)}</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"
              style={{ width: `${summary.total_contracts > 0 ? (summary.by_type.probation / summary.total_contracts) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expiring Alert */}
      {summary.expiring_30_days > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Contracts Expiring Soon</h3>
              <p className="text-sm text-amber-700 mt-1">
                {summary.expiring_30_days} contracts expiring within 30 days, {summary.expiring_60_days} within 60 days, {summary.expiring_90_days} within 90 days.
              </p>
            </div>
            <Link
              to="/contracts"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium flex items-center gap-2"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Company Overview Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Contract Overview by Company</h3>
            <p className="text-xs text-gray-500 mt-1">Contract distribution across all subsidiaries</p>
          </div>
          <Link to="/contracts" className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
            Manage Contracts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Active</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Expiring (30d)</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Permanent</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Contract</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Probation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {by_company.map((company) => (
                <tr key={company.company_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {company.company_name.split(' ')[1]?.[0] || company.company_name[0]}
                      </div>
                      <p className="font-semibold text-gray-900">{company.company_name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-gray-900">{company.total}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
                      {company.active}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {company.expiring_30_days > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">
                        {company.expiring_30_days}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-600">{company.by_type.permanent}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-600">{company.by_type.contract}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-600">{company.by_type.probation}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid: Expiring Contracts & Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Expiring Contracts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Expiring Soon</h3>
              <p className="text-xs text-gray-500 mt-1">Contracts expiring within 30 days</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
              {expiring_contracts.length}
            </span>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {expiring_contracts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
                No contracts expiring within 30 days
              </div>
            ) : (
              expiring_contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      daysUntil(contract.end_date!) <= 7 ? 'bg-red-100' :
                      daysUntil(contract.end_date!) <= 14 ? 'bg-amber-100' :
                      'bg-yellow-100'
                    }`}>
                      <Clock className={`h-5 w-5 ${
                        daysUntil(contract.end_date!) <= 7 ? 'text-red-600' :
                        daysUntil(contract.end_date!) <= 14 ? 'text-amber-600' :
                        'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{contract.employee.name}</p>
                      <p className="text-xs text-gray-500">
                        {contract.employee.company?.name} • {contract.contract_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      daysUntil(contract.end_date!) <= 7 ? 'text-red-600' :
                      daysUntil(contract.end_date!) <= 14 ? 'text-amber-600' :
                      'text-yellow-600'
                    }`}>
                      {daysUntil(contract.end_date!)} days
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(contract.end_date!)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Contracts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Contracts</h3>
              <p className="text-xs text-gray-500 mt-1">Latest contract activities</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {recent_contracts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No recent contracts</div>
            ) : (
              recent_contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      contract.status === 'active' ? 'bg-green-100' :
                      contract.status === 'expired' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      <FileText className={`h-5 w-5 ${
                        contract.status === 'active' ? 'text-green-600' :
                        contract.status === 'expired' ? 'text-red-600' :
                        'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{contract.employee.name}</p>
                      <p className="text-xs text-gray-500">
                        {contract.employee.company?.name} • {contract.contract_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      contract.status === 'active' ? 'bg-green-100 text-green-700' :
                      contract.status === 'expired' ? 'bg-red-100 text-red-700' :
                      contract.status === 'terminated' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {contract.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(contract.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

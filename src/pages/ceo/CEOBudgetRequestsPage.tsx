import { insightEnum, insightNumber, insightFixed } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useState } from 'react';
import { Wallet, User, Building2, DollarSign, Search } from 'lucide-react';
import { PreviewBanner } from '@/components/ui';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

// Mock budget request data
const mockBudgetRequests = [
  {
    id: 1,
    title: 'Q1 Marketing Campaign',
    department: 'Marketing',
    company: 'PT Company A',
    requester: 'Jane Smith',
    amount: 500000000,
    status: 'pending',
    category: 'Marketing',
    submittedDate: '2024-01-15',
    description: 'Digital marketing campaign for new product launch',
  },
  {
    id: 2,
    title: 'IT Infrastructure Upgrade',
    department: 'IT',
    company: 'PT Company A',
    requester: 'Bob Wilson',
    amount: 750000000,
    status: 'pending',
    category: 'Technology',
    submittedDate: '2024-01-14',
    description: 'Server and network infrastructure upgrade',
  },
  {
    id: 3,
    title: 'Employee Training Program',
    department: 'HR',
    company: 'PT Company B',
    requester: 'Sarah Johnson',
    amount: 200000000,
    status: 'approved',
    category: 'HR',
    submittedDate: '2024-01-10',
    description: 'Leadership and technical skills training',
  },
  {
    id: 4,
    title: 'Office Renovation',
    department: 'Operations',
    company: 'PT Company C',
    requester: 'Mike Brown',
    amount: 1000000000,
    status: 'pending',
    category: 'Facilities',
    submittedDate: '2024-01-08',
    description: 'Workspace modernization project',
  },
  {
    id: 5,
    title: 'Sales Conference',
    department: 'Sales',
    company: 'PT Company A',
    requester: 'Tom Davis',
    amount: 150000000,
    status: 'rejected',
    category: 'Sales',
    submittedDate: '2024-01-05',
    description: 'Annual sales team conference and awards',
  },
];

const categoryColors: Record<string, string> = {
  Marketing: '#6366f1',
  Technology: '#8b5cf6',
  HR: '#10b981',
  Facilities: '#f59e0b',
  Sales: '#ec4899',
};

export function CEOBudgetRequestsPage() {
  useLocale();
  const [filter, setFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRequests = mockBudgetRequests
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.company.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `Rp ${insightFixed((value / 1000000000), 1)}${t('billion short')}`;
    }
    if (value >= 1000000) {
      return `Rp ${insightFixed((value / 1000000), 0)}${t('million short')}`;
    }
    return formatCurrency(value);
  };

  // Calculate stats
  const pendingRequests = mockBudgetRequests.filter(r => r.status === 'pending');
  const totalPendingAmount = pendingRequests.reduce((sum, r) => sum + r.amount, 0);
  const totalApprovedAmount = mockBudgetRequests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + r.amount, 0);

  // Budget by category for pie chart
  const budgetByCategory = Object.entries(
    mockBudgetRequests.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + r.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name,
    value,
    color: categoryColors[name] || '#9ca3af',
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <ReportPage><PreviewBanner message={t("Budget requests belum terintegrasi dengan workflow real. Data adalah contoh untuk preview UI.")} />{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Budget Requests")}</h1><p className="text-xs md:text-sm mt-1">{t("Review and approve budget allocations")}</p></div>
<div className="report-header-context"><div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border">
                <DollarSign className="h-4 w-4" />
                {formatCompactCurrency(totalPendingAmount)}{' '}{t("Pending")} </span>
            </div></div>
</ReportHeader>{/* Stats Row */}<ReportSummary><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(pendingRequests.length)}</p><p className="report-metric-label">{t("Pending Requests")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{formatCompactCurrency(totalPendingAmount)}</p><p className="report-metric-label">{t("Pending Amount")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{formatCompactCurrency(totalApprovedAmount)}</p><p className="report-metric-label">{t("Approved YTD")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(budgetByCategory.length)}</p><p className="report-metric-label">{t("Categories")}</p></div></ReportSummary>{/* Budget by Category Chart */}<div className="report-budget-layout">
        <ReportSection><h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">{t("Budget by Category")}</h3><div className="h-48">
            {budgetByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={budgetByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {budgetByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCompactCurrency(value) : ''} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">{t("No data available")} </div>
            )}
          </div><div className="mt-4 space-y-2">
            {budgetByCategory.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900">{formatCompactCurrency(item.value)}</span>
              </div>
            ))}
          </div></ReportSection>

        {/* Search and Filter */}
        <div className="report-budget-records space-y-4">
          <div className="report-filters">
            <div className="relative flex-1 report-search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t("Search budget requests...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div  className="ph-table-scroll flex items-center gap-2 overflow-x-auto pb-1">{['pending', 'approved', 'rejected', 'all'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    filter === status
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {insightEnum(status)}
                </button>
              ))}</div>
          </div>

          {/* Requests List */}
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <ReportSection key={request.id}><div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${categoryColors[request.category]}15` }}
                  >
                    <Wallet className="h-6 w-6" style={{ color: categoryColors[request.category] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{request.title}</h3>
                      <span className="text-lg font-bold text-indigo-600">{formatCompactCurrency(request.amount)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        {request.requester}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-4 w-4" />
                        {request.company}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${getStatusColor(request.status)}`}>
                        {insightEnum(request.status)}
                      </span>
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button disabled title={t("Belum tersedia — preview UI")} className="ph-button ph-button-primary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">{t("Approve")} </button>
                      <button disabled title={t("Belum tersedia — preview UI")} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors">{t("Reject")} </button>
                    </div>
                  )}
                </div></ReportSection>
            ))}
          </div>

          {filteredRequests.length === 0 && (
            <ReportSection><Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 mb-2">{t("No requests found")}</h3><p className="text-gray-500">{t("Try changing the filter or search criteria.")}</p></ReportSection>
          )}
        </div>
      </div></ReportPage>
  );
}

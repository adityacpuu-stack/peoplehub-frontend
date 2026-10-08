import { insightTenure, insightNumber } from '@/pages/ceo/insight-display';
import { t, useLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useState, useEffect } from 'react';
import { Users, Building2, Mail, Phone, Calendar, Search, AlertCircle, Briefcase } from 'lucide-react';
import { employeeService, type LeadershipMember } from '@/services/employee.service';
import { useAuthStore } from '@/stores/auth.store';
import { PageSpinner } from '@/components/ui';

export function CEOLeadershipTeamPage() {
  useLocale();
  const { user } = useAuthStore();
  const [leaders, setLeaders] = useState<LeadershipMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get CEO's company
  const companyId = user?.employee?.company_id;
  const companyName = (user?.employee as { company_name?: string } | undefined)?.company_name;

  useEffect(() => {
    const fetchLeaders = async () => {
      if (!companyId) {
        setError('Company not found');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        // Fetch leadership team filtered by CEO's company
        const data = await employeeService.getLeadershipTeam(companyId);
        setLeaders(data);
      } catch (err: any) {
        console.error('Failed to fetch leadership team:', err);
        setError('Failed to load leadership team');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaders();
  }, [companyId]);

  if (isLoading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("Failed to load leadership team")}</h3>
          <p className="text-gray-600 mb-4">{t(error)}</p>
          <button onClick={() => window.location.reload()} className="ph-button ph-button-primary px-4 py-2 rounded-lg">{t("Retry")} </button>
        </div>
      </div>
    );
  }

  const filteredLeaders = leaders.filter(
    (leader) =>
      leader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leader.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leader.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leader.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ReportPage>{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Leadership Team")}</h1><p className="text-xs md:text-sm mt-1">
                  {companyName ? t('Karyawan dengan bawahan langsung di {company}', { company: companyName }) : t("Employees with direct reports")}
                </p></div>
<div className="report-header-context"><div className="flex items-center gap-3">
              {companyName && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-indigo-400/20">
                  <Building2 className="h-4 w-4" />
                  {companyName}
                </span>
              )}
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border">
                <Users className="h-4 w-4" />
                {insightNumber(leaders.length)}{' '}{t("Leaders")} </span>
            </div></div>
</ReportHeader>{/* Search */}<div className="relative report-search">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t("Search by name, position, department, or company...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>{/* Leaders Grid */}<div className="executive-directory">
        {filteredLeaders.map((leader) => (
          <ReportSection key={leader.id}><div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-md flex items-center justify-center font-bold text-lg report-avatar">
                {leader.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{leader.name}</h3>
                <p className="text-sm text-indigo-600 font-medium truncate">{leader.position}</p>
              </div>
            </div><div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{leader.company}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{leader.department}</span>
              </div>
              {leader.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{leader.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>{t("Tenure:")} {insightTenure(leader.tenure)}</span>
              </div>
            </div><div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{insightNumber(leader.direct_reports)}{' '}{t("direct reports")}</span>
              </div>
              {leader.phone && (
                <a
                  href={`tel:${leader.phone}`}
                  aria-label={t('Call {name}', { name: leader.name })}
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div></ReportSection>
        ))}
      </div>{filteredLeaders.length === 0 && (
        <ReportSection><Users className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 mb-2">{t("No leaders found")}</h3><p className="text-gray-500">
            {searchQuery
              ? t("Try adjusting your search criteria.")
              : t("No employees with direct reports found.")}
          </p></ReportSection>
      )}</ReportPage>
  );
}

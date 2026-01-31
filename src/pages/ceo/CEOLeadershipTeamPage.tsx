import { useState, useEffect } from 'react';
import {
  Users,
  Crown,
  Building2,
  Mail,
  Phone,
  Calendar,
  Search,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import { employeeService, type LeadershipMember } from '@/services/employee.service';
import { useAuthStore } from '@/stores/auth.store';
import { PageSpinner } from '@/components/ui';

export function CEOLeadershipTeamPage() {
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
        setError(err.message || 'Failed to load leadership team');
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load leadership team</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="leadership-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#leadership-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Crown className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Leadership Team</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">
                  {companyName ? `Karyawan dengan bawahan langsung di ${companyName}` : 'Employees with direct reports'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {companyName && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 backdrop-blur-xl rounded-xl text-sm text-indigo-200 font-medium border border-indigo-400/20">
                  <Building2 className="h-4 w-4" />
                  {companyName}
                </span>
              )}
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10">
                <Users className="h-4 w-4" />
                {leaders.length} Leaders
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, position, department, or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Leaders Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLeaders.map((leader) => (
          <div
            key={leader.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
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
            </div>

            <div className="space-y-2 mb-4">
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
                <span>Tenure: {leader.tenure}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{leader.direct_reports} direct reports</span>
              </div>
              {leader.phone && (
                <a
                  href={`tel:${leader.phone}`}
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredLeaders.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No leaders found</h3>
          <p className="text-gray-500">
            {searchQuery
              ? 'Try adjusting your search criteria.'
              : 'No employees with direct reports found.'}
          </p>
        </div>
      )}
    </div>
  );
}

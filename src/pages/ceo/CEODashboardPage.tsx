import { useEffect, useState } from 'react';
import { PageSpinner } from '@/components/ui';
import { dashboardService, type GroupDashboard } from '@/services/dashboard.service';
import { useAuthStore } from '@/stores/auth.store';
import { ExecutiveOverview } from './ExecutiveOverview';

export function CEODashboardPage() {
  const user = useAuthStore(state => state.user);
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  // Preserve the existing request scope; the backend enforces assigned companies.
  const companyId = user?.roles?.some(role => ['Group CEO', 'Super Admin'].includes(role))
    ? undefined : user?.employee?.company_id || undefined;
  useEffect(() => {
    let cancelled = false;
    const fetchData = () => {
    setLoading(true);
    setFailed(false);
    dashboardService.getGroupOverview(companyId).then(result => {
      if (!cancelled) setData(result);
    }).catch(() => {
      if (!cancelled) { setData(null); setFailed(true); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    };
    fetchData();
    return () => { cancelled = true; };
  }, [companyId, user?.id, retry]);
  if (loading) return <PageSpinner />;
  return <ExecutiveOverview user={user} data={data} failed={failed} onRetry={() => setRetry(value => value + 1)} />;
}

import { insightNumber, insightFixed } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/employees/operations-workflows.css';
import '@/pages/ceo/executive-workspace.css';
import { Modal } from '@/components/ui/Modal';
import { useEffect, useState } from 'react';
import { companyService, type Company } from '@/services/company.service';
import { performanceService, type PerformanceReview } from '@/services/performance.service';
import toast from 'react-hot-toast';

type ReviewStatus = 'draft' | 'pending_review' | 'in_progress' | 'completed';
type RatingLevel = 1 | 2 | 3 | 4 | 5;

export function PerformancePage() {
  useLocale();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingReview, setViewingReview] = useState<PerformanceReview | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchReviews();
    }
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      const companyList = await companyService.getCompanies();
      setCompanies(companyList);
      if (companyList.length > 0) {
        setSelectedCompanyId(companyList[0].id);
      }
    } catch {
      toast.error(t("Gagal memuat data company"));
    }
  };

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const query: Record<string, any> = { limit: 50 };
      if (selectedCompanyId) query.company_id = selectedCompanyId;
      if (filterStatus !== 'all') query.status = filterStatus;
      const result = await performanceService.listReviews(query);
      setReviews(result.data || []);
      setTotalReviews(result.pagination?.total || 0);
    } catch {
      toast.error(t("Gagal memuat data performance review"));
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompanyId) {
      fetchReviews();
    }
  }, [filterStatus]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const filteredReviews = reviews.filter(review => {
    if (!search) return true;
    const name = review.employee?.name || '';
    const empId = review.employee?.employee_id || '';
    return name.toLowerCase().includes(search.toLowerCase()) ||
      empId.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: totalReviews || reviews.length,
    completed: reviews.filter(r => r.status === 'completed').length,
    inProgress: reviews.filter(r => r.status === 'in_progress' || r.status === 'pending_review').length,
    avgRating: reviews.filter(r => r.status === 'completed' && r.overall_rating).length > 0
      ? (reviews.filter(r => r.status === 'completed' && r.overall_rating).reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.filter(r => r.status === 'completed' && r.overall_rating).length).toFixed(1)
      : '0.0',
  };

  const openDetailModal = (review: PerformanceReview) => {
    setViewingReview(review);
    setShowDetailModal(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(intlLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', get label() { return t('Draft'); } },
      pending_review: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', get label() { return t('Pending Review'); } },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', get label() { return t('In Progress'); } },
      completed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', get label() { return t('Completed'); } },
    };
    const style = styles[status] || styles.draft;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {style.label}
      </span>
    );
  };

  const getRatingStars = (rating: number | null) => {
    if (!rating) return <span className="text-sm text-gray-400">-</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-amber-400' : 'text-gray-200'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1.5 text-sm font-medium text-gray-600">({insightNumber(rating)}/5)</span>
      </div>
    );
  };

  const getRatingBadge = (rating: number | null) => {
    if (!rating) return null;
    const colors: Record<number, string> = {
      1: 'bg-red-100 text-red-700',
      2: 'bg-orange-100 text-orange-700',
      3: 'bg-amber-100 text-amber-700',
      4: 'bg-green-100 text-green-700',
      5: 'bg-emerald-100 text-emerald-700',
    };
    const labels: Record<number, string> = {
      1: 'Needs Improvement',
      2: 'Below Expectations',
      3: 'Meets Expectations',
      4: 'Exceeds Expectations',
      5: 'Outstanding',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[rating] || 'bg-gray-100 text-gray-700'}`}>
        {labels[rating] ? t(labels[rating]) : t('Rating {rating}', { rating: insightNumber(rating) })}
      </span>
    );
  };

  const getScoreBar = (score: number | null, label: string) => {
    if (score == null) return null;
    const getColor = () => {
      if (score >= 80) return 'bg-green-500';
      if (score >= 60) return 'bg-amber-500';
      return 'bg-red-500';
    };

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t(label)}</span>
          <span className="font-semibold text-gray-900">{insightNumber(score)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getColor()} rounded-full transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="ph-workflow ops-workflow ops-page executive-performance">
      {/* Header Banner */}
      <header className="ph-page-header ops-page-heading"><div>
                  <h1 className="ops-page-title">{t("Performance")} </h1>
                  <p className="text-gray-500 text-sm mt-1">
                    {selectedCompany ? (
                      <>{t("Kelola performance review")} <span className="font-semibold">{selectedCompany.name}</span></>
                    ) : (
                      t('Pilih company untuk memulai')
                    )}
                  </p>
                </div><div className="ph-actions"><label className="ph-field">{t("Company")}<select value={selectedCompanyId || ''} onChange={(e) => setSelectedCompanyId(Number(e.target.value))}>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label></div></header>

      {/* Stats Cards */}
      <div className="ops-stat-line">
        <div className="relative overflow-hidden transition-shadow ops-quiet-surface">
          <div className="flex items-center justify-between mb-4">
            <div className="ops-avatar">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{insightNumber(stats.total)}</p>
          <p className="text-sm text-gray-500">{t("Total Reviews")}</p>
        </div>

        <div className="relative overflow-hidden transition-shadow ops-quiet-surface">
          <div className="flex items-center justify-between mb-4">
            <div className="ops-avatar">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">{t("Done")} </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{insightNumber(stats.completed)}</p>
          <p className="text-sm text-gray-500">{t("Completed")}</p>
        </div>

        <div className="relative overflow-hidden transition-shadow ops-quiet-surface">
          <div className="flex items-center justify-between mb-4">
            <div className="ops-avatar">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">{t("Active")} </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{insightNumber(stats.inProgress)}</p>
          <p className="text-sm text-gray-500">{t("In Progress")}</p>
        </div>

        <div className="relative overflow-hidden transition-shadow ops-quiet-surface">
          <div className="flex items-center justify-between mb-4">
            <div className="ops-avatar">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg">{t("Avg")} </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{insightFixed(Number(stats.avgRating), 1)}</p>
          <p className="text-sm text-gray-500">{t("Avg Rating")}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="ph-section ops-section">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder={t("Cari karyawan...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              <option value="all">{t("Semua Status")}</option>
              <option value="draft">{t("Draft")}</option>
              <option value="pending_review">{t("Pending Review")}</option>
              <option value="in_progress">{t("In Progress")}</option>
              <option value="completed">{t("Completed")}</option>
            </select>
            <span className="text-sm text-gray-500">
              {insightNumber(filteredReviews.length)}{' '}{t("reviews")} </span>
          </div>
        </div>

        {/* Table */}
        <div className="ph-table-scroll">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">

                <p className="text-gray-500">{t("Memuat data...")}</p>
              </div>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t("Belum ada review")}</h3>
              <p className="mt-1 text-gray-500">{t("Belum ada data performance review untuk company ini.")}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Karyawan")}</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Periode")}</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Rating")}</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Goals")}</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Reviewer")}</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Status")}</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Aksi")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReviews.map(review => {
                  const empName = review.employee?.name || t('Unknown');
                  const empId = review.employee?.employee_id || '-';
                  const position = review.employee?.position?.name || '-';
                  const reviewerName = review.reviewer?.name || '-';
                  return (
                    <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="ops-avatar">
                            {empName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{empName}</p>
                            <p className="text-xs text-gray-500">{empId} {position !== '-' ? `\u2022 ${position}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-violet-50 text-violet-700 text-sm font-medium rounded-lg">
                          {review.period || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {getRatingStars(review.overall_rating)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {review.goals_achievement != null ? (
                          <span className={`font-semibold ${(review.goals_achievement || 0) >= 80 ? 'text-green-600' : (review.goals_achievement || 0) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                            {insightNumber(review.goals_achievement)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700">{reviewerName}</p>
                        {review.review_date && (
                          <p className="text-xs text-gray-500">{formatDate(review.review_date)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(review.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openDetailModal(review)}
                            className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            title={t("Detail")}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && viewingReview && (
        <Modal isOpen={true} onClose={() => setShowDetailModal(false)} title={t("Detail Performance Review")} size="xl" busy={false} className="ph-workflow ops-workflow ops-modal executive-dialog">


              <div className="ops-dialog-content space-y-5">
                {/* Employee Info */}
                <div className="flex items-center gap-4">
                  <div className="ops-avatar">
                    {(viewingReview.employee?.name || 'U').charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{viewingReview.employee?.name || t('Unknown')}</p>
                    <p className="text-sm text-gray-500">{viewingReview.employee?.employee_id || '-'} {viewingReview.employee?.position?.name ? `\u2022 ${viewingReview.employee.position.name}` : ''}</p>
                    {viewingReview.employee?.department?.name && (
                      <p className="text-sm text-gray-500">{viewingReview.employee.department.name}</p>
                    )}
                  </div>
                </div>

                {/* Period & Status */}
                <div className="ops-record-block">
                  <div>
                    <p className="text-xs text-violet-600 font-medium">{t("Periode Review")}</p>
                    <p className="font-bold text-violet-900 text-lg">{viewingReview.period || '-'}</p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(viewingReview.status)}
                    {viewingReview.review_date && (
                      <p className="text-xs text-gray-500 mt-1">{formatDate(viewingReview.review_date)}</p>
                    )}
                  </div>
                </div>

                {/* Overall Rating */}
                {viewingReview.overall_rating && (
                  <div className="ops-record-block">
                    <p className="text-xs text-gray-500 mb-2">{t("Overall Rating")}</p>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getRatingStars(viewingReview.overall_rating)}
                    </div>
                    {getRatingBadge(viewingReview.overall_rating)}
                  </div>
                )}

                {/* Scores */}
                <div className="space-y-4">
                  {getScoreBar(viewingReview.goals_achievement, 'Goals Achievement')}
                  {getScoreBar(viewingReview.competency_score, 'Competency Score')}
                </div>

                {/* Reviewer */}
                {viewingReview.reviewer && (
                  <div className="ops-record-block">
                    <p className="text-xs text-gray-500 mb-1">{t("Reviewer")}</p>
                    <p className="font-semibold text-gray-900">{viewingReview.reviewer.name}</p>
                  </div>
                )}

                {viewingReview.comments && (
                  <div className="ops-record-block">
                    <p className="text-xs text-gray-500 mb-1">{t("Comments")}</p>
                    <p className="text-gray-700">{viewingReview.comments}</p>
                  </div>
                )}

                <div className="ph-dialog-footer">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="ph-button"
                  >{t("Tutup")} </button>
                </div>
              </div>
            </Modal>
      )}
    </div>
  );
}

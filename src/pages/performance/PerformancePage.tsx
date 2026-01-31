import { useEffect, useState } from 'react';
import type { Company } from '@/services/company.service';
import toast from 'react-hot-toast';

type ReviewStatus = 'draft' | 'pending_review' | 'in_progress' | 'completed';
type RatingLevel = 1 | 2 | 3 | 4 | 5;

interface PerformanceReview {
  id: number;
  company_id: number;
  employee: {
    id: number;
    name: string;
    employee_id: string;
    department: string;
    position: string;
  };
  reviewer: {
    id: number;
    name: string;
  };
  period: string;
  review_date: string;
  overall_rating: RatingLevel;
  status: ReviewStatus;
  goals_achievement: number;
  competency_score: number;
  comments: string | null;
  created_at: string;
}

export function PerformancePage() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null);
  const [viewingReview, setViewingReview] = useState<PerformanceReview | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | 'all'>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [formData, setFormData] = useState({
    employee_id: '',
    reviewer_id: '',
    period: '',
    review_date: '',
    overall_rating: 3 as RatingLevel,
    goals_achievement: '',
    competency_score: '',
    status: 'draft' as ReviewStatus,
    comments: '',
  });

  // Mock companies
  const mockCompanies: Company[] = [
    { id: 1, name: 'PT Maju Bersama', code: 'MB', type: 'Holding', is_active: true, employee_count: 85, created_at: '2024-01-01' },
    { id: 2, name: 'PT Karya Digital', code: 'KD', type: 'Subsidiary', is_active: true, employee_count: 42, created_at: '2024-01-01' },
    { id: 3, name: 'PT Solusi Teknologi', code: 'ST', type: 'Subsidiary', is_active: true, employee_count: 29, created_at: '2024-01-01' },
  ];

  // Mock employees
  const mockEmployees = [
    { id: 1, name: 'John Doe', employee_id: 'EMP001' },
    { id: 2, name: 'Jane Smith', employee_id: 'EMP002' },
    { id: 3, name: 'Ahmad Wijaya', employee_id: 'EMP003' },
    { id: 4, name: 'Siti Rahayu', employee_id: 'EMP004' },
    { id: 5, name: 'Budi Santoso', employee_id: 'EMP005' },
  ];

  // Mock reviewers
  const mockReviewers = [
    { id: 10, name: 'Manager A' },
    { id: 11, name: 'Manager B' },
    { id: 12, name: 'Director C' },
  ];

  // Mock periods
  const periods = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'H1 2024', 'H2 2024', 'Annual 2024'];

  // Mock reviews
  const mockReviews: PerformanceReview[] = [
    { id: 1, company_id: 1, employee: { id: 1, name: 'John Doe', employee_id: 'EMP001', department: 'Engineering', position: 'Software Engineer' }, reviewer: { id: 10, name: 'Manager A' }, period: 'Q2 2024', review_date: '2024-07-15', overall_rating: 4, status: 'completed', goals_achievement: 85, competency_score: 80, comments: 'Excellent performance in project delivery', created_at: '2024-07-01' },
    { id: 2, company_id: 1, employee: { id: 2, name: 'Jane Smith', employee_id: 'EMP002', department: 'Human Resources', position: 'HR Officer' }, reviewer: { id: 11, name: 'Manager B' }, period: 'Q2 2024', review_date: '2024-07-20', overall_rating: 5, status: 'completed', goals_achievement: 95, competency_score: 92, comments: 'Outstanding contribution to HR initiatives', created_at: '2024-07-01' },
    { id: 3, company_id: 1, employee: { id: 3, name: 'Ahmad Wijaya', employee_id: 'EMP003', department: 'Finance', position: 'Accountant' }, reviewer: { id: 12, name: 'Director C' }, period: 'Q2 2024', review_date: '2024-07-18', overall_rating: 3, status: 'completed', goals_achievement: 70, competency_score: 75, comments: 'Meets expectations, room for improvement', created_at: '2024-07-01' },
    { id: 4, company_id: 1, employee: { id: 4, name: 'Siti Rahayu', employee_id: 'EMP004', department: 'Marketing', position: 'Marketing Specialist' }, reviewer: { id: 10, name: 'Manager A' }, period: 'Q3 2024', review_date: '2024-10-15', overall_rating: 4, status: 'pending_review', goals_achievement: 82, competency_score: 78, comments: null, created_at: '2024-10-01' },
    { id: 5, company_id: 1, employee: { id: 5, name: 'Budi Santoso', employee_id: 'EMP005', department: 'Operations', position: 'Operations Coordinator' }, reviewer: { id: 11, name: 'Manager B' }, period: 'Q3 2024', review_date: '2024-10-20', overall_rating: 3, status: 'in_progress', goals_achievement: 65, competency_score: 70, comments: null, created_at: '2024-10-01' },
    { id: 6, company_id: 1, employee: { id: 1, name: 'John Doe', employee_id: 'EMP001', department: 'Engineering', position: 'Software Engineer' }, reviewer: { id: 10, name: 'Manager A' }, period: 'Q3 2024', review_date: '', overall_rating: 3, status: 'draft', goals_achievement: 0, competency_score: 0, comments: null, created_at: '2024-10-01' },
    { id: 7, company_id: 2, employee: { id: 6, name: 'Diana Putri', employee_id: 'EMP006', department: 'Engineering', position: 'Senior Developer' }, reviewer: { id: 12, name: 'Director C' }, period: 'H1 2024', review_date: '2024-07-30', overall_rating: 5, status: 'completed', goals_achievement: 98, competency_score: 95, comments: 'Exceptional technical leadership', created_at: '2024-07-01' },
  ];

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
      // TODO: Replace with actual API
      setCompanies(mockCompanies);
      if (mockCompanies.length > 0) {
        setSelectedCompanyId(mockCompanies[0].id);
      }
    } catch {
      toast.error('Gagal memuat data company');
    }
  };

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API
      const filtered = mockReviews.filter(r => r.company_id === selectedCompanyId);
      setReviews(filtered);
    } catch {
      toast.error('Gagal memuat data performance review');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const filteredReviews = reviews.filter(review => {
    const matchSearch = review.employee.name.toLowerCase().includes(search.toLowerCase()) ||
      review.employee.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || review.status === filterStatus;
    const matchPeriod = filterPeriod === 'all' || review.period === filterPeriod;
    return matchSearch && matchStatus && matchPeriod;
  });

  const stats = {
    total: reviews.length,
    completed: reviews.filter(r => r.status === 'completed').length,
    inProgress: reviews.filter(r => r.status === 'in_progress' || r.status === 'pending_review').length,
    avgRating: reviews.filter(r => r.status === 'completed').length > 0
      ? (reviews.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.overall_rating, 0) / reviews.filter(r => r.status === 'completed').length).toFixed(1)
      : '0.0',
  };

  const handleOpenModal = (review?: PerformanceReview) => {
    if (review) {
      setEditingReview(review);
      setFormData({
        employee_id: review.employee.id.toString(),
        reviewer_id: review.reviewer.id.toString(),
        period: review.period,
        review_date: review.review_date,
        overall_rating: review.overall_rating,
        goals_achievement: review.goals_achievement.toString(),
        competency_score: review.competency_score.toString(),
        status: review.status,
        comments: review.comments || '',
      });
    } else {
      setEditingReview(null);
      setFormData({
        employee_id: '',
        reviewer_id: '',
        period: '',
        review_date: '',
        overall_rating: 3,
        goals_achievement: '',
        competency_score: '',
        status: 'draft',
        comments: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TODO: Replace with actual API
      if (editingReview) {
        toast.success('Review berhasil diupdate');
      } else {
        toast.success('Review berhasil dibuat');
      }
      setShowModal(false);
      fetchReviews();
    } catch {
      toast.error('Gagal menyimpan review');
    }
  };

  const openDetailModal = (review: PerformanceReview) => {
    setViewingReview(review);
    setShowDetailModal(true);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-green-500 to-green-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
      'from-red-500 to-red-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getStatusBadge = (status: ReviewStatus) => {
    const styles: Record<ReviewStatus, { bg: string; text: string; dot: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Draft' },
      pending_review: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending Review' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'In Progress' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Completed' },
    };
    const style = styles[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {style.label}
      </span>
    );
  };

  const getRatingStars = (rating: RatingLevel) => {
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
        <span className="ml-1.5 text-sm font-medium text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  const getRatingBadge = (rating: RatingLevel) => {
    const colors: Record<RatingLevel, string> = {
      1: 'bg-red-100 text-red-700',
      2: 'bg-orange-100 text-orange-700',
      3: 'bg-amber-100 text-amber-700',
      4: 'bg-green-100 text-green-700',
      5: 'bg-emerald-100 text-emerald-700',
    };
    const labels: Record<RatingLevel, string> = {
      1: 'Needs Improvement',
      2: 'Below Expectations',
      3: 'Meets Expectations',
      4: 'Exceeds Expectations',
      5: 'Outstanding',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[rating]}`}>
        {labels[rating]}
      </span>
    );
  };

  const getScoreBar = (score: number, label: string) => {
    const getColor = () => {
      if (score >= 80) return 'bg-green-500';
      if (score >= 60) return 'bg-amber-500';
      return 'bg-red-500';
    };

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{label}</span>
          <span className="font-semibold text-gray-900">{score}%</span>
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-purple-700 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Performance
                  </h1>
                  <p className="text-violet-100 text-sm mt-1">
                    {selectedCompany ? (
                      <>Kelola performance review <span className="font-semibold">{selectedCompany.name}</span></>
                    ) : (
                      'Pilih company untuk memulai'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {stats.total} Reviews
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                  <svg className="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Avg Rating: {stats.avgRating}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Company Selector */}
              <div className="relative">
                <select
                  value={selectedCompanyId || ''}
                  onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                  className="appearance-none pl-10 pr-10 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm font-medium cursor-pointer min-w-[200px]"
                >
                  {companies.map(company => (
                    <option key={company.id} value={company.id} className="text-gray-900">
                      {company.name}
                    </option>
                  ))}
                </select>
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-violet-700 rounded-xl hover:bg-violet-50 transition-all duration-200 font-semibold shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Buat Review</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Reviews</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
              Done
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.completed}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">
              Active
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.inProgress}</p>
          <p className="text-sm text-gray-500">In Progress</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg">
              Avg
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.avgRating}</p>
          <p className="text-sm text-gray-500">Avg Rating</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Cari karyawan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              <option value="all">Semua Periode</option>
              {periods.map(period => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ReviewStatus | 'all')}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              <option value="all">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <span className="text-sm text-gray-500">
              {filteredReviews.length} reviews
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
                <p className="text-gray-500">Memuat data...</p>
              </div>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Belum ada review</h3>
              <p className="mt-1 text-gray-500">Buat performance review pertama Anda.</p>
              <button
                onClick={() => handleOpenModal()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Buat Review
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Karyawan</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Periode</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Goals</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reviewer</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReviews.map(review => (
                  <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarColor(review.employee.name)} rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                          {review.employee.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{review.employee.name}</p>
                          <p className="text-xs text-gray-500">{review.employee.employee_id} • {review.employee.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-violet-50 text-violet-700 text-sm font-medium rounded-lg">
                        {review.period}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {getRatingStars(review.overall_rating)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-semibold ${review.goals_achievement >= 80 ? 'text-green-600' : review.goals_achievement >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {review.goals_achievement}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">{review.reviewer.name}</p>
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
                          title="Detail"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleOpenModal(review)}
                          className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-br from-violet-600 to-purple-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {editingReview ? 'Edit Review' : 'Buat Review Baru'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Karyawan <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      required
                    >
                      <option value="">Pilih Karyawan</option>
                      {mockEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Periode <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      required
                    >
                      <option value="">Pilih Periode</option>
                      {periods.map(period => (
                        <option key={period} value={period}>{period}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reviewer <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.reviewer_id}
                      onChange={(e) => setFormData({ ...formData, reviewer_id: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      required
                    >
                      <option value="">Pilih Reviewer</option>
                      {mockReviewers.map(rev => (
                        <option key={rev.id} value={rev.id}>{rev.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Review
                    </label>
                    <input
                      type="date"
                      value={formData.review_date}
                      onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as ReviewStatus })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="pending_review">Pending Review</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Overall Rating
                    </label>
                    <select
                      value={formData.overall_rating}
                      onChange={(e) => setFormData({ ...formData, overall_rating: Number(e.target.value) as RatingLevel })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    >
                      <option value={1}>1 - Needs Improvement</option>
                      <option value={2}>2 - Below Expectations</option>
                      <option value={3}>3 - Meets Expectations</option>
                      <option value={4}>4 - Exceeds Expectations</option>
                      <option value={5}>5 - Outstanding</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Goals Achievement (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.goals_achievement}
                      onChange={(e) => setFormData({ ...formData, goals_achievement: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      placeholder="0-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Competency Score (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.competency_score}
                      onChange={(e) => setFormData({ ...formData, competency_score: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      placeholder="0-100"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comments
                    </label>
                    <textarea
                      value={formData.comments}
                      onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                      placeholder="Komentar dan feedback..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
                  >
                    {editingReview ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && viewingReview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDetailModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-br from-violet-600 to-purple-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Detail Performance Review</h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Employee Info */}
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${getAvatarColor(viewingReview.employee.name)} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {viewingReview.employee.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{viewingReview.employee.name}</p>
                    <p className="text-sm text-gray-500">{viewingReview.employee.employee_id} • {viewingReview.employee.position}</p>
                    <p className="text-sm text-gray-500">{viewingReview.employee.department}</p>
                  </div>
                </div>

                {/* Period & Status */}
                <div className="flex items-center justify-between p-4 bg-violet-50 rounded-xl">
                  <div>
                    <p className="text-xs text-violet-600 uppercase tracking-wide font-medium">Periode Review</p>
                    <p className="font-bold text-violet-900 text-lg">{viewingReview.period}</p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(viewingReview.status)}
                    {viewingReview.review_date && (
                      <p className="text-xs text-gray-500 mt-1">{formatDate(viewingReview.review_date)}</p>
                    )}
                  </div>
                </div>

                {/* Overall Rating */}
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Overall Rating</p>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {getRatingStars(viewingReview.overall_rating)}
                  </div>
                  {getRatingBadge(viewingReview.overall_rating)}
                </div>

                {/* Scores */}
                <div className="space-y-4">
                  {getScoreBar(viewingReview.goals_achievement, 'Goals Achievement')}
                  {getScoreBar(viewingReview.competency_score, 'Competency Score')}
                </div>

                {/* Reviewer */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Reviewer</p>
                  <p className="font-semibold text-gray-900">{viewingReview.reviewer.name}</p>
                </div>

                {viewingReview.comments && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Comments</p>
                    <p className="text-gray-700">{viewingReview.comments}</p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleOpenModal(viewingReview);
                    }}
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
                  >
                    Edit Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

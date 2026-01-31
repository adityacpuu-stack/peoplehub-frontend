import { useState } from 'react';
import {
  Target,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Users,
  Building2,
  TrendingUp,
  Filter,
} from 'lucide-react';

// Mock OKR data
const mockOKRs = [
  {
    id: 1,
    objective: 'Build a World-Class Workforce',
    quarter: 'Q1 2024',
    owner: 'CEO',
    progress: 72,
    keyResults: [
      { id: 1, title: 'Reduce turnover rate to below 8%', progress: 85, target: 8, current: 6.8, unit: '%' },
      { id: 2, title: 'Achieve 95% employee satisfaction score', progress: 68, target: 95, current: 64.6, unit: '%' },
      { id: 3, title: 'Complete leadership training for 100 managers', progress: 60, target: 100, current: 60, unit: '' },
    ],
  },
  {
    id: 2,
    objective: 'Drive Operational Excellence',
    quarter: 'Q1 2024',
    owner: 'COO',
    progress: 88,
    keyResults: [
      { id: 1, title: 'Maintain 97% system uptime', progress: 100, target: 97, current: 99.2, unit: '%' },
      { id: 2, title: 'Reduce onboarding time to 3 days', progress: 80, target: 3, current: 3.8, unit: ' days' },
      { id: 3, title: 'Automate 80% of HR processes', progress: 85, target: 80, current: 68, unit: '%' },
    ],
  },
  {
    id: 3,
    objective: 'Expand Market Presence',
    quarter: 'Q1 2024',
    owner: 'CEO',
    progress: 45,
    keyResults: [
      { id: 1, title: 'Open 2 new branch offices', progress: 50, target: 2, current: 1, unit: '' },
      { id: 2, title: 'Grow headcount by 20%', progress: 35, target: 20, current: 7, unit: '%' },
      { id: 3, title: 'Enter 1 new market segment', progress: 50, target: 1, current: 0.5, unit: '' },
    ],
  },
  {
    id: 4,
    objective: 'Foster Innovation Culture',
    quarter: 'Q1 2024',
    owner: 'CTO',
    progress: 62,
    keyResults: [
      { id: 1, title: 'Launch employee innovation program', progress: 100, target: 1, current: 1, unit: '' },
      { id: 2, title: 'Implement 10 employee suggestions', progress: 40, target: 10, current: 4, unit: '' },
      { id: 3, title: 'Achieve 50% participation in hackathon', progress: 45, target: 50, current: 22.5, unit: '%' },
    ],
  },
];

export function CEOOKRTrackingPage() {
  const [expandedOKRs, setExpandedOKRs] = useState<number[]>(mockOKRs.map(o => o.id));
  const [selectedQuarter, setSelectedQuarter] = useState('Q1 2024');

  const toggleOKR = (id: number) => {
    setExpandedOKRs(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return '#10b981';
    if (progress >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getProgressBg = (progress: number) => {
    if (progress >= 70) return 'bg-green-100 text-green-700';
    if (progress >= 40) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const overallProgress = mockOKRs.reduce((acc, okr) => acc + okr.progress, 0) / mockOKRs.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="okr-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#okr-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-400 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Target className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">OKR Tracking</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Objectives & Key Results</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10"
              >
                <option value="Q1 2024">Q1 2024</option>
                <option value="Q2 2024">Q2 2024</option>
                <option value="Q3 2024">Q3 2024</option>
                <option value="Q4 2024">Q4 2024</option>
              </select>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10 transition-colors">
                <Plus className="h-4 w-4" />
                Add OKR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Overall OKR Progress</h3>
            <p className="text-sm text-gray-600 mb-4">{selectedQuarter} - Company-wide objectives</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-bold text-gray-900">{overallProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4">
                  <div
                    className="h-4 rounded-full transition-all"
                    style={{
                      width: `${overallProgress}%`,
                      backgroundColor: getProgressColor(overallProgress),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-xl flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{mockOKRs.filter(o => o.progress >= 70).length}</p>
              <p className="text-xs text-gray-500">On Track</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-amber-100 rounded-xl flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{mockOKRs.filter(o => o.progress >= 40 && o.progress < 70).length}</p>
              <p className="text-xs text-gray-500">In Progress</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-red-100 rounded-xl flex items-center justify-center mb-2">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{mockOKRs.filter(o => o.progress < 40).length}</p>
              <p className="text-xs text-gray-500">At Risk</p>
            </div>
          </div>
        </div>
      </div>

      {/* OKR List */}
      <div className="space-y-4">
        {mockOKRs.map((okr) => (
          <div key={okr.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Objective Header */}
            <div
              className="p-4 md:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleOKR(okr.id)}
            >
              <div className="flex items-start gap-4">
                <button className="mt-1 flex-shrink-0">
                  {expandedOKRs.includes(okr.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{okr.objective}</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold ${getProgressBg(okr.progress)}`}>
                      {okr.progress}% Complete
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {okr.quarter}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {okr.owner}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Target className="h-4 w-4" />
                      {okr.keyResults.length} Key Results
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${okr.progress}%`,
                          backgroundColor: getProgressColor(okr.progress),
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Results */}
            {expandedOKRs.includes(okr.id) && (
              <div className="border-t border-gray-100 bg-gray-50 p-4 md:px-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Key Results</h4>
                <div className="space-y-4">
                  {okr.keyResults.map((kr, index) => (
                    <div key={kr.id} className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          kr.progress >= 70 ? 'bg-green-100' :
                          kr.progress >= 40 ? 'bg-amber-100' :
                          'bg-red-100'
                        }`}>
                          <span className={`text-sm font-bold ${
                            kr.progress >= 70 ? 'text-green-600' :
                            kr.progress >= 40 ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 mb-2">{kr.title}</p>
                          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm">
                            <span className="text-gray-500">
                              Current: <span className="font-medium text-gray-700">{kr.current}{kr.unit}</span>
                            </span>
                            <span className="text-gray-500">
                              Target: <span className="font-medium text-gray-700">{kr.target}{kr.unit}</span>
                            </span>
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-400">Progress</span>
                              <span className="font-medium text-gray-600">{kr.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${kr.progress}%`,
                                  backgroundColor: getProgressColor(kr.progress),
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  Users,
  TrendingUp,
  Award,
  ChevronRight,
} from 'lucide-react';

// Mock succession data
const mockSuccessionPlans = [
  {
    id: 1,
    position: 'Chief Executive Officer',
    incumbent: 'Robert Anderson',
    riskLevel: 'low',
    readinessScore: 85,
    successors: [
      { name: 'Sarah Williams', readiness: 'Ready Now', development: ['Executive coaching completed', 'Board exposure'] },
      { name: 'Michael Chen', readiness: '1-2 Years', development: ['Strategic planning training', 'P&L management'] },
    ],
  },
  {
    id: 2,
    position: 'Chief Financial Officer',
    incumbent: 'Sarah Williams',
    riskLevel: 'medium',
    readinessScore: 65,
    successors: [
      { name: 'James Park', readiness: '1-2 Years', development: ['CFO certification', 'M&A experience'] },
      { name: 'Lisa Wang', readiness: '2-3 Years', development: ['Leadership program', 'Cross-functional rotation'] },
    ],
  },
  {
    id: 3,
    position: 'Chief Technology Officer',
    incumbent: 'Michael Chen',
    riskLevel: 'high',
    readinessScore: 40,
    successors: [
      { name: 'Alex Johnson', readiness: '2-3 Years', development: ['Architecture certification', 'Team leadership'] },
    ],
  },
  {
    id: 4,
    position: 'Chief Operating Officer',
    incumbent: 'Jennifer Lee',
    riskLevel: 'low',
    readinessScore: 90,
    successors: [
      { name: 'Mark Thompson', readiness: 'Ready Now', development: ['Completed all requirements'] },
      { name: 'Emily Davis', readiness: '1-2 Years', development: ['Operations excellence program'] },
    ],
  },
];

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const readinessColors: Record<string, string> = {
  'Ready Now': 'bg-green-100 text-green-700',
  '1-2 Years': 'bg-blue-100 text-blue-700',
  '2-3 Years': 'bg-amber-100 text-amber-700',
};

export function CEOSuccessionPlanningPage() {
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);

  const stats = {
    total: mockSuccessionPlans.length,
    lowRisk: mockSuccessionPlans.filter(p => p.riskLevel === 'low').length,
    mediumRisk: mockSuccessionPlans.filter(p => p.riskLevel === 'medium').length,
    highRisk: mockSuccessionPlans.filter(p => p.riskLevel === 'high').length,
    avgReadiness: Math.round(mockSuccessionPlans.reduce((sum, p) => sum + p.readinessScore, 0) / mockSuccessionPlans.length),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="succession-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#succession-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-400 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Succession Planning</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Leadership pipeline & readiness</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Critical Positions</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-green-600">{stats.lowRisk}</p>
          <p className="text-xs text-gray-500">Low Risk</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-amber-600">{stats.mediumRisk}</p>
          <p className="text-xs text-gray-500">Medium Risk</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-red-600">{stats.highRisk}</p>
          <p className="text-xs text-gray-500">High Risk</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 col-span-2 md:col-span-1">
          <p className="text-2xl font-bold text-indigo-600">{stats.avgReadiness}%</p>
          <p className="text-xs text-gray-500">Avg Readiness</p>
        </div>
      </div>

      {/* Succession Plans */}
      <div className="space-y-4">
        {mockSuccessionPlans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div
              className="p-4 md:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{plan.position}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${riskColors[plan.riskLevel]}`}>
                        {plan.riskLevel.charAt(0).toUpperCase() + plan.riskLevel.slice(1)} Risk
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      Incumbent: {plan.incumbent}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Award className="h-4 w-4" />
                      {plan.successors.length} Successors
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">Readiness Score</span>
                      <span className="font-medium text-gray-700">{plan.readinessScore}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${plan.readinessScore}%`,
                          backgroundColor: plan.readinessScore >= 70 ? '#10b981' : plan.readinessScore >= 50 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${expandedPlan === plan.id ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {expandedPlan === plan.id && (
              <div className="border-t border-gray-100 bg-gray-50 p-4 md:p-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Successor Pipeline</h4>
                <div className="space-y-4">
                  {plan.successors.map((successor, index) => (
                    <div key={index} className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {successor.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-gray-900">{successor.name}</h5>
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${readinessColors[successor.readiness]}`}>
                              {successor.readiness}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {successor.development.map((item, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                                {item}
                              </span>
                            ))}
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

import { insightEnum, insightNumber } from '@/pages/ceo/insight-display';
import { t, useLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useState } from 'react';
import { Users, Award, ChevronRight } from 'lucide-react';
import { PreviewBanner } from '@/components/ui';

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
  useLocale();
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);

  const stats = {
    total: mockSuccessionPlans.length,
    lowRisk: mockSuccessionPlans.filter(p => p.riskLevel === 'low').length,
    mediumRisk: mockSuccessionPlans.filter(p => p.riskLevel === 'medium').length,
    highRisk: mockSuccessionPlans.filter(p => p.riskLevel === 'high').length,
    avgReadiness: Math.round(mockSuccessionPlans.reduce((sum, p) => sum + p.readinessScore, 0) / mockSuccessionPlans.length),
  };

  return (
    <ReportPage><PreviewBanner message={t("Succession planning belum terintegrasi dengan data real. Data adalah contoh untuk preview UI.")} />{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Succession Planning")}</h1><p className="text-xs md:text-sm mt-1">{t("Leadership pipeline & readiness")}</p></div>

</ReportHeader>{/* Stats */}<ReportSummary><div className="report-metric"><p className="report-metric-value">{insightNumber(stats.total)}</p><p className="report-metric-label">{t("Critical Positions")}</p></div><div className="report-metric"><p className="report-metric-value">{insightNumber(stats.lowRisk)}</p><p className="report-metric-label">{t("Low Risk")}</p></div><div className="report-metric"><p className="report-metric-value">{insightNumber(stats.mediumRisk)}</p><p className="report-metric-label">{t("Medium Risk")}</p></div><div className="report-metric"><p className="report-metric-value">{insightNumber(stats.highRisk)}</p><p className="report-metric-label">{t("High Risk")}</p></div><div className="report-metric"><p className="report-metric-value">{insightNumber(stats.avgReadiness)}%</p><p className="report-metric-label">{t("Avg Readiness")}</p></div></ReportSummary>{/* Succession Plans */}<div className="space-y-4">
        {mockSuccessionPlans.map((plan) => (
          <ReportSection key={plan.id} className="overflow-hidden"><div
              className="p-4 md:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{plan.position}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${riskColors[plan.riskLevel]}`}>
                        {insightEnum(plan.riskLevel)}{' '}{t("Risk")} </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />{t("Incumbent:")} {plan.incumbent}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Award className="h-4 w-4" />
                      {insightNumber(plan.successors.length)}{' '}{t("Successors")} </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">{t("Readiness Score")}</span>
                      <span className="font-medium text-gray-700">{insightNumber(plan.readinessScore)}%</span>
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
                <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${expandedPlan === plan.id ? "rotate-90" : ""}`} />
              </div>
            </div>{expandedPlan === plan.id && (
              <div className="border-t border-gray-100 bg-gray-50 p-4 md:p-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">{t("Successor Pipeline")}</h4>
                <div className="space-y-4">
                  {plan.successors.map((successor, index) => (
                    <ReportSection key={index}><div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm report-avatar">
                          {successor.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-gray-900">{successor.name}</h5>
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${readinessColors[successor.readiness]}`}>
                              {t(successor.readiness)}
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
                      </div></ReportSection>
                  ))}
                </div>
              </div>
            )}</ReportSection>
        ))}
      </div></ReportPage>
  );
}

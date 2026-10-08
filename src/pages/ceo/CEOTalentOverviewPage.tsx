import { insightNumber, insightFixed } from '@/pages/ceo/insight-display';
import { t, useLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useState } from 'react';
import { Users, Star, TrendingUp, Award, Building2, Search, Zap } from 'lucide-react';
import { PreviewBanner } from '@/components/ui';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

// Mock talent data
const mockTalentData = [
  { id: 1, name: 'Alice Chen', position: 'Senior Engineer', department: 'Engineering', company: 'PT Company A', performance: 4.8, potential: 4.5, quadrant: 'star' },
  { id: 2, name: 'Bob Smith', position: 'Product Manager', department: 'Product', company: 'PT Company A', performance: 4.2, potential: 4.7, quadrant: 'star' },
  { id: 3, name: 'Carol Wilson', position: 'Sales Lead', department: 'Sales', company: 'PT Company B', performance: 4.5, potential: 3.8, quadrant: 'consistent' },
  { id: 4, name: 'David Lee', position: 'Junior Developer', department: 'Engineering', company: 'PT Company A', performance: 3.5, potential: 4.8, quadrant: 'high_potential' },
  { id: 5, name: 'Eva Martinez', position: 'Marketing Specialist', department: 'Marketing', company: 'PT Company C', performance: 4.0, potential: 4.0, quadrant: 'core' },
  { id: 6, name: 'Frank Johnson', position: 'Finance Analyst', department: 'Finance', company: 'PT Company A', performance: 4.6, potential: 4.2, quadrant: 'star' },
  { id: 7, name: 'Grace Kim', position: 'HR Business Partner', department: 'HR', company: 'PT Company B', performance: 3.8, potential: 4.5, quadrant: 'high_potential' },
  { id: 8, name: 'Henry Brown', position: 'Operations Manager', department: 'Operations', company: 'PT Company C', performance: 4.3, potential: 3.5, quadrant: 'consistent' },
];

const quadrantColors: Record<string, string> = {
  star: '#8b5cf6',
  high_potential: '#6366f1',
  consistent: '#10b981',
  core: '#f59e0b',
};

const quadrantLabels: Record<string, string> = {
  star: 'Star Performers',
  high_potential: 'High Potentials',
  consistent: 'Consistent Performers',
  core: 'Core Contributors',
};

export function CEOTalentOverviewPage() {
  useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuadrant, setSelectedQuadrant] = useState<string | null>(null);

  const filteredTalent = mockTalentData
    .filter(t => !selectedQuadrant || t.quadrant === selectedQuadrant)
    .filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Scatter plot data
  const scatterData = mockTalentData.map(t => ({
    x: t.performance,
    y: t.potential,
    name: t.name,
    quadrant: t.quadrant,
  }));

  const stats = {
    stars: mockTalentData.filter(t => t.quadrant === 'star').length,
    highPotential: mockTalentData.filter(t => t.quadrant === 'high_potential').length,
    consistent: mockTalentData.filter(t => t.quadrant === 'consistent').length,
    core: mockTalentData.filter(t => t.quadrant === 'core').length,
  };

  return (
    <ReportPage><PreviewBanner message={t("Talent matrix belum terintegrasi dengan performance data real. Data adalah contoh untuk preview UI.")} />{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Talent Overview")}</h1><p className="text-xs md:text-sm mt-1">{t("9-Box talent matrix & insights")}</p></div>
<div className="report-header-context"><span className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border">
              <Users className="h-4 w-4" />
              {insightNumber(mockTalentData.length)}{' '}{t("Talent Pool")} </span></div>
</ReportHeader>{/* Stats */}<ReportSummary><div
          className={`bg-white rounded-2xl shadow-sm border-2 p-4 md:p-5 cursor-pointer transition-all ${selectedQuadrant === "star" ? "border-purple-500" : "border-gray-200 hover:border-purple-300"}`}
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'star' ? null : 'star')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="report-metric"><Star className="h-5 w-5 text-white" /></div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{insightNumber(stats.stars)}</p>
          <p className="text-xs text-gray-500">{t("Star Performers")}</p>
        </div><div
          className={`bg-white rounded-2xl shadow-sm border-2 p-4 md:p-5 cursor-pointer transition-all ${selectedQuadrant === "high_potential" ? "border-indigo-500" : "border-gray-200 hover:border-indigo-300"}`}
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'high_potential' ? null : 'high_potential')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="report-metric"><Zap className="h-5 w-5 text-white" /></div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{insightNumber(stats.highPotential)}</p>
          <p className="text-xs text-gray-500">{t("High Potentials")}</p>
        </div><div
          className={`bg-white rounded-2xl shadow-sm border-2 p-4 md:p-5 cursor-pointer transition-all ${selectedQuadrant === "consistent" ? "border-green-500" : "border-gray-200 hover:border-green-300"}`}
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'consistent' ? null : 'consistent')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="report-metric"><TrendingUp className="h-5 w-5 text-white" /></div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{insightNumber(stats.consistent)}</p>
          <p className="text-xs text-gray-500">{t("Consistent Performers")}</p>
        </div><div
          className={`bg-white rounded-2xl shadow-sm border-2 p-4 md:p-5 cursor-pointer transition-all ${selectedQuadrant === "core" ? "border-amber-500" : "border-gray-200 hover:border-amber-300"}`}
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'core' ? null : 'core')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="report-metric"><Award className="h-5 w-5 text-white" /></div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{insightNumber(stats.core)}</p>
          <p className="text-xs text-gray-500">{t("Core Contributors")}</p>
        </div></ReportSummary>{/* Talent Matrix */}<ReportSection><h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">{t("Talent Matrix")}</h3><p className="text-sm text-gray-500 mb-4">{t("Performance vs Potential mapping")}</p><div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis tickFormatter={insightNumber}
                type="number"
                dataKey="x"
                name={t("Performance")}
                domain={[2, 5]}
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                label={{ value: t('Performance'), position: 'bottom', fontSize: 12 }}
              />
              <YAxis tickFormatter={insightNumber}
                type="number"
                dataKey="y"
                name={t("Potential")}
                domain={[2, 5]}
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                label={{ value: t('Potential'), angle: -90, position: 'left', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <ReportSection><p className="font-bold text-gray-900">{data.name}</p><p className="text-sm text-gray-500">{t("Performance:")} {data.x}</p><p className="text-sm text-gray-500">{t("Potential:")} {data.y}</p></ReportSection>
                    );
                  }
                  return null;
                }}
              />
              <Scatter data={scatterData} dataKey="y">
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={quadrantColors[entry.quadrant]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div></ReportSection>{/* Search and Talent List */}<div className="relative report-search">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t("Search talent...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div><div className="grid md:grid-cols-2 gap-4">
        {filteredTalent.map((talent) => (
          <ReportSection key={talent.id}><div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-md flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: quadrantColors[talent.quadrant] }}
              >
                {talent.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-900 truncate">{talent.name}</h3>
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: `${quadrantColors[talent.quadrant]}20`, color: quadrantColors[talent.quadrant] }}
                  >
                    {t(quadrantLabels[talent.quadrant])}
                  </span>
                </div>
                <p className="text-sm text-indigo-600 font-medium">{talent.position}</p>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {talent.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />
                    {insightFixed(talent.performance, 1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {insightFixed(talent.potential, 1)}
                  </span>
                </div>
              </div>
            </div></ReportSection>
        ))}
      </div>{filteredTalent.length === 0 && (
        <ReportSection><Users className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 mb-2">{t("No talent found")}</h3><p className="text-gray-500">{t("Try adjusting your filters or search criteria.")}</p></ReportSection>
      )}</ReportPage>
  );
}

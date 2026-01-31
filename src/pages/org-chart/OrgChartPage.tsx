import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { orgChartService } from '@/services/org-chart.service';
import type { OrgChartNode, OrgChartStats } from '@/services/org-chart.service';
import { companyService } from '@/services/company.service';

// UI-friendly node interface
interface OrgNode {
  id: number;
  employee_id: string | null;
  name: string;
  position: string;
  department: string;
  company: string;
  email: string;
  phone?: string;
  avatar?: string;
  children?: OrgNode[];
}

// Transform API response to UI format
const transformNode = (node: OrgChartNode): OrgNode => {
  return {
    id: node.id,
    employee_id: node.employee_id,
    name: node.name,
    position: node.job_title || node.position?.name || 'No Position',
    department: node.department?.name || 'No Department',
    company: node.company?.name || '',
    email: node.email || '',
    phone: node.phone || undefined,
    avatar: node.avatar || undefined,
    children: node.children?.map(transformNode),
  };
};

// Generate department color dynamically
const getDepartmentColor = (department: string): { bg: string; text: string; gradient: string } => {
  const colors = [
    { bg: 'bg-purple-50', text: 'text-purple-700', gradient: 'from-purple-500 to-purple-700' },
    { bg: 'bg-blue-50', text: 'text-blue-700', gradient: 'from-blue-500 to-blue-700' },
    { bg: 'bg-cyan-50', text: 'text-cyan-700', gradient: 'from-cyan-500 to-cyan-700' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', gradient: 'from-indigo-500 to-indigo-700' },
    { bg: 'bg-green-50', text: 'text-green-700', gradient: 'from-green-500 to-green-700' },
    { bg: 'bg-pink-50', text: 'text-pink-700', gradient: 'from-pink-500 to-pink-700' },
    { bg: 'bg-amber-50', text: 'text-amber-700', gradient: 'from-amber-500 to-amber-700' },
    { bg: 'bg-rose-50', text: 'text-rose-700', gradient: 'from-rose-500 to-rose-700' },
    { bg: 'bg-teal-50', text: 'text-teal-700', gradient: 'from-teal-500 to-teal-700' },
    { bg: 'bg-violet-50', text: 'text-violet-700', gradient: 'from-violet-500 to-violet-700' },
  ];

  // Simple hash function to get consistent color for department
  let hash = 0;
  for (let i = 0; i < department.length; i++) {
    hash = department.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

function OrgCard({
  node,
  onSelect,
  isSelected,
}: {
  node: OrgNode;
  onSelect: (node: OrgNode) => void;
  isSelected: boolean;
}) {
  const colors = getDepartmentColor(node.department);

  return (
    <div
      onClick={() => onSelect(node)}
      className={`relative bg-white rounded-xl border-2 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer min-w-[200px] max-w-[240px] ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-100 hover:border-blue-200'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-sm bg-gradient-to-br ${colors.gradient}`}
          >
            {node.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{node.name}</h3>
            <p className="text-xs text-gray-500 truncate">{node.position}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
          >
            {node.department}
          </span>
          {node.company && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {node.company}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function OrgTree({
  node,
  onSelect,
  selectedId,
  level = 0,
}: {
  node: OrgNode;
  onSelect: (node: OrgNode) => void;
  selectedId: number | null;
  level?: number;
}) {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <OrgCard node={node} onSelect={onSelect} isSelected={selectedId === node.id} />

      {hasChildren && (
        <>
          {/* Vertical connector line */}
          <div className="w-0.5 h-6 bg-gray-300"></div>

          {/* Horizontal line and children */}
          <div className="relative">
            {/* Horizontal connector */}
            {node.children!.length > 1 && (
              <div
                className="absolute top-0 h-0.5 bg-gray-300"
                style={{
                  left: '50%',
                  right: '50%',
                  transform: 'translateX(-50%)',
                  width: `calc(100% - 200px)`,
                }}
              ></div>
            )}

            <div className="flex gap-8 pt-0">
              {node.children!.map(child => (
                <div key={child.id} className="flex flex-col items-center">
                  {/* Vertical line to child */}
                  <div className="w-0.5 h-6 bg-gray-300"></div>
                  <OrgTree node={child} onSelect={onSelect} selectedId={selectedId} level={level + 1} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface Company {
  id: number;
  name: string;
}

export function OrgChartPage() {
  const [orgData, setOrgData] = useState<OrgNode[]>([]);
  const [stats, setStats] = useState<OrgChartStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(100);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<number | ''>('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchOrgData();
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const response = await companyService.getAll();
      setCompanies(response.data || []);
    } catch {
      console.error('Failed to load companies');
    }
  };

  const fetchOrgData = async () => {
    setIsLoading(true);
    try {
      const params: { company_id?: number } = {};
      if (selectedCompany) {
        params.company_id = selectedCompany;
      }

      const response = await orgChartService.getOrgChart(params);

      // Transform API response to UI format
      const transformedData = response.tree.map(transformNode);
      setOrgData(transformedData);
      setStats(response.stats);
    } catch {
      toast.error('Failed to load organization structure');
      setOrgData([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeSelect = (node: OrgNode) => {
    setSelectedNode(node);
  };

  // Search filter function
  const filterNodes = (nodes: OrgNode[], query: string): OrgNode[] => {
    if (!query.trim()) return nodes;

    const lowerQuery = query.toLowerCase();

    const filterRecursive = (node: OrgNode): OrgNode | null => {
      const matches =
        node.name.toLowerCase().includes(lowerQuery) ||
        node.position.toLowerCase().includes(lowerQuery) ||
        node.department.toLowerCase().includes(lowerQuery) ||
        node.email.toLowerCase().includes(lowerQuery);

      const filteredChildren = node.children
        ?.map(filterRecursive)
        .filter((child): child is OrgNode => child !== null);

      if (matches || (filteredChildren && filteredChildren.length > 0)) {
        return { ...node, children: filteredChildren };
      }

      return null;
    };

    return nodes.map(filterRecursive).filter((node): node is OrgNode => node !== null);
  };

  const filteredData = filterNodes(orgData, searchQuery);
  const colors = selectedNode ? getDepartmentColor(selectedNode.department) : null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Organization Structure</h1>
              <p className="mt-2 text-purple-100 max-w-xl">
                Visualization of company hierarchy and organizational structure
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl transition-all duration-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                <span className="font-medium">Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalEmployees || 0}</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Departments</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalDepartments || 0}</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Organization Levels</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.maxDepth || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Company Filter */}
          <div className="w-full sm:w-48">
            <select
              value={selectedCompany}
              onChange={e => setSelectedCompany(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="">All Companies</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Zoom:</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setZoom(prev => Math.max(50, prev - 10))}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-white rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-12 text-center text-sm font-medium text-gray-700">{zoom}%</span>
              <button
                onClick={() => setZoom(prev => Math.min(150, prev + 10))}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-white rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => setZoom(100)}
                className="px-2 h-8 flex items-center justify-center text-gray-600 hover:bg-white rounded-md transition-colors text-xs font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Org Chart Container */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-gray-500">Loading organization structure...</p>
            </div>
          </div>
        ) : filteredData.length > 0 ? (
          <div className="p-8 overflow-auto">
            <div
              className="inline-block min-w-full transition-transform duration-200"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            >
              {/* Render each root node */}
              <div className="flex flex-wrap gap-12 justify-center">
                {filteredData.map(rootNode => (
                  <OrgTree
                    key={rootNode.id}
                    node={rootNode}
                    onSelect={handleNodeSelect}
                    selectedId={selectedNode?.id || null}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No data</h3>
              <p className="mt-1 text-gray-500">
                {searchQuery
                  ? 'No employees match your search.'
                  : 'Organization structure data is not available.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Employee Detail Panel */}
      {selectedNode && colors && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Employee Details</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div
                className={`flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm bg-gradient-to-br ${colors.gradient}`}
              >
                {selectedNode.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-semibold text-gray-900">{selectedNode.name}</h4>
                <p className="text-gray-600">{selectedNode.position}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
                  >
                    {selectedNode.department}
                  </span>
                  {selectedNode.company && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                      {selectedNode.company}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedNode.employee_id && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Employee ID</p>
                    <p className="text-sm font-medium text-gray-900">{selectedNode.employee_id}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{selectedNode.email || '-'}</p>
                </div>
              </div>

              {selectedNode.phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{selectedNode.phone}</p>
                  </div>
                </div>
              )}
            </div>

            {selectedNode.children && selectedNode.children.length > 0 && (
              <div className="mt-6">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">
                  Direct Reports ({selectedNode.children.length})
                </h5>
                <div className="space-y-2">
                  {selectedNode.children.map(child => {
                    const childColors = getDepartmentColor(child.department);
                    return (
                      <div
                        key={child.id}
                        onClick={() => setSelectedNode(child)}
                        className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium bg-gradient-to-br ${childColors.gradient}`}
                        >
                          {child.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{child.name}</p>
                          <p className="text-xs text-gray-500 truncate">{child.position}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

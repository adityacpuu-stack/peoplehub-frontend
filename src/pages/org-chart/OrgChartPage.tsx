import { t, useLocale, intlLocale } from '@/i18n';
import { useState, useEffect, useRef } from 'react';
import { Minus, Plus, X, Maximize, Minimize } from 'lucide-react';
import { orgChartService, type OrgChartNode, type OrgChartStats } from '@/services/org-chart.service';
import { companyService, type Company } from '@/services/company.service';
import { collectPages } from '@/services/master-data';
import { OperationalWorkspace } from '@/components/ui/OperationalWorkspace';
import { OrgChartCanvas } from './OrgChartCanvas';
import './org-chart.css';
import { getInitials } from '@/lib/utils';

const MAX_DEPTH = 20;
const position = (node: OrgChartNode) => node.position?.name || node.job_title || t('No position');
function filterTree(nodes: OrgChartNode[], query: string, branch = new Set<number>(), depth = 0): OrgChartNode[] {
  if (depth >= MAX_DEPTH) return [];
  return nodes.flatMap(node => {
    if (branch.has(node.id)) return [];
    const next = new Set(branch); next.add(node.id);
    const children = filterTree(node.children || [], query, next, depth + 1);
    const matches = `${node.name} ${node.employee_id || ''} ${position(node)} ${node.department?.name || ''} ${node.email || ''}`.toLowerCase().includes(query);
    return matches || children.length ? [{ ...node, children }] : [];
  });
}
function findNode(nodes: OrgChartNode[], id: number, depth = 0): OrgChartNode | undefined {
  if (depth >= MAX_DEPTH) return;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children || [], id, depth + 1);
    if (child) return child;
  }
}
function OrgTree({ nodes, selected, onSelect }: { nodes: OrgChartNode[]; selected?: number; onSelect: (node: OrgChartNode) => void }) {
  useLocale();
  return <ul className="org-tree">{nodes.map(node => <li key={node.id}>
    <button className="org-node" aria-pressed={selected === node.id} onClick={() => onSelect(node)}>
      <span className="org-node-person"><span className="operations-person-mark" aria-hidden="true">{getInitials(node.name || '?')}</span><span><strong>{node.name}</strong><span>{position(node)}</span></span></span>
      <span className="org-node-department">{node.department?.name || t('No department')}</span><span className="org-node-company">{node.company?.name || t('No company')}</span>
      {!!node.children?.length && <span className="org-report-count">{node.children.length.toLocaleString(intlLocale())}{' '}{t("reports shown")}</span>}
    </button>
    {!!node.children?.length && <OrgTree nodes={node.children} selected={selected} onSelect={onSelect} />}
  </li>)}</ul>;
}

export function OrgChartPage() {
  useLocale();
  const stage = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);
  const toggleFullscreen = async () => {
    setFullscreenError(false);
    try {
      if (document.fullscreenElement === stage.current) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch { setFullscreenError(true); }
  };
  const [orgData, setOrgData] = useState<OrgChartNode[]>([]);
  const [stats, setStats] = useState<OrgChartStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selectedNode, setSelectedNode] = useState<OrgChartNode | null>(null);
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(100);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesError, setCompaniesError] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companyRevision, setCompanyRevision] = useState(0);
  const [companyId, setCompanyId] = useState('');
  useEffect(() => {
    let current = true;
    // Clear the previous request state before loading this company list.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompaniesLoading(true); setCompaniesError(false);
    collectPages((page, limit) => companyService.getAll({ page, limit })).then(data => { if (current) setCompanies(data); })
      .catch(() => { if (current) setCompaniesError(true); }).finally(() => { if (current) setCompaniesLoading(false); });
    return () => { current = false; };
  }, [companyRevision]);
  useEffect(() => {
    let current = true;
    // A changed company must immediately hide the previous company tree and inspector.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError(false); setOrgData([]); setStats(null); setSelectedNode(null);
    orgChartService.getOrgChart({ company_id: companyId ? Number(companyId) : undefined }).then(data => {
      if (current) { setOrgData(data.tree); setStats(data.stats); }
    }).catch(() => { if (current) setError(true); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [companyId, revision]);
  const filtered = filterTree(orgData, search.trim().toLowerCase());
  const selectNode = (node: OrgChartNode) => setSelectedNode(findNode(orgData, node.id) || node);
  return <OperationalWorkspace module="operations" title={t("Organization Structure")} description={t("Explore reporting lines and find people in your organization.")} className="org-workspace"
    actions={<button className="ow-button" disabled={loading} onClick={() => setRevision(v => v + 1)}>{t("Refresh")}</button>}
    filters={<>
      <label className="ow-field">{t("Company")}<select value={companyId} disabled={companiesLoading || companiesError} onChange={e => setCompanyId(e.target.value)}><option value="">{companiesLoading ? t("Loading companies...") : t("All Companies")}</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {companiesError && <p role="alert">{t("Companies unavailable.")} <button className="ow-button" onClick={() => setCompanyRevision(v => v + 1)}>{t("Retry companies")}</button></p>}
      <label className="ow-field">{t("Search organization")}<input placeholder={t("Name, role or department")} value={search} onChange={e => { setSearch(e.target.value); setSelectedNode(null); }} /></label>
      <details className="org-note"><summary>{t("Reading the chart")}</summary><p>{t("Search keeps the reporting path to each match. Click and drag to move the chart. Scroll up to zoom in and down to zoom out around your cursor. Click a person for their details and direct reports. Touch and arrow keys can also scroll the chart.")}</p></details>
      {(companyId || search) && <button className="ow-button" onClick={() => { setCompanyId(''); setSearch(''); setSelectedNode(null); }}>{t("Reset filters")}</button>}
    </>}

  >
    <section ref={stage} className="ow-register org-stage" aria-label={t("Organization chart workspace")}>
      <div className="ow-toolbar org-toolbar"><p className="org-scope"><span>{stats?.totalEmployees.toLocaleString(intlLocale()) ?? '-'}{' '}{t("employees")}</span><span>{stats?.totalDepartments.toLocaleString(intlLocale()) ?? '-'}{' '}{t("departments")}</span><span>{stats?.maxDepth.toLocaleString(intlLocale()) ?? '-'}{' '}{t("levels")}</span>{search && <span>{t("Showing matching reporting paths")}</span>}</p><div className="org-zoom" aria-label={t("Chart zoom")}><button className="ow-button" aria-label={t("Zoom out")} disabled={zoom <= 50} onClick={() => setZoom(v => Math.max(50, v - 10))}><Minus size={16} /></button><output aria-label={t("Zoom level")}>{zoom}%</output><button className="ow-button" aria-label={t("Zoom in")} disabled={zoom >= 150} onClick={() => setZoom(v => Math.min(150, v + 10))}><Plus size={16} /></button><button className="ow-button" onClick={() => setZoom(100)}>{t("Reset zoom")}</button><button className="ow-button org-fullscreen-button" onClick={toggleFullscreen} aria-pressed={fullscreen} disabled={!document.fullscreenEnabled} title={document.fullscreenEnabled ? (fullscreen ? t("Exit fullscreen (Esc)") : t("View chart fullscreen")) : t("Fullscreen is unavailable in this browser")}>{fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}{fullscreen ? t("Exit fullscreen") : t("Fullscreen")}</button></div></div>
      {fullscreenError && <p className="org-fullscreen-error" role="alert">{t("Fullscreen could not be changed. Please try again.")}</p>}
      {loading ? <div className="ow-feedback" role="status">{t("Loading organization structure...")}</div> : error ? <div className="ow-feedback" role="alert">{t("Unable to load organization structure.")} <button className="ow-button" onClick={() => setRevision(v => v + 1)}>{t("Retry chart")}</button></div> : filtered.length === 0 ? <div className="ow-feedback"><h3>{search ? t("No matching employees") : t("No organization data")}</h3><p>{search ? t("Try another name, role or department.") : t("There are no reporting records in this company selection.")}</p></div> : <div className={selectedNode ? 'org-content org-content--selected' : 'org-content'}>
        <div className="org-chart-area"><OrgChartCanvas zoom={zoom} onZoomChange={setZoom}><div className="org-scale" style={{ zoom: zoom / 100 }}><OrgTree nodes={filtered} selected={selectedNode?.id} onSelect={selectNode} /></div></OrgChartCanvas></div>
        {selectedNode && <aside className="org-inspector" aria-label={t("Employee details")}><div className="org-inspector-title"><h2>{t("Employee details")}</h2><button className="ow-button" aria-label={t("Close employee details")} onClick={() => setSelectedNode(null)}><X size={16} /></button></div><h3>{selectedNode.name}</h3><p>{position(selectedNode)}</p><dl><dt>{t("Employee ID")}</dt><dd>{selectedNode.employee_id || '-'}</dd><dt>{t("Department")}</dt><dd>{selectedNode.department?.name || '-'}</dd><dt>{t("Company")}</dt><dd>{selectedNode.company?.name || '-'}</dd><dt>{t("Email")}</dt><dd>{selectedNode.email || '-'}</dd>{selectedNode.phone && <><dt>{t("Phone")}</dt><dd>{selectedNode.phone}</dd></>}</dl><h4>{t('Direct reports ({count})', { count: (selectedNode.children?.length || 0).toLocaleString(intlLocale()) })}</h4><div className="org-reports">{selectedNode.children?.map(child => <button key={child.id} onClick={() => selectNode(child)}><strong>{child.name}</strong><span>{position(child)}</span></button>)}</div></aside>}
      </div>}
    </section>
  </OperationalWorkspace>;
}

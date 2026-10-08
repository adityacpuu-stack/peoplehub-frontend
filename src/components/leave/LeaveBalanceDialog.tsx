import { quantity } from './presentation';
import { t, useLocale } from '@/i18n';
import { useEffect, useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toNum } from '@/lib/utils';
import { leaveService } from '@/services/leave.service';
import type { LeaveBalance } from '@/types';
import { getAvailableDays } from './leave-balance';
import '@/pages/personal/personal-workspace.css';

export function LeaveBalanceDialog({ balances, onClose, loading = false, failed = false, onRetry }: {
  balances: LeaveBalance[]; onClose: () => void; loading?: boolean; failed?: boolean; onRetry?: () => void;
}) {
  useLocale();
  return <Modal isOpen onClose={onClose} title={t("Saldo cuti")} description={t("Saldo tersedia sudah dikurangi pengajuan yang masih pending.")} size="lg" className="ph-workflow personal-modal personal-balances-dialog">
    <div className="personal-balance-list">
      {loading ? <p role="status" className="personal-note"><Loader2 size={18} className="animate-spin" />{t("Memuat saldo cuti…")}</p> : failed ? <div role="alert"><p className="personal-note">{t("Saldo cuti belum bisa dimuat.")}</p><button className="ph-button" onClick={onRetry}>{t("Coba lagi")}</button></div> : balances.length === 0 ? <p className="personal-note">{t("Belum ada saldo cuti yang dialokasikan. Hubungi P&C untuk bantuan.")}</p> : balances.map(balance =>
        <article className="personal-balance-row" key={balance.id}>
          <div className="personal-balance-name"><CalendarDays aria-hidden="true" /><div><h3>{balance.leaveType?.name || t("Leave")}</h3><span>{t("Periode")} {balance.year}</span></div></div>
          <div className="personal-balance-available"><strong>{quantity(getAvailableDays(balance))}</strong><span>{t("hari tersedia")}</span></div>
          <dl><div><dt>{t("Alokasi")}</dt><dd>{quantity(toNum(balance.allocated_days))}{' '}{t("hari")}</dd></div><div><dt>{t("Terpakai")}</dt><dd>{quantity(toNum(balance.used_days))}{' '}{t("hari")}</dd></div><div><dt>{t("Pending")}</dt><dd>{quantity(toNum(balance.pending_days))}{' '}{t("hari")}</dd></div></dl>
        </article>)}
    </div>
    <div className="ph-dialog-footer"><button className="ph-button" onClick={onClose}>{t("Tutup")}</button></div>
  </Modal>;
}

/** Load the authenticated employee's balances only when the dashboard popup opens. */
export function OwnLeaveBalanceDialog({ onClose }: { onClose: () => void }) {
  useLocale();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setFailed(false);
      try { const result = await leaveService.getMyBalance(); if (!cancelled) setBalances(result); }
      catch { if (!cancelled) { setBalances([]); setFailed(true); } }
      finally { if (!cancelled) setLoading(false); }
    }
    void load(); return () => { cancelled = true; };
  }, [retry]);
  return <LeaveBalanceDialog balances={balances} loading={loading} failed={failed} onRetry={() => setRetry(value => value + 1)} onClose={onClose} />;
}

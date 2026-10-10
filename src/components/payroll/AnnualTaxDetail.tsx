import { payrollCalculationCurrency, payrollEnumLabel } from '@/components/payroll/localization';
import { t, useLocale } from '@/i18n';
import type { PayrollAnnualTax } from '@/services/payroll.service';

// The frozen final-period (annual) PPh 21 worksheet exactly as saved by the
// server (backend payroll-annual-history.ts). Display only: no tax formula,
// no recalculation; a missing value is shown as "-".
const money = payrollCalculationCurrency;

const reasons = {
  december: 'Desember',
  cessation: 'Bulan berhenti bekerja',
  cross_year_cessation: 'Berhenti pada tahun pajak sebelumnya (settlement eksternal)',
} as const;
const fundingLabels: Record<string, string> = {
  employee_withheld: 'Dipotong dari karyawan',
  company_funded: 'Ditanggung perusahaan (tidak dikurangkan)',
  corrected: 'Koreksi HR',
};
const excludedLabels: Record<string, string> = {
  separate_employer: 'pemberi kerja terpisah',
  unfinalized_replaced_by_opening: 'belum final, diganti saldo awal',
};
const ptkpBasis = { explicit_input: 'Input HR (dokumen awal tahun)', consistent_saved_status: 'Riwayat tersimpan konsisten' } as const;
const monthsBasis = { employment_dates: 'dari tanggal masuk/berhenti', explicit_input: 'input HR' } as const;

function Row({ label, value, strong }: { label: string; value: number | null | undefined; strong?: boolean }) {
  return <div><dt className="text-gray-500">{label}</dt><dd className={`tabular-nums pw-annual-amount ${strong ? 'font-semibold' : ''}`}>{value == null ? '-' : money(value)}</dd></div>;
}

export function PayrollAnnualTaxDetail({ annual }: { annual: PayrollAnnualTax }) {
  useLocale();
  const w = annual.worksheet ?? null;
  const s = annual.settlement;
  const history = annual.history ?? null;
  const refund = s.period_tax < 0;
  return (
    <section aria-label={t("PPh 21 masa pajak terakhir")} className="ph-section pw-annual-tax" data-testid="payroll-annual-tax">
      <h3 className="pw-section-title">{t("PPh 21 masa pajak terakhir (tahunan)")}</h3>
      <p className="text-sm text-gray-600">{annual.source === 'external_override'
        ? t("Pajak periode ini memakai settlement eksternal yang direview, bukan lembar kerja Pasal 17 PeopleHub.")
        : t("Pasal 17 atas penghasilan setahun dikurangi PPh 21 yang sudah dipotong (PMK 168/2023). Hasil tersimpan; tidak dihitung ulang saat dibuka.")}</p>
      <dl className="ph-kv pw-policy-facts">
        <div><dt className="text-gray-500">{t("Tahun pajak")}</dt><dd>{annual.tax_year}</dd></div>
        <div><dt className="text-gray-500">{t("Alasan masa pajak terakhir")}</dt><dd>{t(reasons[annual.final_reason])}{annual.explicit_choice === 'this_period' ? ` · ${t("dikonfirmasi HR")}` : ''}</dd></div>
        <div><dt className="text-gray-500">{t("Sumber pajak")}</dt><dd>{annual.source === 'external_override' ? t("Settlement eksternal") : t("Lembar kerja Pasal 17")}</dd></div>
        {annual.policy_source === 'salary_status_default' && <div className="sm:col-span-3"><dt className="text-gray-500">{t("Kebijakan")}</dt><dd>{t("Tanpa persiapan HR: perlakuan sesuai status gaji (existing gross-up, new gross dipotong).")}</dd></div>}
        <div><dt className="text-gray-500">{t("Referensi")}</dt><dd className="break-words">{annual.reference ?? '-'}</dd></div>
        {annual.ptkp && <div><dt className="text-gray-500">{t("PTKP awal tahun")}</dt><dd>{annual.ptkp.status} · <span className="pw-annual-amount">{money(annual.ptkp.amount)}</span> · {t(ptkpBasis[annual.ptkp.basis])}</dd></div>}
        {annual.source === 'calculated' && <div><dt className="text-gray-500">{t("Residensi")}</dt><dd>{annual.residency?.mode === 'partial_year_subjective'
          ? t("Subjek pajak sebagian tahun: {months} bulan (disetahunkan)", { months: annual.residency.months })
          : t("Setahun penuh (tidak disetahunkan)")}</dd></div>}
        {annual.months != null && <div><dt className="text-gray-500">{t("Bulan kerja di tahun ini")}</dt>
          <dd>{annual.months}{annual.months_basis ? ` · ${t(monthsBasis[annual.months_basis])}` : ''}</dd></div>}
        {annual.payroll_periods_covered != null && <div><dt className="text-gray-500">{t("Periode payroll tercakup")}</dt><dd>{annual.payroll_periods_covered}</dd></div>}
      </dl>
      {w && <>
        <h4 className="pw-section-title">{t("Lembar kerja tahunan")}</h4>
        <dl className="ph-kv pw-policy-facts">
          <Row label={t("Penghasilan bruto setahun (DPP)")} value={w.annual_gross} />
          {(annual.current?.bonus ?? 0) > 0 && <Row label={t("Termasuk bonus terpisah periode ini")} value={annual.current?.bonus} />}
          <Row label={t("Termasuk tunjangan pajak periode ini")} value={w.tax_allowance} />
          <Row label={t("Biaya jabatan")} value={w.occupational_deduction} />
          <Row label={t("Iuran JHT/JP dibayar karyawan")} value={w.deductible_contributions} />
          <Row label={t("Pengurang lain")} value={w.other_deductions} />
          <Row label={t("Penghasilan neto")} value={w.net_income} />
          {w.annualized_net_income != null && <Row label={t("Neto disetahunkan")} value={w.annualized_net_income} />}
          <Row label={t("PTKP")} value={w.ptkp} />
          <Row label={t("PKP (dibulatkan ke ribuan)")} value={w.pkp} />
          {w.annualized_net_income != null && <Row label={t("PPh Pasal 17 setahun penuh")} value={w.pasal17_full_year} />}
          <Row label={t("PPh 21 terutang setahun")} value={w.annual_liability} strong />
          <Row label={t("PPh 21 sudah dipotong")} value={w.prior_tax} />
        </dl>
      </>}
      <h4 className="pw-section-title">{t("Penyelesaian periode ini")}</h4>
      <dl className="ph-kv pw-policy-facts">
        <Row label={refund ? t("PPh 21 periode ini (refund kelebihan potong)") : t("PPh 21 periode ini")} value={s.period_tax} strong />
        {(s.bonus_tax ?? 0) !== 0 && <Row label={t("Bagian bonus terpisah")} value={s.bonus_tax} />}
        <Row label={t("Tunjangan pajak")} value={s.tax_allowance} />
        <Row label={t("Pengaruh pajak ke karyawan")} value={s.employee_tax} />
        <Row label={t("Beban pajak perusahaan")} value={s.company_tax} />
      </dl>
      {refund && <p className="text-sm text-gray-600" data-testid="payroll-annual-refund-note">{t("Kelebihan potong dikembalikan kepada karyawan melalui payroll ini (PMK 168/2023). Perlakuan PPh ditanggung pemerintah (DTP) tidak didukung.")}</p>}
      {annual.other_deductions && <p className="text-sm text-gray-600">{t("Pengurang lain:")} {annual.other_deductions.description}</p>}
      {history && <details className="mt-2">
        <summary className="cursor-pointer font-medium">{t("Riwayat tahun ini yang dipakai")}</summary>
        <div className="overflow-x-auto mt-2" tabIndex={0} role="region" aria-label={t("Riwayat tahun ini yang dipakai")}>
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-gray-500">
              <th className="pr-3 pw-annual-period">{t("Periode")}</th><th className="pr-3">{t("Status")}</th><th className="pr-3">{t("DPP")}</th>
              <th className="pr-3">{t("PPh 21")}</th><th className="pr-3">{t("JHT/JP")}</th><th>{t("Penanggung iuran")}</th>
            </tr></thead>
            <tbody>
              {history.rows.map(row => <tr key={row.id}>
                <td className="pr-3 pw-annual-period"><span className="pw-annual-period-item">{row.period}</span></td><td className="pr-3">{payrollEnumLabel(row.status)}</td>
                <td className="pr-3 tabular-nums pw-annual-amount">{money(row.gross)}</td><td className="pr-3 tabular-nums pw-annual-amount">{money(row.tax)}</td>
                <td className="pr-3 tabular-nums pw-annual-amount">{money(row.deductible_contributions)}</td>
                <td>{fundingLabels[row.funding] ? t(fundingLabels[row.funding]) : row.funding}{row.corrected.length ? ` · ${t("koreksi HR")}` : ''}</td>
              </tr>)}
              {history.opening && <tr>
                {/* A period never breaks inside "YYYY-MM"; the list wraps only between periods. */}
                <td className="pr-3 pw-annual-period">{history.opening.periods.map((p, i) => <span key={p}>
                  <span className="pw-annual-period-item">{p}</span>{i < history.opening!.periods.length - 1 ? ', ' : ''}</span>)}</td>
                <td className="pr-3">{t("Saldo awal HR")}</td>
                <td className="pr-3 tabular-nums pw-annual-amount">{money(history.opening.gross)}</td><td className="pr-3 tabular-nums pw-annual-amount">{money(history.opening.tax_withheld)}</td>
                <td className="pr-3 tabular-nums pw-annual-amount">{money(history.opening.deductible_contributions)}</td><td>-</td>
              </tr>}
            </tbody>
          </table>
        </div>
        {history.excluded.length > 0 && <p className="text-xs text-gray-600 mt-2">{t("Tidak dihitung:")} {history.excluded
          .map(row => `${row.period} (#${row.id}, ${excludedLabels[row.reason] ? t(excludedLabels[row.reason]) : payrollEnumLabel(row.status)})`).join('; ')}</p>}
      </details>}
    </section>
  );
}

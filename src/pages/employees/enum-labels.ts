import { t } from '@/i18n';

// Translate only known application enums; preserve unknown API values verbatim.
const labels: Record<string, string> = {
  male: 'Male', female: 'Female', single: 'Single', married: 'Married', divorced: 'Divorced', widowed: 'Widowed',
  islam: 'Islam', kristen: 'Kristen', katolik: 'Katolik', hindu: 'Hindu', buddha: 'Buddha', konghucu: 'Konghucu', other: 'Other',
  permanent: 'Permanent', contract: 'Contract', internship: 'Internship', freelance: 'Freelance', part_time: 'Part time', probation: 'Probation',
  active: 'Active', inactive: 'Inactive', terminated: 'Terminated', resigned: 'Resigned', retired: 'Retired', suspended: 'Suspended',
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled', applied: 'Applied', draft: 'Draft', expired: 'Expired', renewed: 'Renewed',
  gross: 'Gross', monthly: 'Monthly', weekly: 'Weekly', biweekly: 'Biweekly',
  voluntary: 'Voluntary', involuntary: 'Involuntary', retirement: 'Retirement', contract_end: 'Contract End (Kontrak Berakhir)', mutual_agreement: 'Mutual Agreement',
  promotion: 'Promotion', demotion: 'Demotion', transfer: 'Transfer', mutation: 'Mutation', salary_adjustment: 'Salary Adjustment',
  grade_change: 'Grade Change', status_change: 'Status Change', department_change: 'Department Change', position_change: 'Position Change', company_transfer: 'Company Transfer',
  Suami: 'Suami', Istri: 'Istri', 'Orang Tua': 'Orang Tua', Ayah: 'Ayah', Ibu: 'Ibu', Anak: 'Anak', Saudara: 'Saudara', Kakak: 'Kakak', Adik: 'Adik', Lainnya: 'Other',
};
export function enumLabel(value?: string | null): string {
  if (!value) return '-';
  return Object.prototype.hasOwnProperty.call(labels, value) ? t(labels[value]) : value;
}

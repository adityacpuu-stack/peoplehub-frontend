import { t, type MessagePair } from '../../i18n';

// Registered in the shared messages catalog by the integration owner.
export const teamTimeMessages: Record<string, MessagePair> = {
  'Overtime details': ['Detail lembur', 'Overtime details'],
  'Approval Notes': ['Catatan Persetujuan', 'Approval Notes'],
  'Recorded attendance for your team. Missing records are not counted as absences.': ['Catatan kehadiran tim Anda. Data yang belum tercatat tidak dihitung sebagai ketidakhadiran.', 'Recorded attendance for your team. Missing records are not counted as absences.'],
  'Overtime records from companies you can access, including employees outside your direct reports.': ['Catatan lembur dari perusahaan yang dapat Anda akses, termasuk karyawan di luar bawahan langsung Anda.', 'Overtime records from companies you can access, including employees outside your direct reports.'],
  'Previous day': ['Hari sebelumnya', 'Previous day'],
  'Next day': ['Hari berikutnya', 'Next day'],
  'Times shown in WIB': ['Waktu ditampilkan dalam WIB', 'Times shown in WIB'],
  'No matching attendance records': ['Tidak ada catatan kehadiran yang cocok', 'No matching attendance records'],
  'No attendance records for this date': ['Tidak ada catatan kehadiran pada tanggal ini', 'No attendance records for this date'],
  'recorded entries': ['catatan kehadiran', 'recorded entries'],
  'checked in': ['sudah check-in', 'checked in'],
  'late entries': ['catatan terlambat', 'late entries'],
  'Attendance details': ['Detail kehadiran', 'Attendance details'],
  'No overtime records for this month': ['Tidak ada catatan lembur pada bulan ini', 'No overtime records for this month'],
  'Monthly records': ['Catatan bulanan', 'Monthly records'],
  'Approved hours': ['Jam disetujui', 'Approved hours'],
  'Approved amount': ['Jumlah disetujui', 'Approved amount'],
  'Confirm approval': ['Konfirmasi persetujuan', 'Confirm approval'],
  'Confirm rejection': ['Konfirmasi penolakan', 'Confirm rejection'],
  'Review the request before confirming your decision.': ['Tinjau permintaan sebelum mengonfirmasi keputusan Anda.', 'Review the request before confirming your decision.'],
  'Decision could not be saved. Review the request and try again.': ['Keputusan gagal disimpan. Tinjau permintaan dan coba lagi.', 'Decision could not be saved. Review the request and try again.'],
  'This request is no longer pending.': ['Permintaan ini tidak lagi menunggu keputusan.', 'This request is no longer pending.'],
  'Approval notes (optional)': ['Catatan persetujuan (opsional)', 'Approval notes (optional)'],
  'Task description': ['Deskripsi tugas', 'Task description'],
  'Break duration (minutes)': ['Durasi istirahat (menit)', 'Break duration (minutes)'],
  'Rejection reason is required': ['Alasan penolakan wajib diisi', 'Rejection reason is required'],
};

export function teamTimeText(source: string, values?: Record<string, string | number>): string {
  return t(source, values);
}

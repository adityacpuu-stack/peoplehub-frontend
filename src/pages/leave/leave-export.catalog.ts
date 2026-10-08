import type { MessagePair } from '@/i18n';

// Leave entitlements Excel export (LeaveEntitlementsPage). Keyed by the English source copy.
const pairs: MessagePair[] = [
  ['Ekspor Excel', 'Export Excel'],
  ['Ekspor hak cuti', 'Export leave entitlements'],
  ['Workbook Excel untuk semua karyawan yang sesuai', 'Excel workbook for every matching employee'],
  ['Filter Perusahaan, Departemen, dan Pencarian saat ini berlaku. Semua halaman dan semua jenis cuti disertakan — bukan hanya baris atau jenis cuti yang tampil di layar.',
    'The current Company, Department and Search filters apply. Every page and every leave type is included — not only the rows or the leave type shown on screen.'],
  ['Filter ekspor', 'Export filters'],
  ['Teks pencarian', 'Search text'],
  ['Tanpa pencarian', 'No search'],
  ['Tahun saldo', 'Balance year'],
  ['Tahun ekspor', 'Export year'],
  ['Karyawan yang disertakan', 'Employees to include'],
  ['Semua status kepegawaian', 'All employment statuses'],
  ['Hanya karyawan aktif', 'Active employees only'],
  ['Tabel di halaman ini hanya menampilkan karyawan aktif. "Semua status kepegawaian" juga menyertakan karyawan yang mengundurkan diri atau nonaktif, sehingga cuti yang sudah mereka pakai pada tahun tersebut tetap terlihat.',
    'The table on this page lists active employees only. "All employment statuses" also includes resigned and inactive employees, so leave they already used in that year stays visible.'],
  ['Ekspor tidak mengubah tahun tabel, saldo, atau alokasi.', 'Exporting does not change the table year, balances or allocations.'],
  ['Menyiapkan ekspor…', 'Preparing export…'],
  ['Unduh Excel', 'Download Excel'],
  ['Coba ekspor lagi', 'Try export again'],
  ['Ekspor gagal dibuat. Tidak ada data yang diubah. Silakan coba lagi.', 'The export could not be created. Nothing was changed. Please try again.'],
  ['Excel hak cuti telah diunduh.', 'Leave entitlements Excel downloaded.'],
];

export const leaveExportMessages: Record<string, MessagePair> = {};
for (const pair of pairs) { leaveExportMessages[pair[1]] = pair; leaveExportMessages[pair[0]] = pair; }

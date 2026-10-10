import type { MessagePair } from './index';
import { rolesErrorMessages } from '../pages/admin/roles.catalog';
const entries: MessagePair[] = [
  ['Terjadi kesalahan', 'An error occurred'], ['Sesi berakhir. Silakan masuk kembali.', 'Session expired. Please login again.'],
  ['Anda tidak memiliki izin untuk tindakan ini.', 'You do not have permission to perform this action.'],
  ['Data tidak ditemukan.', 'Resource not found.'], ['Server mengalami kesalahan. Silakan coba lagi nanti.', 'Server error. Please try again later.'],
  ['Koneksi jaringan bermasalah', 'Network Error'], ['Email atau kata sandi salah', 'Invalid email or password'],
  ['Akun Anda tidak aktif. Hubungi administrator.', 'Your account is inactive. Please contact administrator.'],
  ['Sesi tidak berlaku lagi. Silakan masuk kembali', 'Session is no longer valid. Please sign in again'],
  ['Token penyegaran tidak valid', 'Invalid refresh token'], ['Token tidak valid atau kedaluwarsa', 'Invalid or expired token'],
  ['Autentikasi diperlukan', 'Authentication required'], ['Tidak diizinkan', 'Unauthorized'], ['Akses ditolak', 'Forbidden'],
  ['Data tidak valid', 'Validation error'], ['Terjadi kesalahan internal server', 'Internal server error'],
  ['Terjadi kesalahan yang tidak terduga', 'An unexpected error occurred'],
  ['{resource} tidak ditemukan', '{resource} not found'], ['{field} wajib diisi', '{field} is required'],
  ['Tanggal tidak valid', 'Invalid date'], ['Rentang tanggal tidak valid', 'Invalid date range'],
  ['Jam tidak valid', 'Invalid time'],
  ['Alamat email tidak valid', 'Invalid email address'], ['Format email tidak valid', 'Invalid email format'],
  ['ID tidak valid', 'Invalid ID'], ['ID karyawan tidak valid', 'Invalid employee ID'],
  ['Tanggal akhir tidak boleh sebelum tanggal mulai', 'End date cannot be before start date'],
  ['Tanggal akhir harus setelah tanggal mulai', 'End date must be after start date'],
  ['Catatan kehadiran sudah ada untuk tanggal ini', 'Attendance record already exists for this date'],
  ['Penggajian sudah ada untuk periode ini', 'Payroll already exists for this period'],
  ['Saldo cuti tidak cukup. Tersedia: {days} hari', 'Insufficient leave balance. Available: {days} days'],
  ['Minimal {days} hari per pengajuan', 'Minimum {days} days required per request'],
  ['Maksimal {days} hari per pengajuan', 'Maximum {days} days allowed per request'],
  ['Terlalu banyak permintaan. Silakan coba lagi nanti.', 'Too many requests, please try again later.'],
  ['Tidak dapat menyimpan perubahan. Silakan coba lagi.', 'Unable to save changes. Please try again.'],
];

// Confirmed server-authored copy from backend/src/modules/{auth,user,leave,payroll,attendance},
// backend/src/middlewares, and backend/src/validations/*.schema.ts. Keep complete causes.
// Columns: Indonesian | English | optional exact legacy source alias.
const backendEntries = `
Akses ditolak|Access denied
Akses ditolak. Izin tidak mencukupi.|Access denied. Insufficient permissions.
Permintaan tidak valid|Bad request
Data sudah ada|Resource already exists
Validasi gagal|Validation failed
Data dengan nilai ini sudah ada|A record with this value already exists
Data tidak ditemukan|Record not found
Kendala foreign key gagal dipenuhi|Foreign key constraint failed
Relasi tidak valid|Invalid relation
Kesalahan basis data|Database error
Data yang diberikan tidak valid|Invalid data provided
Token tidak valid|Invalid token
Token kedaluwarsa|Token expired
JSON tidak valid|Invalid JSON
File terlalu besar. Cek batas ukuran per folder.|File is too large. Check the size limit for each folder.
Terlalu banyak file dalam satu upload.|Too many files in one upload.
Field upload tidak dikenali: {field}|Unrecognized upload field: {field}
Rute {method} {url} tidak ditemukan|Route {method} {url} not found
Terlalu banyak permintaan. Silakan coba lagi nanti|Too many requests, please try again later
Terlalu banyak upaya masuk. Silakan coba lagi setelah 15 menit|Too many login attempts, please try again after 15 minutes
Terlalu banyak upaya mengatur ulang kata sandi. Silakan coba lagi setelah 1 jam|Too many password reset attempts, please try again after 1 hour
Batas unggah terlampaui. Silakan coba lagi nanti|Upload limit exceeded, please try again later
Batas ekspor terlampaui. Silakan coba lagi nanti|Export limit exceeded, please try again later
Batas operasi terlampaui. Silakan coba lagi nanti|Operation limit exceeded, please try again later
Batas permintaan terlampaui|Rate limit exceeded
Token tidak diberikan|No token provided
Token telah dicabut|Token has been revoked
Akun dinonaktifkan|Account is disabled
Kata sandi berubah. Silakan masuk kembali|Password changed. Please sign in again
Akun terkunci|Account is locked
Karyawan sudah tidak aktif|Employee is no longer active
Akun terkunci. Coba lagi dalam {minutes} menit.|Account is locked. Try again in {minutes} minutes.
Akun terkunci karena terlalu banyak upaya yang gagal. Coba lagi dalam {minutes} menit.|Account locked due to too many failed attempts. Try again in {minutes} minutes.
Akun dinonaktifkan. Silakan hubungi administrator.|Account is disabled. Please contact administrator.
Token penyegaran tidak valid atau kedaluwarsa|Invalid or expired refresh token
Token penyegaran telah dicabut|Refresh token has been revoked
Akun terkunci. Lakukan autentikasi ulang melalui halaman masuk.|Account is locked. Re-authenticate via login.
Kata sandi saat ini salah|Current password is incorrect
Token pengaturan ulang tidak valid atau kedaluwarsa|Invalid or expired reset token
Email sudah digunakan|Email already exists
Diperlukan karyawan dari perusahaan yang ditugaskan kepada Anda|An employee in your assigned companies is required
Karyawan sudah memiliki akun|Employee already has an account
Karyawan berada di luar perusahaan yang ditugaskan kepada Anda|Employee is outside your assigned companies
Tidak dapat menonaktifkan akun sendiri|Cannot deactivate your own account
Tidak dapat menghapus akun sendiri|Cannot delete your own account
Pengguna belum terhubung dengan karyawan. Hubungkan karyawan terlebih dahulu.|User has no linked employee. Please link an employee first.
Integrasi M365 belum dikonfigurasi. Akun office email belum dapat dibuat.|M365 integration is not configured. An office email account cannot be created yet.
Perusahaan "{company}" belum memiliki konfigurasi domain email.|Company "{company}" has no email domain configured.
Email {email} sudah digunakan oleh pengguna lain.|Email {email} is already used by another user.
Karyawan belum memiliki email pribadi atau kantor. Perbarui data karyawan terlebih dahulu.|Employee has no personal or office email. Please update employee data first.
Karyawan belum memiliki email pribadi. Perbarui email pribadi karyawan terlebih dahulu.|Employee has no personal email. Please update employee personal email first.
Akun dibuat tetapi email gagal dikirim. Periksa konfigurasi email.|Account created but failed to send email. Please check email configuration.
Akses ke perusahaan ini ditolak|Access denied to this company
Anda tidak memiliki akses ke perusahaan ini|You do not have access to this company
Akses ditolak. Anda tidak memiliki akses ke perusahaan ini.|Access denied. You do not have access to this company.
Akses ditolak. Anda tidak ditugaskan ke perusahaan mana pun.|Access denied. You are not assigned to any company.
Akses ditolak. Izin yang diperlukan: {permissions}|Access denied. Required permissions: {permissions}
Akses ditolak. Izin yang belum dimiliki: {permissions}|Access denied. Missing permissions: {permissions}
Akses ditolak. Pola izin yang diperlukan: {pattern}|Access denied. Required permission pattern: {pattern}
Akses ditolak. Peran yang diperlukan: {roles}|Access denied. Required roles: {roles}
Akses ditolak. Peran minimum yang diperlukan: {role}|Access denied. Minimum role required: {role}
Akses ditolak. Diperlukan peran HR Staff atau Tax.|Access denied. HR Staff or Tax role required.
Akses ditolak. Diperlukan izin pengelolaan karyawan.|Access denied. Employee management permission required.
Akses ditolak. Anda hanya dapat mengakses data milik sendiri.|Access denied. You can only access your own resources.
Akses ke karyawan ini ditolak|Access denied to this employee
ID jenis cuti tidak valid|Invalid leave type ID
ID cuti tidak valid|Invalid leave ID
Tanggal mulai dan tanggal akhir wajib diisi|Start date and end date are required
start_date dan end_date wajib diisi|start_date and end_date are required
ID karyawan wajib diisi|Employee ID is required
Alasan penolakan wajib diisi|Rejection reason is required
ID karyawan, ID jenis cuti, dan tahun wajib diisi|Employee ID, leave type ID, and year are required
Jumlah hari penyesuaian dan alasan wajib diisi|Adjustment days and reason are required
Jumlah hari alokasi wajib diisi|Allocated days is required
ID hari libur tidak valid|Invalid holiday ID
Nama, tanggal, dan tipe wajib diisi|Name, date, and type are required
Akses ke jenis cuti ini ditolak|Access denied to this leave type
Karyawan masih dalam masa percobaan hingga {date}. Pengajuan cuti tidak diperbolehkan selama masa percobaan.|Employee is still on probation until {date}. Leave requests are not allowed during probation.
Tanggal yang dipilih jatuh pada hari libur atau weekend. Tidak ada hari kerja yang dihitung.|The selected dates fall on holidays or weekends. No working days are counted.
Jenis cuti sudah tidak tersedia|Leave type is no longer available
Jenis cuti tidak tersedia untuk perusahaan karyawan ini|Leave type is not available for this employee company
Tanggal ini bentrok dengan pengajuan cuti {status} tanggal {from} s/d {to}|These dates overlap with a leave request ({status}) from {from} to {to}
Hanya pengajuan cuti yang menunggu persetujuan yang dapat diperbarui|Can only update pending leave requests
Tanggal cuti lama dengan durasi pecahan tidak dapat diubah. Batalkan pengajuan pending dan ajukan kembali sebagai full day.|Dates on a legacy fractional-day leave request cannot be changed. Cancel the pending request and resubmit it as full-day leave.
Tanggal yang dipilih tidak memiliki hari kerja. Cuti harus minimal satu hari penuh.|The selected dates contain no working days. Leave must be at least one full day.
Hanya pemilik yang dapat membatalkan pengajuan cuti ini|Only the owner can cancel this leave request
Hanya pengajuan cuti yang menunggu persetujuan yang dapat dibatalkan|Can only cancel pending leave requests
Cuti sudah tidak menunggu persetujuan (status berubah secara bersamaan)|Leave is no longer pending (concurrent state change)
Akses ditolak. Tidak dapat membatalkan cuti ini|Access denied. Cannot void this leave request
Hanya pengajuan cuti yang disetujui yang dapat dibatalkan|Can only void approved leave requests
Cuti sudah tidak berstatus disetujui (status berubah secara bersamaan)|Leave is no longer approved (concurrent state change)
Akses ditolak. Tidak dapat menyetujui pengajuan cuti ini|Access denied. Cannot approve this leave request
Hanya pengajuan cuti yang menunggu persetujuan yang dapat disetujui|Can only approve pending leave requests
Akses ditolak. Tidak dapat menolak pengajuan cuti ini|Access denied. Cannot reject this leave request
Hanya pengajuan cuti yang menunggu persetujuan yang dapat ditolak|Can only reject pending leave requests
Hanya pemberi persetujuan yang dapat melihat pengajuan cuti yang ditugaskan|Only approvers can view assigned leave requests
Cuti sudah dihapus (status berubah secara bersamaan)|Leave already deleted (concurrent state change)
Akses ke hari libur ini ditolak|Access denied to this holiday
Cuti hanya dapat diajukan dalam hari penuh (full day).|Leave can only be requested in full days.
ID penggajian tidak valid|Invalid payroll ID
ID perusahaan dan periode wajib diisi|Company ID and period are required
Format periode tidak valid. Gunakan YYYY-MM|Invalid period format. Use YYYY-MM
ID karyawan dan periode wajib diisi|Employee ID and period are required
Daftar ID penggajian wajib diisi|Payroll IDs array is required
ID perusahaan tidak valid|Invalid company ID
Nama dan tipe wajib diisi|Name and type are required
ID komponen tidak valid|Invalid component ID
Kode dan nama golongan wajib diisi|Grade code and name are required
ID golongan tidak valid|Invalid grade ID
ID karyawan, tipe, dan jumlah wajib diisi|Employee ID, type, and amount are required
ID penyesuaian tidak valid|Invalid adjustment ID
Periode wajib diisi|Period is required
Konfigurasi payroll perusahaan belum tersedia|Company payroll configuration is not available yet
Persiapan payroll berubah; periksa preview lalu generate ulang|Payroll preparation has changed; review the preview and generate again
Aturan payroll perusahaan berubah; periksa preview lalu generate ulang|Company payroll rules have changed; review the preview and generate again
Bonus sudah ada di tunjangan yang disetujui; jangan tambahkan bonus persiapan dua kali|The bonus is already included in approved allowances; do not add the preparation bonus twice
Jadwal payroll harus 5 atau 6 hari per minggu|The payroll schedule must be 5 or 6 days per week
Jumlah hari cuti tanpa upah tidak valid|Invalid unpaid leave days
Tanggal penggajian karyawan tidak valid|Invalid employee payroll date
Metode prorata gaji tidak didukung|Unsupported salary proration method
Prorata gaji khusus memerlukan faktor eksplisit antara 0 dan 1|Custom salary proration requires an explicit factor between 0 and 1
Periode penggajian tidak valid; gunakan YYYY-MM|Invalid payroll period; use YYYY-MM
Tanggal batas penggajian harus antara 1 dan 31|Payroll cutoff must be a day from 1 to 31
Hanya penggajian berstatus draf yang dapat diperbarui|Can only update draft payrolls
Payroll dengan snapshot perhitungan tidak dapat ditimpa nominalnya melalui edit biasa|Amounts in payroll with a calculation snapshot cannot be overwritten through regular editing
Hanya penggajian berstatus draf yang dapat divalidasi|Can only validate draft payrolls
Hanya penggajian yang sudah divalidasi yang dapat diajukan|Can only submit validated payrolls
Hanya penggajian yang sudah diajukan yang dapat disetujui|Can only approve submitted payrolls
Hanya penggajian yang sudah diajukan yang dapat ditolak|Can only reject submitted payrolls
Pembayaran payroll ditahan; lepaskan hold dengan alasan sebelum mencatat pembayaran|Payroll payment is on hold; release the hold with a reason before recording payment
Hanya penggajian yang disetujui yang dapat ditandai lunas|Can only mark approved payrolls as paid
Status pembayaran historis tidak dapat diubah|Historical payment status cannot be changed
Hold tersedia untuk payroll dengan snapshot perhitungan|Holds are available for payroll with a calculation snapshot
Hanya penyesuaian yang menunggu persetujuan yang dapat disetujui|Can only approve pending adjustments
Hanya penyesuaian yang menunggu persetujuan yang dapat ditolak|Can only reject pending adjustments
Tidak ada perusahaan yang dapat diakses|No accessible companies
Perusahaan karyawan belum terpasang. Hubungi P&C.|The employee has no assigned company. Contact P&C.
Absensi belum diaktifkan untuk perusahaan Anda.|Attendance is not enabled for your company.
Lokasi kerja perlu diperiksa P&C sebelum absensi.|P&C must review the work location before attendance can be recorded.
Konfigurasi geofence khusus perlu disesuaikan P&C ke koordinat lokasi kerja.|P&C must align the custom geofence configuration with the work location coordinates.
Koordinat atau radius absensi belum lengkap. Hubungi P&C.|Attendance coordinates or radius are incomplete. Contact P&C.
Foto absensi wajib dilampirkan.|An attendance photo is required.
Izinkan lokasi untuk melakukan absensi.|Allow location access to record attendance.
Lokasi Anda berada di luar radius absensi yang diizinkan.|Your location is outside the permitted attendance radius.
Anda sudah check-in hari ini.|You have already checked in today.
Anda harus check-in terlebih dahulu.|You must check in first.
Anda sudah check-out hari ini.|You have already checked out today.
Pencatatan istirahat tidak diaktifkan.|Break recording is not enabled.
Istirahat sudah dicatat hari ini.|A break has already been recorded today.
Istirahat belum dimulai.|The break has not started.
Istirahat sudah selesai.|The break has already ended.
Selesaikan istirahat sebelum check-out.|End your break before checking out.
Catat istirahat sebelum check-out sesuai pengaturan perusahaan.|Record a break before checking out, as required by company settings.
ID kehadiran tidak valid|Invalid attendance ID
Tanggal wajib diisi|Date is required
Akses ke catatan kehadiran ini ditolak|Access denied to this attendance record
Akses untuk membuat kehadiran karyawan ini ditolak|Access denied to create attendance for this employee
Akses untuk memperbarui catatan kehadiran ini ditolak|Access denied to update this attendance record
Akses untuk menghapus catatan kehadiran ini ditolak|Access denied to delete this attendance record
start_date harus sebelum end_date|start_date must be before end_date
Kata sandi harus minimal 8 karakter|Password must be at least 8 characters
Kata sandi harus mengandung setidaknya satu huruf besar|Password must contain at least one uppercase letter
Kata sandi harus mengandung setidaknya satu huruf kecil|Password must contain at least one lowercase letter
Kata sandi harus mengandung setidaknya satu angka|Password must contain at least one number
Format nomor telepon tidak valid (contoh: 081234567890 atau 0211234567)|Invalid phone number format (e.g. 081234567890 or 0211234567)|Invalid phone number format (e.g. 081234567890 atau 0211234567)
NIK harus terdiri dari 16 digit|NIK must be 16 digits
NIK hanya boleh berisi angka|NIK must contain only numbers
Format NPWP tidak valid|Invalid NPWP format
Tanggal harus dalam format YYYY-MM-DD|Date must be in YYYY-MM-DD format
Waktu harus dalam format HH:MM atau HH:MM:SS|Time must be in HH:MM or HH:MM:SS format
Kata sandi wajib diisi|Password is required
Kata sandi saat ini wajib diisi|Current password is required
Token wajib diisi|Token is required
Token penyegaran wajib diisi|Refresh token is required
Nama wajib diisi|Name is required
ID jenis cuti wajib diisi|Leave type ID is required
Tahun wajib diisi|Year is required
Jumlah hari penyesuaian wajib diisi|Adjustment days is required
Alasan penyesuaian wajib diisi|Adjustment reason is required
Tahun harus antara 2000 dan 2100|Year must be between 2000 and 2100
Jumlah hari alokasi tidak boleh negatif|Allocated days must be non-negative
from_year wajib diisi|from_year is required
to_year wajib diisi|to_year is required
Tipe wajib diisi|Type is required
Kode golongan wajib diisi|Grade code is required
Nama golongan wajib diisi|Grade name is required
Jumlah wajib diisi|Amount is required
ID karyawan harus berupa bilangan bulat positif|Employee ID must be a positive integer
Jumlah harus berupa angka positif|Amount must be a positive number
Total pinjaman harus positif|Total loan amount must be positive
Jumlah cicilan harus positif|Installment amount must be positive
Setidaknya satu ID karyawan wajib diisi|At least one employee ID is required
Setidaknya satu ID penyesuaian wajib diisi|At least one adjustment ID is required
Alasan/referensi HR wajib diisi|An HR reason/reference is required
Gunakan periode YYYY-MM|Use a YYYY-MM period
Basis BPJS harus positif|The BPJS base must be positive
Bonus harus positif|The bonus must be positive
Isi nominal tunjangan tetap secara eksplisit, termasuk jika nol|Enter the fixed allowance amount explicitly, including when it is zero
Nominal maksimal dua desimal; gunakan pembulatan total akhir untuk presisi sumber HR|Amounts may have at most two decimal places; use final-total rounding for HR source precision
Settlement pajak memerlukan tunjangan tetap atau tanpa tunjangan pajak|Tax settlement requires a fixed allowance or no tax allowance
Nominal tunjangan hanya berlaku untuk mode tetap|The allowance amount applies only to fixed mode
Bonus terpisah memerlukan tunjangan pajak tetap atau tanpa tunjangan|A separate bonus requires a fixed tax allowance or no allowance
company_id harus berupa bilangan bulat positif|company_id must be a positive integer
tax_category wajib diisi|tax_category is required
bracket_name wajib diisi|bracket_name is required
rate harus antara 0 dan 1|rate must be between 0 and 1
min_income tidak boleh negatif|min_income must be non-negative
status wajib diisi|status is required
amount tidak boleh negatif|amount must be non-negative
income wajib diisi dan tidak boleh negatif|income is required and must be non-negative
ptkp_status wajib diisi|ptkp_status is required
companyId harus berupa bilangan bulat positif|companyId must be a positive integer
id harus berupa bilangan bulat positif|id must be a positive integer
ID perusahaan harus berupa bilangan bulat positif|Company ID must be a positive integer
Tanggal kalender tidak valid|Invalid calendar date
Tanggal mulai harus sebelum tanggal akhir|Start date must precede end date
Tanggal harus merupakan tanggal kalender YYYY-MM-DD yang valid|Date must be a valid YYYY-MM-DD calendar date
Harus terdiri dari 16 digit|Must be 16 digits
Tanggal akhir tidak boleh mendahului tanggal mulai|End date must not precede start date
Setidaknya satu ID wajib diisi|At least one ID is required
ID target duplikat|Duplicate target IDs
Tanggal kedaluwarsa tidak valid|Invalid expiry date
Tanggal kedaluwarsa harus di masa depan|Expiry must be in the future
Pilih cakupan global secara eksplisit atau setidaknya satu perusahaan|Choose explicit global scope or at least one company
Audiens terbatas memerlukan ID target|Restricted audiences require target IDs
Tidak ada kolom yang diperbarui|No fields to update
Nama manfaat wajib diisi|Benefit name is required
Setidaknya satu ID perusahaan wajib diisi|At least one company ID is required
Alasan pemutusan wajib diisi|Termination reason is required
Kode kategori wajib diisi|Category code is required
Daftar category_ids wajib diisi|category_ids array is required
Judul wajib diisi|Title is required
Lokasi file wajib diisi|File path is required
Judul tidak boleh kosong|Title cannot be empty
Nama dokumen wajib diisi|Document name is required
Jenis dokumen wajib diisi|Document type is required
Nama dokumen tidak boleh kosong|Document name cannot be empty
Jenis dokumen tidak boleh kosong|Document type cannot be empty
Nama kategori wajib diisi|Category name is required
Nama kategori tidak boleh kosong|Category name cannot be empty
Nomor kartu keluarga harus terdiri dari 16 digit|Family card number must be 16 digits
Format nomor rekening bank tidak valid|Invalid bank account number format
Kode wajib diisi|Code is required
Umpan balik wajib diisi|Feedback is required
Komentar wajib diisi|Comment is required
Nama hari libur wajib diisi|Holiday name is required
Setidaknya satu hari libur wajib diisi|At least one holiday is required
Kode KPI wajib diisi|KPI code is required
department_id wajib diisi|department_id is required
position_id wajib diisi|position_id is required
Alasan wajib diisi|Reason is required
Jenis penilaian wajib diisi|Review type is required
Nilai keseluruhan wajib diisi|Overall rating is required
Komentar atasan wajib diisi|Manager comments are required
Umpan balik atasan wajib diisi|Manager feedback is required
Nama izin wajib diisi|Permission name is required
Nama peran wajib diisi|Role name is required
Nama peran maksimal 100 karakter|Role name must be at most 100 characters
Deskripsi maksimal 500 karakter|Description must be at most 500 characters
Tingkat tidak boleh negatif|Level must be non-negative
Nama izin maksimal 100 karakter|Permission name must be at most 100 characters
Grup maksimal 50 karakter|Group must be at most 50 characters
ID peran harus berupa bilangan bulat positif|Role ID must be a positive integer
permission_ids harus berupa daftar|permission_ids must be an array
ID pengguna harus berupa bilangan bulat positif|User ID must be a positive integer
role_ids harus berupa daftar|role_ids must be an array
Kunci pengaturan wajib diisi|Setting key is required
Grup pengaturan wajib diisi|Setting group is required
Setidaknya satu pengaturan wajib diisi|At least one setting is required
Nama templat wajib diisi|Template name is required
Nama templat tidak boleh kosong|Template name cannot be empty
Kategori wajib diisi|Category is required
Lintang harus antara -90 dan 90|Latitude must be between -90 and 90
Bujur harus antara -180 dan 180|Longitude must be between -180 and 180
ID perusahaan wajib diisi|Company ID is required
Pegawai tidak memenuhi cakupan perusahaan atau kelayakan payroll periode ini|The employee does not meet the company scope or payroll eligibility for this period
Pengaturan perusahaan tersimpan tidak valid; periksa konfigurasi HR|Saved company settings are invalid; check the HR configuration
Otomatisasi payroll tersimpan tidak valid; periksa konfigurasi HR|Saved payroll automation is invalid; check the HR configuration
Gunakan periode payroll YYYY-MM yang valid|Use a valid YYYY-MM payroll period
Otomatisasi payroll tersimpan tidak valid; periksa periode dan konfigurasi HR|Saved payroll automation is invalid; check the period and HR configuration
Otomatisasi payroll tidak valid; periksa konfigurasi HR|Payroll automation is invalid; check the HR configuration
Perbaiki salary_status menjadi existing/new_gross atau isi tax_allowance_mode dan bpjs_paid_by_company secara eksplisit pada persiapan periode ini|Correct salary_status to existing/new_gross or explicitly set tax_allowance_mode and bpjs_paid_by_company in this period's preparation
Mode fixed_position memerlukan nominal Position Allowance yang disetujui secara eksplisit, termasuk nol|fixed_position mode requires an explicitly approved Position Allowance amount, including zero
Payroll perusahaan pada atau setelah periode ini sudah dibuat; gunakan periode baru setelah payroll terakhir|Company payroll for this period or a later period has already been generated; use a new period after the latest payroll
Data berubah selama penyimpanan; muat ulang dan periksa otomatisasi payroll|Data changed while saving; reload and review payroll automation
rounding harus berupa legacy, final_cent, atau final_cash|rounding must be legacy, final_cent or final_cash
Pajak eksternal memerlukan referensi yang tidak kosong|External tax requires a non-empty reference
BPJS eksternal memerlukan referensi yang tidak kosong|External BPJS requires a non-empty reference
tax_allowance_mode tidak valid|Invalid tax_allowance_mode
bpjs_paid_by_company harus berupa boolean|bpjs_paid_by_company must be a boolean
fixed_tax_allowance memerlukan mode fixed|fixed_tax_allowance requires fixed mode
Mode fixed memerlukan fixed_tax_allowance yang diisi secara eksplisit (nol diperbolehkan)|fixed mode requires an explicit fixed_tax_allowance (zero is allowed)
external_tax memerlukan mode fixed atau none secara eksplisit; gross_up tidak didukung|external_tax requires explicit fixed or none mode; gross_up is not supported
Hasil nominal melampaui presisi sen yang aman|Monetary output exceeds safe cent precision
Perhitungan payroll v2 tersimpan tidak valid; ekspor memerlukan kebijakan dan pembayaran yang dibekukan|Invalid saved payroll calculation v2; export requires the frozen policy and payments
Persiapan payroll tersimpan tidak valid; periksa input HR|Saved payroll preparation is invalid; check the HR input
Payroll periode ini sudah dibuat; hasil dan riwayat tidak ditimpa|Payroll for this period has already been generated; results and history will not be overwritten
Data berubah selama penyimpanan; muat ulang dan periksa persiapan payroll|Data changed while saving; reload and review payroll preparation
Penggajian {id}: Tidak ditemukan|Payroll {id}: Not found
Penggajian {id}: Hanya penggajian berstatus draf atau sudah divalidasi yang dapat diajukan (saat ini: {status})|Payroll {id}: Can only submit draft or validated payrolls (current: {status})
Penggajian {id}: Hanya penggajian yang sudah diajukan yang dapat disetujui (saat ini: {status})|Payroll {id}: Can only approve submitted payrolls (current: {status})
Penggajian {id}: Hanya penggajian yang sudah diajukan yang dapat ditolak (saat ini: {status})|Payroll {id}: Can only reject submitted payrolls (current: {status})
Templat penggajian PFI tidak ditemukan di {path}|PFI payroll template not found at {path}
`.trim().split('\n');

// Known validatePayrollAmount call sites; field identifiers remain verbatim.
for (const field of ['fixed_tax_allowance', 'taxable_income_before', 'bonus', 'Taxable income after bonus',
  'basic_salary', 'allowances', 'transport_allowance', 'meal_allowance', 'position_allowance', 'overtime', 'bpjsBase', 'DPP',
  'bpjs_kes_employee', 'bpjs_jht_employee', 'bpjs_jp_employee', 'bpjs_kes_company', 'bpjs_jht_company', 'bpjs_jp_company', 'bpjs_jkk_company', 'bpjs_jkm_company']) {
  entries.push([`${field} harus berupa angka terbatas yang tidak negatif`, `${field} must be a finite non-negative number`]);
}
for (const field of ['External tax amount', 'Monetary output', 'tax_already_applied']) {
  entries.push([`${field} harus berupa angka terbatas`, `${field} must be a finite number`]);
}

// Target THP -> basic salary simulator (payroll-salary-simulator / simulation
// service / schema): exact backend sentences, so EN users see English.
entries.push(
  ['Target THP harus rupiah utuh 0 sampai batas simulasi', 'Target THP must be whole rupiah from 0 up to the simulation limit'],
  ['Status PTKP tidak didukung', 'PTKP status is not supported'],
  ['Status gaji tidak didukung simulasi', 'This payroll status is not supported by the simulation'],
  ['Tunjangan harus rupiah utuh 0 sampai batas simulasi', 'Allowances must be whole rupiah from 0 up to the simulation limit'],
  ['Simulasi melebihi batas perhitungan; periksa nilai input', 'The simulation exceeded its calculation limit; check the input values'],
  ['Simulasi tidak konvergen dalam batas; hasil tidak ditampilkan', 'The simulation did not converge within its limit; no result is shown'],
  ['Verifikasi ulang simulasi gagal; hasil tidak ditampilkan', 'Re-verifying the simulation failed; no result is shown'],
  ['Target THP melebihi batas simulasi gaji pokok', 'The target THP is above what the simulated basic salary range can reach'],
  ['Gunakan rupiah utuh', 'Use whole rupiah'],
  ['Tunjangan kontrak karyawan memerlukan employee_id', 'Employee contract allowances require an employee'],
  ['Simulasi mandiri tidak terkait karyawan', 'A standalone simulation is not tied to an employee'],
);

// Only these literal resources are emitted by NotFoundError; never match arbitrary
// "... not found" diagnostics or translate an interpolated resource/user value.
const missingResources: MessagePair[] = [
  ['Pengguna', 'User'], ['Karyawan', 'Employee'], ['Profil karyawan', 'Employee profile'],
  ['Data karyawan', 'Employee record'], ['Jenis cuti', 'Leave type'], ['Cuti', 'Leave'],
  ['Catatan saldo cuti', 'Leave balance record'], ['Saldo cuti', 'Leave balance'], ['Hak cuti', 'Leave entitlement'],
  ['Hari libur', 'Holiday'], ['Penggajian', 'Payroll'], ['Komponen gaji', 'Salary component'], ['Golongan gaji', 'Salary grade'],
  ['Penyesuaian', 'Adjustment'], ['Catatan kehadiran', 'Attendance record'], ['Perusahaan', 'Company'],
  ['Karyawan lepas atau magang', 'Freelance or internship employees'], ['Tunjangan', 'Allowance'], ['Penugasan', 'Assignment'],
  ['Pengaturan kehadiran', 'Attendance setting'], ['Pengaturan kehadiran perusahaan ini', 'Attendance setting for this company'],
  ['Manfaat', 'Benefit'], ['Kategori', 'Category'], ['Templat tunjangan perusahaan', 'Company allowance template'],
  ['Kontrak', 'Contract'], ['Departemen', 'Department'], ['Dokumen', 'Document'], ['File', 'File'], ['Sasaran', 'Goal'],
  ['KPI', 'KPI'], ['Mutasi', 'Movement'], ['Notifikasi', 'Notification'], ['Pengajuan lembur', 'Overtime request'],
  ['Pengaturan penggajian', 'Payroll setting'], ['Siklus penilaian kinerja', 'Performance cycle'], ['Penilaian kinerja', 'Performance review'],
  ['Jabatan', 'Position'], ['Status PTKP', 'PTKP status'], ['PTKP', 'PTKP'], ['Aturan keamanan', 'Security rule'],
  ['Lapisan pajak', 'Tax bracket'], ['Konfigurasi pajak', 'Tax configuration'], ['Templat', 'Template'], ['Lokasi kerja', 'Work location'],
  ['Pengumuman', 'Announcement'], ['Kategori dokumen', 'Document category'], ['Mutasi karyawan', 'Employee movement'],
  ['Templat formulir', 'Form template'], ['Penyesuaian penggajian', 'Payroll adjustment'], ['Log audit', 'Audit log'],
  ['Atasan', 'Manager'], ['Kategori induk', 'Parent category'], ['Perusahaan induk', 'Parent company'], ['Departemen induk', 'Parent department'],
];
for (const [id, en] of missingResources) entries.push([`${id} tidak ditemukan`, `${en} not found`]);
// These two calls pass a sentence to NotFoundError, which appends another suffix.
backendEntries.push(
  'Slip gaji tidak ditemukan atau belum disetujui|Payslip not found or not yet approved|Payslip not found or not yet approved not found',
  'Karyawan tidak ditemukan atau belum ditugaskan ke perusahaan|Employee not found or not assigned to a company|Employee not found or not assigned to a company not found',
);
export const errors: Record<string, MessagePair> = {};
for (const pair of Object.values(rolesErrorMessages)) for (const source of pair) errors[source] = pair;
for (const pair of entries) for (const source of pair) errors[source] ??= pair;
for (const row of backendEntries) {
  const [id, en, alias] = row.split('|');
  const pair: MessagePair = [id, en];
  for (const source of [id, en, alias]) if (source) errors[source] ??= pair;
}

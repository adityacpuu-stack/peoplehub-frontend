import type { MessagePair } from './index';

// Explicit application-owned copy. Both language spellings are exact source aliases.
const entries: MessagePair[] = `
% dari|% of
% dari Gaji Pokok|% of Basic Salary
% dari Gaji Bruto|% of Gross Salary
* BPJS karyawan ditanggung perusahaan sesuai kebijakan payroll.|* Employee BPJS contributions are covered by the company according to payroll policy.
* Tunjangan Jabatan|* Position Allowance
- Gaji Pokok:|- Basic Salary:
- Tarif per Jam:|- Hourly Rate:
. Belum menjadi payroll atau pembayaran tersimpan.|. Payroll and payments have not been saved yet.
. Nominal berikut adalah komponen tersimpan, bukan perhitungan ulang potongan.|. The amounts below are saved components, not recalculated deductions.
0 karyawan|0 employees
0 payroll|0 payroll records
1,0x (Normal)|1.0x (Normal)
1,5x (Hari Kerja)|1.5x (Weekday)
2,0x (Akhir Pekan)|2.0x (Weekend)
3,0x (Hari Libur)|3.0x (Holiday)
= nilai PPh21 yang dibayar perusahaan (skema gross-up)|= PPh21 paid by the company (gross-up scheme)
Tambah Tunjangan|Add Allowance
Tambah Lembur|Add Overtime
Tambah Catatan Lembur|Add Overtime Record
Tambahkan informasi lain jika diperlukan|Add any additional information if needed
Rincian Tambahan (Opsional)|Additional Details (Optional)
Aksi|Actions
Alasan|Reason
Alasan aturan perusahaan|Company rule reason
Alasan penahanan|Hold reason
Alasan penahanan pembayaran|Payment hold reason
Alasan persiapan|Preparation reason
Alasan perubahan penahanan|Reason for changing the hold
Semua Perusahaan (Global)|All Companies (Global)
Tunjangan|Allowance
Tunjangan berhasil ditambahkan|Allowance created successfully
Tunjangan berhasil dihapus|Allowance deleted successfully
Tunjangan berhasil diperbarui|Allowance updated successfully
Nominal (Rp)|Amount (Rp)
Setujui|Approve
Setujui (|Approve (
Disetujui Oleh|Approved By
Aturan perusahaan|Company rules
Dihitung otomatis|Auto-calculated
BPJS|BPJS
BPJS (Ditanggung Perusahaan)|BPJS (Company-funded)
BPJS (Karyawan)|BPJS (Employee)
BPJS OLEH KARYAWAN|BPJS BY EMPLOYEE
BPJS JHT (2%)|BPJS JHT (2%)
BPJS JHT karyawan|Employee BPJS JHT
BPJS JHT perusahaan|Company BPJS JHT
BPJS JKK perusahaan|Company BPJS JKK
BPJS JKM perusahaan|Company BPJS JKM
BPJS JP (1%)|BPJS JP (1%)
BPJS JP karyawan|Employee BPJS JP
BPJS JP perusahaan|Company BPJS JP
BPJS Kesehatan (1%)|BPJS Kesehatan (1%)
BPJS Kesehatan karyawan|Employee BPJS Kesehatan
BPJS Kesehatan perusahaan|Company BPJS Kesehatan
Objek BPJS|BPJS Object
Objek BPJS PPh21|BPJS Object PPh21
PEMBAYARAN BPJS OLEH PERUSAHAAN|BPJS PAYMENT BY COMPANY
BPJS dan pembulatan|BPJS and rounding
BPJS karyawan ditanggung perusahaan|Employee BPJS covered by the company
BPJS karyawan ditanggung perusahaan —|Employee BPJS covered by the company —
Objek BPJS|BPJS object
Gaji Pokok|Basic Salary
Gaji Pokok (Diterima Karyawan)|Basic Salary (Received by Employee)
Batalkan perubahan aturan|Discard rule changes
Bayar|Pay
Bayar (|Pay (
Belum ada aturan perusahaan tersimpan. Saran isian aturan belum diterapkan.|No company rules have been saved. The suggested rules have not been applied.
Belum ada data yang cocok|No matching records
Berakhir Pada|Ends On
Berulang|Recurring
Biaya Perusahaan|Company Cost
Biaya perusahaan|Company cost
Boleh negatif untuk refund. Pilih mode Tetap atau Tanpa tunjangan.|Negative values are allowed for refunds. Select Fixed or No allowance mode.
Bonus bruto|Gross bonus
Deskripsi singkat...|Brief description...
Bulanan|Monthly
Nominal Perhitungan|Calculated Amount
Perhitungan|Calculation
Dasar Perhitungan|Calculation Base
Rincian Perhitungan|Calculation Breakdown
Cari data|Search records
Cari karyawan|Search employees
Cari karyawan...|Search employees...
Cari nama atau ID karyawan…|Search employee name or ID…
Pilih Perusahaan|Choose Company
Cicilan|Installments
Cicilan per Bulan (Rp)|Monthly Installment (Rp)
Cicilan per Bulan (Rp) *|Monthly Installment (Rp) *
Coba lagi company|Retry companies
Coba lagi cutoff|Retry cutoff
Coba muat ulang untuk melihat data terbaru.|Reload to see the latest records.
Coba nama atau ID lain, atau ubah tahap payroll.|Try another name or ID, or change the payroll stage.
Coba ubah pencarian atau filter yang dipilih.|Try changing your search or selected filters.
Perusahaan *|Company *
Perusahaan payroll|Company payroll
Kontrak / OL|Contract / OL
Buat|Create
Membuat...|Creating...
Cutoff belum tersedia|Cutoff unavailable
Cutoff payroll gagal dimuat. Export menunggu cutoff yang sesuai.|Payroll cutoff could not be loaded. Export requires the correct cutoff.
Cutoff tanggal|Cutoff date
Daftar company gagal dimuat.|Could not load companies.
Daftar karyawan gagal dimuat.|Could not load employees.
Harian|Daily
Dari gaji pokok|Based on basic salary
Dari gross salary|Based on gross salary
Dasar BPJS|BPJS base
Data belum dapat dimuat|Could not load records
Data payroll berhasil diekspor ke Excel|Payroll data exported to Excel
Data payroll berubah. Muat ulang sebelum melanjutkan persiapan.|Payroll data has changed. Reload before continuing preparation.
Data payroll semua company berhasil diekspor ke Excel|Payroll data for all companies exported to Excel
Tanggal *|Date *
Default: 1,0x (tarif normal)|Default: 1.0x (normal rate)
Departemen|Department
Detail Pinjaman / Kasbon|Loan / Salary Advance Details
Detail freelance & internship|Freelance & internship details
Detail payroll|Payroll details
Ditahan|On hold
Ditanggung Perusahaan|Company-funded
Ditanggung karyawan|Employee-funded
Ditanggung perusahaan|Company-funded
Ditolak:|Rejected:
Durasi|Duration
Edit Tunjangan|Edit Allowance
Edit Potongan|Edit Deduction
Tanggal Efektif|Effective Date
Tarif Efektif|Effective Rate
ID Karyawan|Employee ID
Karyawan Terpilih|Employee Selected
Karyawan wajib dipilih untuk tunjangan berbasis persentase|Employee is required for percentage-based allowances
Tanggal Akhir (Opsional)|End Date (Optional)
Estimasi|Estimate
Estimasi dari data karyawan aktif ·|Estimate from active employee data ·
Estimasi fee, uang saku, dan pajak berdasarkan data karyawan aktif.|Estimate fees, stipends, and tax from active employee data.
Estimasi pembayaran company ini|Estimated payments for this company
Estimasi, belum menjadi payroll tersimpan|Estimate; payroll has not been saved
Estimasi Total|Estimated Total
Eksisting|Existing
Export Company Ini|Export This Company
Ekspor Excel|Export Excel
Export Semua Company|Export All Companies
Export berhasil! File Excel sedang didownload.|Export successful! Downloading the Excel file.
Export semua company yang diakses|Export all accessible companies
Faktor|Factor
Gagal memperbarui status|Failed to update status
Filter kompensasi|Filter compensation
Filter pajak|Tax filter
Filter periode|Period filter
Filter status|Status filter
Filter tipe|Type filter
Nominal Tetap|Fixed Amount
Rumus: Gross Up = Gaji Pokok ÷ 0,975, PPh21 = Gross Up × 2,5%|Formula: Gross Up = Basic Salary ÷ 0.975, PPH21 = Gross Up × 2.5%
Pekerja Lepas|Freelance
Frekuensi|Frequency
GOL|GOL
GROSS UP|GROSS UP
GROSS UP FINAL|FINAL GROSS UP
Gagal approve payroll|Could not approve payroll
Gagal export data|Could not export data
Gagal membayar payroll|Could not pay payroll
Gagal memuat company.|Could not load companies.
Gagal memuat data karyawan.|Could not load employee data.
Gagal memuat detail payroll. Coba lagi.|Could not load payroll details. Try again.
Gagal memuat payroll. Data periode ini belum tersedia.|Could not load payroll. Data for this period is unavailable.
Gagal memvalidasi payroll|Could not validate payroll
Gagal submit payroll|Could not submit payroll
Gaji bruto|Gross salary
Gaji dan hari kerja|Salary and working days
Gaji pokok dibayar|Basic salary paid
Gaji pokok dibayar (override manual)|Basic salary paid (manual override)
Gaji/Fee Karyawan|Employee Salary/Fee
Buat Payroll|Generate Payroll
Generate hanya membuat payroll untuk|Payroll will only be generated for
Generate siap (|Generate ready (
Bruto|Gross
Gaji Bruto|Gross Salary
Gross Up (÷ 0,975)|Gross Up (÷ 0.975)
Perhitungan Gross Up:|Gross Up Calculation:
Gross Up Akhir|Gross Up Final
Gross Up Awal|Gross Up Initial
Gunakan pajak eksternal / refund|Use external tax / refund
Gunakan total pajak eksternal termasuk bonus|Use total external tax including bonus
Halaman berikutnya|Next page
Halaman sebelumnya|Previous page
Hanya payroll Approved / Paid. Semua company mengikuti akses akun.|Approved / Paid payroll only. Companies are restricted to account access.
Hapus persiapan periode ini|Delete preparation for this period
Hari|Days
Hari Hadir|Days Present
Hari Kerja|Working Days
Hari kerja aturan perusahaan|Company rule working days
Hari kerja per minggu|Working days per week
Harus lebih dari 0; pilih mode pajak Tetap atau Tanpa tunjangan. Server menolak bonus jika sudah ada allowance bonus yang disetujui.|Must exceed 0; select Fixed or No allowance tax mode. The server rejects a bonus if an approved bonus allowance already exists.
Hasil generate dari server|Generation results from the server
Hasil generate payroll|Payroll generation results
Hasil preview dari server|Preview results from the server
Hari Libur|Holiday
Hari Libur (|Holiday (
Tarif per Jam|Hourly Rate
Jam × Pengali|Hours × Multiplier
Info Kehadiran|Attendance Information
Magang|Internship
Isi seluruh delapan komponen, termasuk 0 bila nihil, serta referensi perhitungan HR untuk periode ini.|Enter all eight components, including 0 where none applies, and the HR calculation reference for this period.
JHT|JHT
JHT (3,7%)|JHT (3.7%)
JKK|JKK
JKM|JKM
JKS|JKS
JP|JP
JP (2%)|JP (2%)
Jam|Hours
Jam / Nominal|Hours / Amount
Jenis karyawan|Employee type
Jumlah|Amount
Jumlah (Rp)|Amount (Rp)
Jumlah (Rp) *|Amount (Rp) *
Jumlah Cicilan:|Number of Installments:
Jumlah harus diisi|Amount is required
Karyawan gagal (|Failed employees (
Karyawan harus dipilih|Select an employee
Kategori|Category
Kategori TER|TER Category
Kebijakan dan pembayaran payroll|Payroll policy and payments
Kebijakan dan pembayaran tersimpan|Saved policy and payments
Kelola potongan, pinjaman, dan cicilan karyawan.|Manage employee deductions, loans, and installments.
Kelola tunjangan karyawan, penerima, dan periode berlakunya.|Manage employee allowances, recipients, and effective periods.
Kesehatan (4%)|Health (4%)
Keterangan|Details
Keterangan potongan...|Deduction details...
Kompensasi Magang|Internship Compensation
Komponen BPJS dari perhitungan HR|BPJS components from HR calculations
Kosong: server menghitung prorata. Nilai 0 adalah override yang sah.|Leave blank for server-calculated proration. A value of 0 is a valid override.
Lanjutan: bonus dan penahanan pembayaran|Advanced: bonus and payment holds
Lanjutan: komponen BPJS HR|Advanced: HR BPJS components
Legacy mempertahankan pembulatan lama. Final dua desimal mempertahankan presisi kalkulasi mentah (raw) sampai pembulatan akhir ke 0,01 rupiah.|Legacy preserves the old rounding method. Final two decimals preserves raw calculation precision until final rounding to 0.01 rupiah.
Lembur (|Overtime (
Lepaskan penahanan|Release hold
Lihat Detail|View Details
Lihat status persetujuan dan sisa cicilan sebelum memperbarui potongan.|Review approval status and remaining installments before updating a deduction.
Membuat payroll…|Generating payroll…
Memuat aturan perusahaan…|Loading company rules…
Memuat company…|Loading companies…
Memuat data…|Loading data…
Memuat estimasi payroll…|Loading payroll estimates…
Memuat karyawan…|Loading employees…
Memuat payroll…|Loading payroll…
Memuat persiapan…|Loading preparation…
Memuat preview dari server…|Loading preview from the server…
Memuat preview semua karyawan…|Loading preview for all employees…
Memuat…|Loading…
Mengekspor…|Exporting…
Menunggu data terbaru|Waiting for updated data
Menyimpan aturan…|Saving rules…
Menyimpan persiapan…|Saving preparation…
Mode Tetap mengambil allowance bertipe Position yang telah disetujui, bukan nilai jabatan pada master karyawan. Nominal tersebut dialihkan menjadi tunjangan pajak agar tidak dihitung dua kali. Jika nominal sumber tidak tersedia, server melaporkan kesalahan per karyawan; nol hanya sah jika tercatat secara eksplisit.|Fixed mode uses approved Position allowances, not the position value in employee master data. The amount becomes a tax allowance to avoid double counting. If the source amount is unavailable, the server reports an error for each affected employee; zero is valid only when explicitly recorded.
Mode tunjangan pajak|Tax allowance mode
Total jam bulanan atau akumulasi jam|Monthly total or accumulated hours
Muat ulang|Reload
Muat ulang aturan|Reload rules
Muat ulang status penahanan|Reload hold status
Pengali|Multiplier
Nama *|Name *
Gaji Bersih|Net Salary
Neto|Nett
Baru / Bruto|New / Gross
Nilai berasal dari server. Nilai mentah (raw) sebelum pembulatan dipakai untuk pemeriksaan; pembayaran mengikuti kebijakan tersimpan. Final dua desimal membulatkan nilai akhir ke 0,01 rupiah.|Values come from the server. Raw values before rounding are used for review; payments follow the saved policy. Final two decimals rounds final values to 0.01 rupiah.
Tidak ada karyawan ditemukan|No employees found
No. Referensi|Reference No.
Nominal / Cicilan|Amount / Installments
Nominal / Periode|Amount / Period
Nominal dihitung dari data karyawan aktif dengan rumus estimasi yang tersedia. Halaman ini tidak mencatat persetujuan atau pembayaran. Export mencakup semua company yang dapat diakses, tanpa mengikuti filter company atau jenis karyawan di layar.|Amounts are calculated from active employee data using the available estimation formula. This page does not record approvals or payments. Export includes all accessible companies regardless of the company or employee type filters on screen.
Nominal tetap|Fixed amount
Nomor dokumen atau referensi keputusan HR/pajak.|Document number or HR/tax decision reference.
Tidak kena pajak|Non-taxable
Nonaktifkan mulai periode ini|Deactivate from this period
OBJEK PPh21|OBJECT PPH21
Sekali Bayar|One Time
Opsional, harus lebih dari 0.|Optional; must exceed 0.
Opsional. Terisi berarti pembayaran ditahan sesuai hasil server.|Optional. When entered, payment is held according to the server result.
Opsional: keputusan HR untuk satu karyawan pada periode ini saja. Refund, pajak eksternal, dan pengecualian BPJS tidak dibawa ke periode berikutnya. Isian kosong mengikuti aturan payroll yang berlaku. Nominal manual maksimal dua desimal, kecuali mode Bulatkan total akhir (HR).|Optional: HR decisions for one employee in this period only. Refunds, external tax, and BPJS exceptions do not carry forward. Blank fields follow the applicable payroll rules. Manual amounts allow up to two decimals, except in Round final total (HR) mode.
Detail Lembur|Overtime Detail
Rincian Lembur|Overtime Details
Pengajuan lembur disetujui|Overtime request approved
Pengajuan lembur ditolak|Overtime request rejected
Lembur diajukan. Persetujuan diperlukan sebelum masuk payroll.|Overtime submitted. Approval is required before payroll.
PPh21|PPh21
PPH21|PPH21
PPh 21 (Dibayar Perusahaan)|PPh 21 (Company Pays)
PPh 21 (Perusahaan)|PPh 21 (Company)
PPh21 (Ditanggung Perusahaan)|PPh21 (Company-funded)
STATUS PTKP|PTKP STATUS
Pajak diterapkan|Applied tax
Pajak eksternal|External tax
Pajak hasil kalkulasi|Calculated tax
Pantau lembur karyawan dan status persetujuan per periode payroll.|Monitor employee overtime and approval status for each payroll period.
Manajemen Payroll|Payroll Management
Payroll berhasil diapprove|Payroll approved successfully
Payroll berhasil dibayar|Payroll paid successfully
Payroll berhasil disubmit|Payroll submitted successfully
Payroll berhasil divalidasi|Payroll validated successfully
Payroll otomatis|Automatic payroll
Payroll otomatis untuk semua karyawan|Automatic payroll for all employees
Payroll sudah tersedia untuk karyawan dan periode ini. Persiapan hanya dapat dibaca dan tidak dapat ditimpa.|Payroll already exists for this employee and period. Preparation is read-only and cannot be overwritten.
Perlakuan payroll|Payroll treatment
Pembayaran|Payments
Pembayaran bonus|Bonus payment
Pembayaran reguler|Regular payment
Pembayaran tersimpan|Saved payments
Pembulatan|Rounding
Pembulatan aturan perusahaan|Company rule rounding
Penahanan pembayaran|Payment hold
Penerima|Recipient
Pengecualian karyawan belum disimpan. Simpan atau buang isian sebelum preview semua karyawan.|Employee exceptions are unsaved. Save or discard them before previewing all employees.
Pengecualian periode ini|Exceptions for this period
Penghasilan|Earnings
Per Hari|Per Day
Per Jam|Per Hour
Per Kuartal|Quarterly
Per Project|Per Project
Perbarui|Update
Persentase (%)|Percentage (%)
Perhitungan Fee|Fee Calculation
Perhitungan Pajak (PPh 21 Final - Gross Up)|Tax Calculation (Final PPh21 - Gross Up)
Periode|Period
Periode & keterangan|Period & details
Periode Gaji|Salary Period
Periode freelance dan internship|Freelance and internship period
Periode payroll|Payroll period
Periode persiapan|Preparation period
Persiapan Payroll|Payroll Preparation
Perubahan aturan belum disimpan. Simpan atau batalkan perubahan sebelum preview.|Rule changes are unsaved. Save or discard changes before previewing.
Perubahan belum disimpan. Mengganti pilihan akan membuang isian yang belum disimpan.|Changes are unsaved. Changing the selection will discard unsaved entries.
Perusahaan persiapan|Preparation company
Pilih company|Select company
Pilih company terlebih dahulu|Select a company first
Pilih minimal 1 payroll|Select at least one payroll record
Pilih periode yang valid.|Select a valid period.
Pilih perusahaan dan periode, preview semua karyawan, lalu generate hasil yang siap. Tidak perlu memilih atau menyimpan karyawan satu per satu.|Select a company and period, preview all employees, then generate the ready results. There is no need to select or save employees individually.
Pilih semua hasil filter|Select all filtered results
Pilih tahap lain atau klik Generate Payroll untuk meninjau payroll periode ini.|Select another stage or click Generate Payroll to review this period's payroll.
Lengkapi kolom wajib|Please fill in required fields
Porsi karyawan|Employee share
Porsi karyawan:|Employee share:
Porsi perusahaan|Company share
Potongan & cicilan|Deductions & installments
Potongan / Karyawan|Deduction / Employee
Potongan Absen|Absence Deduction
Potongan Berulang (Recurring)|Recurring Deduction
Potongan Lain|Other Deduction
Potongan Lainnya|Other Deductions
Potongan Pinjaman|Loan Deduction
Potongan Telat|Lateness Deduction
Potongan berhasil dihapus|Deduction deleted successfully
Potongan berhasil diperbarui|Deduction updated successfully
Potongan berhasil disetujui|Deduction approved successfully
Potongan berhasil ditambahkan|Deduction created successfully
Potongan berhasil ditolak|Deduction rejected successfully
Preview belum tersedia sampai aturan berhasil dimuat.|Preview is unavailable until rules load successfully.
Preview ini belum membuat payroll. Gunakan Preview semua karyawan di atas, lalu Generate siap dalam dialog ini. Generate memakai pengecualian tersimpan untuk periode yang sama.|This preview has not created payroll. Use Preview all employees above, then Generate ready in this dialog. Generation uses saved exceptions for the same period.
Preview memakai data dan aturan tersimpan dari server. Tanpa aturan perusahaan tersimpan, payroll otomatis yang sudah ada tetap berjalan. Input per karyawan bersifat opsional.|Preview uses saved server data and rules. Existing automatic payroll continues without saved company rules. Individual employee inputs are optional.
Preview payroll|Payroll preview
Preview payroll dari server|Payroll preview from the server
Preview semua karyawan|Preview all employees
Diproses|Processed
Sedang diproses|Processing
Memproses...|Processing...
Progress cicilan|Installment progress
Prorata|Prorate
Templat Cepat|Quick Template
Tarif|Rate
Alasan & catatan|Reason & notes
Alasan *|Reason *
Referensi komponen BPJS HR|HR BPJS component reference
Referensi pajak|Tax reference
Referensi pajak eksternal|External tax reference
Referensi total pajak bonus|Total bonus tax reference
Refund, pajak eksternal, dan pengecualian BPJS hanya berlaku pada periode pengecualian; tidak dibawa ke periode berikutnya.|Refunds, external tax, and BPJS exceptions apply only to the exception period and do not carry forward.
Register freelance dan internship|Freelance and internship register
Register payroll|Payroll register
Reguler dan bonus adalah rincian total payroll yang disetujui bersama. Rincian ini bukan status pembayaran bonus terpisah.|Regular and bonus payments are components of the total payroll approved together. They do not represent a separate bonus payment status.
Tolak|Reject
Alasan Penolakan|Rejection Reason
Rentang periode|Period range
Reset filter|Reset filters
Rincian BPJS tersimpan|Saved BPJS breakdown
Ringkasan Pinjaman|Loan Summary
Ringkasan estimasi|Estimate summary
Ringkasan payroll|Payroll summary
Ringkasan periode|Period summary
Rp 0|Rp 0
SUB TOTAL|SUB TOTAL
Jadwal|Schedule
Cari karyawan...|Search employee...
Sekali bayar|One-time payment
Pilih Karyawan|Select Employee
Pilih templat untuk mengisi otomatis...|Select a template to auto-fill...
Pilih perusahaan dahulu|Select company first
Pilih tanggal dalam periode payroll|Select date within payroll period
Selesai|Completed
Selisih pembulatan|Rounding adjustment
Semua Perusahaan|All Companies
Semua company|All companies
Semua jenis|All types
Semua jenis · Tanpa filter pencarian|All types · No search filter
Semua status|All statuses
Semua status pajak|All tax statuses
Semua status · Tanpa filter pencarian|All statuses · No search filter
Semua tipe|All types
Sertakan bonus|Include bonus
Simpan & preview|Save & preview
Simpan aturan perusahaan|Save company rules
Simpan persiapan|Save preparation
Simpan sekali untuk berlaku mulai|Save once to apply from
Sisa|Remaining
Status PTKP|PTKP Status
Status gaji:|Salary status:
Status pembayaran|Payment status
Status diperbarui|Status updated
Ajukan|Submit
Ajukan (|Submit (
Ajukan untuk Persetujuan|Submit for Approval
Diajukan|Submitted
Sudah dibayar|Already paid
Sumber|Source
Sumber aturan perusahaan|Company rule source
Sumber pajak|Tax source
GAJI DITERIMA (THP)|TAKE HOME PAY (THP)
TER|TER
TER FINAL|FINAL TER
Tarif TER|TER Rate
Tarif TER Akhir|TER Rate Final
Tarif TER Awal|TER Rate Initial
TOTAL BIAYA PERUSAHAAN|TOTAL COST COMPANY
TOTAL BRUTO|TOTAL GROSS
Tabel payroll, geser untuk kolom lainnya|Payroll table, scroll for more columns
Tabel pembayaran, geser untuk kolom lainnya|Payments table, scroll for more columns
Tahan atau lepaskan pembayaran total payroll. Tindakan ini menyimpan status dan alasan tanpa mengubah nominal. Payroll yang ditahan belum dapat ditandai dibayar.|Hold or release the total payroll payment. This saves the status and reason without changing amounts. Payroll on hold cannot be marked paid.
Tahan pembayaran|Hold payment
Tahap payroll|Payroll stage
Tahunan|Yearly
Gaji Diterima|Take Home
Gaji Diterima|Take Home Pay
Tambah Potongan|Add Deduction
Tanggal / Jenis|Date / Type
Tarif PPh 21|PPh21 Rate
Kena pajak|Taxable
Kena pajak (PPh21)|Taxable (PPh 21)
Terkunci: bagian dari Contract / OL|Locked: part of Contract / OL
Terlambat|Late
Tidak Hadir|Absent
Tidak ada company|No companies
Tidak ada data freelance/internship untuk diexport|No freelance/internship data to export
Tidak ada karyawan|No employees
Tidak ada karyawan sesuai filter|No employees match the filters
Tidak ada karyawan untuk perusahaan dan periode ini.|No employees for this company and period.
Tidak ada karyawan yang dapat dipreview untuk perusahaan dan periode ini.|No employees available for preview for this company and period.
Tidak ada payroll dengan status Approved/Paid. Approve payroll terlebih dahulu sebelum export.|No Approved/Paid payroll records. Approve payroll before exporting.
Tidak ada payroll di tahap ini|No payroll records at this stage
Tidak ditahan|Not on hold
Tidak ikut generate|Excluded from generation
Tidak ikut generate karena preview gagal|Excluded from generation because preview failed
Waktu|Time
Tinjau perhitungan, persetujuan, dan pembayaran gaji per periode.|Review salary calculations, approvals, and payments by period.
Tipe Potongan|Deduction Type
Tipe Potongan *|Deduction Type *
Tipe Rate|Rate Type
Total|Total
Total Nominal Tunjangan|Total Allowance Amount
Total Nominal|Total Amount
Total BPJS|Total BPJS
Total BPJS karyawan|Total employee BPJS
Total BPJS perusahaan|Total company BPJS
Total Biaya Perusahaan|Total Company Cost
Total Biaya Perusahaan|Total Cost to Company
Total Fee|Total Fee
Total Jam|Total Hours
Total Jam *|Total Hours *
Total Pinjaman|Total Loan
Total Pinjaman (Rp)|Total Loan (Rp)
Total Pinjaman (Rp) *|Total Loan (Rp) *
Total Potongan|Total Deductions
Total Potongan BPJS|Total BPJS Deductions
Total Take Home Pay siap|Total ready take-home pay
Total biaya perusahaan siap|Total ready company cost
Total gross|Total gross
Total pajak bulan termasuk bonus, bukan selisih. Boleh negatif.|Total monthly tax including bonus, not the difference. Negative values are allowed.
Total pajak eksternal termasuk bonus|Total external tax including bonus
Total pembayaran|Total payments
Total pinjaman dan cicilan per bulan harus diisi|Total loan and monthly installment are required
Total take home pay|Total take-home pay
Tunjangan Contract / OL dikunci dan tidak dapat diubah dari daftar ini.|Contract / OL allowances are locked and cannot be changed from this list.
Tunjangan Jabatan|Position Allowance
Tunjangan Lainnya|Other Allowances
Tunjangan Makan|Meal Allowance
Tunjangan Transport|Transport Allowance
Tunjangan kontrak terkunci|Contract allowance locked
Tunjangan pajak|Tax allowance
Tunjangan pajak tetap|Fixed tax allowance
Tutup menu|Close menu
Tipe *|Type *
Uang Makan|Meal Payment
Uang Saku|Stipend
Uang Saku + Tunjangan|Stipend + Allowances
Uang Transport|Transport Payment
Ubah penahanan pembayaran|Change payment hold
Ubah pencarian atau jenis karyawan.|Change your search or employee type.
Validasi|Validate
Validasi (|Validate (
Divalidasi|Validated
Wajib diisi pada mode Tetap. Isi 0 secara eksplisit bila nihil.|Required in Fixed mode. Explicitly enter 0 when none applies.
Wajib untuk keputusan HR periode ini, termasuk override prorata manual.|Required for HR decisions for this period, including manual proration overrides.
Hari Kerja|Weekday
Hari Kerja (|Weekday (
Akhir Pekan|Weekend
Akhir Pekan (|Weekend (
Mingguan|Weekly
bulan|months
perusahaan|company
dan periode berikutnya. Saran awal belum aktif sampai disimpan. Menonaktifkan aturan mulai periode pilihan mempertahankan riwayat sebelumnya.|and subsequent periods. Suggested defaults are inactive until saved. Deactivating rules from the selected period preserves earlier history.
contoh: 4000000|e.g. 4000000
contoh: 500000|e.g. 500000
contoh: 54|e.g., 54
contoh: Cicilan, Denda|e.g., Cicilan, Denda
contoh: LOAN-2024-001|e.g., LOAN-2024-001
contoh: Penyelesaian tenggat proyek|e.g., Project deadline completion
contoh: Tunjangan Transportasi|e.g., Tunjangan Transportasi
hari|days
jam|hours
jam ×|hours ×
jam)|hours)
karyawan gagal|failed employees
karyawan siap ·|employees ready ·
karyawan yang berhasil dipreview. Seluruh karyawan gagal ditampilkan di atas dan tidak ikut digenerate.|employees successfully previewed. All failed employees are listed above and excluded from generation.
pajak|tax
payroll|payroll records
payroll berhasil dibuat ·|payroll records generated ·
periode|period
proyek|project
s.d.|to
status|status
tipe|type
x|x
x)|x)
· Berlaku mulai|· Effective from
· Biaya perusahaan|· Company cost
· Gaji pokok tercatat:|· Recorded basic salary:
· Pilih semua mencakup seluruh hasil filter|· Select all includes all filtered results
· THP|· THP
×|×
 · {value0} dipilih| · {value0} selected
5 hari|5 days
6 hari|6 days
Alasan ini akan disimpan bersama penolakan.|This reason will be saved with the rejection.
Alasan penolakan:|Rejection reason:
Setujui lembur {value0}|Approve overtime {value0}
Setujui potongan {value0}|Approve deduction {value0}
Yakin ingin menghapus tunjangan ini?|Are you sure you want to delete this allowance?
Aturan dinonaktifkan mulai {value0}. Riwayat aturan tetap tersimpan.|Rules deactivated from {value0}. Rule history is preserved.
Aturan perusahaan nonaktif mulai {value0}. Payroll otomatis yang sudah ada tetap berlaku.|Company rules are inactive from {value0}. Existing automatic payroll remains in effect.
Aturan perusahaan tersimpan, berlaku mulai {value0}.|Company rules saved, effective from {value0}.
Aturan tersimpan mulai {value0}. Preview ulang untuk melihat hasilnya.|Rules saved from {value0}. Preview again to see the results.
Bulatkan total akhir (HR)|Round final total (HR)
Cari karyawan pada halaman ini…|Search employees on this page…
Cari nama tunjangan…|Search allowance names…
Cari potongan…|Search deductions…
Cutoff: {value0}|Cutoff: {value0}
Daftar payroll gagal diperbarui. Muat ulang halaman sebelum melanjutkan.|Could not refresh the payroll list. Reload the page before continuing.
Daftar {value0}|{value0} list
Hapus tunjangan|Delete allowance
Detail lembur {value0}|Detail overtime {value0}
Detail {value0}|Details for {value0}
Draft & perhitungan|Draft & calculation
Edit potongan {value0}|Edit deduction {value0}
Edit {value0}|Edit {value0}
Gagal menyetujui|Failed to approve
Gagal membuat lembur|Failed to create overtime
Gagal menghapus tunjangan|Failed to delete allowance
Gagal menolak|Failed to reject
Gagal menyimpan tunjangan|Failed to save allowance
Final dua desimal|Final two decimals
BRUTO|GROSS
Gagal memuat aturan perusahaan.|Could not load company rules.
Gagal memuat persiapan.|Could not load preparation.
Gagal mengekspor data|Could not export data
Gagal menghapus potongan|Could not delete deduction
Gagal menyimpan potongan|Could not save deduction
Generate gagal.|Generation failed.
Hapus potongan|Delete deduction
Hapus potongan {value0}|Delete deduction {value0}
Hapus {value0}|Delete {value0}
Hasil generate belum terkonfirmasi. Muat ulang halaman dan preview ulang sebelum mencoba lagi.|Generation results are unconfirmed. Reload the page and preview again before retrying.
Hasil generate belum terkonfirmasi. Periksa daftar payroll dan preview ulang sebelum mencoba lagi.|Generation results are unconfirmed. Check the payroll list and preview again before retrying.
Jam harus antara {value0} dan {value1}|Hours must be between {value0} and {value1}
Karyawan #{value0}|Employee #{value0}
Ketik nama atau ID...|Type name or ID...
Legacy (pembulatan lama)|Legacy (old rounding)
Lembur disetujui|Approved overtime
Menunggu persetujuan|Awaiting approval
Nominal aktif|Active amount
Nominal disetujui|Approved amount
Nominal tersimpan pada halaman ini|Saved amounts on this page
Pada halaman ini|On this page
Payroll sudah tersedia. Persiapan terkunci; muat ulang data.|Payroll already exists. Preparation is locked; reload the data.
Pembayaran selesai|Payment complete
Pengajuan ditemukan|Requests found
Pengajuan perlu disetujui sebelum masuk payroll.|Requests must be approved before inclusion in payroll.
Periksa isian aturan perusahaan.|Check the company rule fields.
Periksa isian persiapan.|Check the preparation fields.
Periode belum ditentukan|Period not specified
Persiapan dihapus. Pengaturan payroll berlaku kembali.|Preparation deleted. Payroll settings apply again.
Persiapan karyawan untuk periode ini tersimpan.|Employee preparation for this period saved.
Persiapan payroll gagal.|Payroll preparation failed.
Persiapan tersimpan, tetapi preview belum berhasil.|Preparation saved, but preview was unsuccessful.
Perubahan penahanan gagal.|Could not change the hold.
Pilih karyawan|Select employee
Pilih perusahaan|Select company
Pilih {value0}|Select {value0}
Masukkan alasan penolakan:|Please enter rejection reason:
Potongan ditampilkan|Deductions displayed
Potongan karyawan|Employee deduction
Preview gagal. Coba preview lagi.|Preview failed. Try previewing again.
Preview tidak lengkap. Muat ulang lalu coba lagi.|Preview is incomplete. Reload and try again.
Preview ulang sebelum generate berikutnya. Hasil yang sudah dibuat tidak dikirim ulang dari preview ini.|Preview again before the next generation. Already generated results are not resubmitted from this preview.
Tolak lembur|Reject overtime
Tolak lembur {value0}|Reject overtime {value0}
Tolak potongan {value0}|Reject deduction {value0}
Respons preview tidak lengkap atau tidak konsisten. Generate diblokir; coba preview lagi.|Preview response is incomplete or inconsistent. Generation is blocked; preview again.
Respons preview tidak lengkap. Coba preview lagi.|Preview response is incomplete. Preview again.
Sesuai filter yang dipilih|Matching selected filters
Sesuai periode dan filter|Matching the period and filters
Siap dibayar|Ready for payment
Simpan aturan gagal.|Could not save rules.
Simpan belum terkonfirmasi. Coba simpan lagi atau muat ulang aturan sebelum preview.|Saving is unconfirmed. Save again or reload the rules before previewing.
Simpan belum terkonfirmasi. Muat ulang untuk memeriksa data server.|Saving is unconfirmed. Reload to check server data.
Tentukan karyawan, jenis potongan, dan periode berlakunya.|Select the employee, deduction type, and effective period.
Tentukan penerima dan komponen tunjangannya.|Select the recipient and allowance components.
Alasan akan dicatat bersama penolakan ini.|The reason will be recorded with this rejection.
Tidak ada karyawan yang cocok.|No matching employees.
Tolak potongan|Reject deduction
Tunjangan ditemukan|Allowances found
Tunjangan global|Global allowance
Tunjangan pajak {value0}|Tax allowance {value0}
Validasi & pengajuan|Validation & submission
Validasi|Validation
Yakin ingin menghapus potongan ini?|Are you sure you want to delete this deduction?
{value0} dari {value1} tunjangan|{value0} of {value1} allowances
{value0} ditampilkan · {value1} pengajuan|{value0} displayed · {value1} requests
{value0} jam pada halaman ini|{value0} hours on this page
{value0} payroll berhasil diapprove|{value0} payroll records approved
{value0} payroll berhasil dibayar|{value0} payroll records paid
{value0} payroll berhasil disubmit|{value0} payroll records submitted
{value0} payroll berhasil divalidasi|{value0} payroll records validated
{value0} payroll gagal diapprove|{value0} payroll records could not be approved
{value0} payroll gagal dibayar|{value0} payroll records could not be paid
{value0} payroll gagal disubmit|{value0} payroll records could not be submitted
{value0} payroll gagal divalidasi|{value0} payroll records could not be validated
{value0} potongan di halaman ini|{value0} deductions on this page
{value0}–{value1} dari {value2}|{value0}–{value1} of {value2}
Alasan aturan wajib diisi.|A rule reason is required.
Alasan aturan maksimal 1000 karakter.|The rule reason must not exceed 1000 characters.
Gross-up|Gross-up
Tetap dari allowance Position disetujui|Fixed from approved Position allowance
Tanpa tunjangan|No allowance
Ikuti pengaturan payroll|Follow payroll settings
Tetap|Fixed
Bulatkan total akhir (HR) mempertahankan presisi input mentah; total pembayaran akhir dibulatkan ke dua desimal. Sertakan alasan dan referensi perhitungan HR.|Round final total (HR) preserves raw input precision; the final payment total is rounded to two decimals. Include the reason and HR calculation reference.
BPJS Kesehatan karyawan (HR)|Employee BPJS Kesehatan (HR)
BPJS JHT karyawan (HR)|Employee BPJS JHT (HR)
BPJS JP karyawan (HR)|Employee BPJS JP (HR)
BPJS Kesehatan perusahaan (HR)|Company BPJS Kesehatan (HR)
BPJS JHT perusahaan (HR)|Company BPJS JHT (HR)
BPJS JP perusahaan (HR)|Company BPJS JP (HR)
BPJS JKK perusahaan (HR)|Company BPJS JKK (HR)
BPJS JKM perusahaan (HR)|Company BPJS JKM (HR)
Masukkan angka yang valid.|Enter a valid number.
Alasan persiapan wajib diisi.|A preparation reason is required.
Dasar BPJS harus lebih dari 0.|The BPJS base must exceed 0.
Referensi komponen BPJS wajib diisi.|A BPJS component reference is required.
Isi komponen BPJS minimal 0; semua komponen wajib diisi.|Enter at least 0 for every BPJS component; all components are required.
Gaji dibayar minimal 0.|Salary paid must be at least 0.
Isi tunjangan pajak tetap secara eksplisit, termasuk 0 bila nihil.|Explicitly enter the fixed tax allowance, including 0 when none applies.
Tunjangan tetap minimal 0.|Fixed allowance must be at least 0.
Pajak eksternal atau bonus memerlukan mode Tetap atau Tanpa tunjangan secara eksplisit; gross-up untuk bonus belum didukung.|External tax or bonus requires an explicit Fixed or No allowance mode; gross-up for bonuses is not supported yet.
Isi pajak eksternal, termasuk 0 bila nihil.|Enter external tax, including 0 when none applies.
Referensi pajak wajib diisi.|A tax reference is required.
Bonus harus lebih dari 0.|Bonus must exceed 0.
Isi total pajak eksternal.|Enter total external tax.
Referensi total pajak wajib diisi.|A total tax reference is required.
 · Terkunci| · Locked
Kedaluwarsa|Expired
Transportasi|Transport
Makan|Meal
Perumahan|Housing
Komunikasi|Communication
Kesehatan|Health
Giliran Kerja|Shift
Kerja Jarak Jauh|Remote
THR|THR
Bonus|Bonus
Lainnya|Other
Denda/Penalty|Penalty
Pinjaman|Loan
Kasbon|Salary Advance
Penggantian Biaya|Reimbursement
Koreksi|Correction
Insentif|Incentive
Komisi|Commission
Dihitung|Calculated
Eksternal|External
Total eksternal|External total
Tunjangan Transportasi|Transportation Allowance
Tunjangan Perumahan|Housing Allowance
Tunjangan Komunikasi|Communication Allowance
Tunjangan Kesehatan|Medical Allowance
Tunjangan Kehadiran|Attendance Allowance
Tunjangan Shift|Shift Allowance
Tunjangan Remote|Remote Work Allowance
THR (Tunjangan Hari Raya)|THR (Religious Holiday Allowance)
Belum diisi|Not entered
Nol final|Final zero
Masuk draft payroll|In draft payroll
Aksi gagal diproses|The action could not be processed
{value0} baris gagal: {value1}|{value0} rows failed: {value1}
Tunjangan OL|OL allowances
Berlaku di halaman ini|In effect on this page
Disetujui dan berulang setiap periode|Approved and recurring every period
Perlu ditinjau|Needs review
Tunjangan lama tanpa klasifikasi|Legacy allowances without classification
Belum diajukan|Not submitted yet
Diajukan HR|Submitted by HR
Nominal disetujui, belum tentu sudah dibayar|Approved amount, not necessarily paid yet
Belum ada pengajuan periode ini|No submissions for this period yet
Tunjangan kontrak / OL berlaku berulang sampai diubah; insentif bulanan dicatat per periode payroll dan tidak terbawa ke bulan berikutnya.|Contract / OL allowances recur until changed; monthly incentives are recorded per payroll period and never carry over to the next month.
Tambah tunjangan OL|Add OL allowance
Tambah insentif|Add incentive
Jenis tunjangan|Allowance kind
Tunjangan Kontrak / OL|Contract / OL Allowances
Insentif Bulanan|Monthly Incentives
Tampilan insentif|Incentive view
Cari karyawan atau tunjangan…|Search employee or allowance…
{value0} dari {value1} baris|{value0} of {value1} rows
Periode {value0}: periode baru selalu dimulai kosong. Nominal dan persetujuan bulan sebelumnya tidak dibawa; riwayat tetap tersedia lewat pilihan periode dan tombol riwayat.|Period {value0}: a new period always starts empty. Previous amounts and approvals are not carried over; history stays available through the period selector and the history button.
Tunjangan lama di bawah ini belum diklasifikasikan. Pembayarannya tetap seperti sebelumnya sampai HR menandainya sebagai OL atau mengakhirinya. Tidak ada klasifikasi otomatis.|The legacy allowances below are not classified yet. They keep being paid as before until HR marks them as OL or ends them. Nothing is classified automatically.
Tunjangan yang sudah disetujui atau dipakai payroll tidak diedit; buat versi baru yang berlaku mulai periode payroll yang belum dibuat.|Approved or payroll-used allowances are not edited; create a new version effective from a payroll period not yet generated.
Aksi terpilih|Selected actions
{value0} dipilih|{value0} selected
Ajukan terpilih|Submit selected
Insentif diajukan|Incentives submitted
Setujui terpilih|Approve selected
Insentif disetujui|Incentives approved
Belum ada insentif untuk {value0}|No incentives for {value0} yet
Belum ada pengajuan pada periode ini, jadi belum ada nominal yang dibayar. Tambahkan insentif bila ada.|Nothing has been submitted for this period, so no amount is paid. Add incentives if there are any.
Tidak ada tunjangan yang perlu ditinjau|No allowances need review
Periode kinerja|Performance period
Berlaku|Effective
Nominal|Amount
Pilih {value0}|Select {value0}
Ref|Ref
Tidak diisi|Not provided
Sejak awal|From the start
seterusnya|onward
Batalkan entri|Cancel entry
Tunjangan disetujui|Allowance approved
Versi baru|New version
Akhiri tunjangan|End allowance
Tandai sebagai OL|Mark as OL
Riwayat {value0}|History of {value0}
Riwayat|History
Lengkapi karyawan dan nama.|Select an employee and enter a name.
Nominal harus angka nol atau lebih.|Amount must be a number of zero or more.
Tunjangan OL memerlukan nominal.|An OL allowance needs an amount.
Insentif diperbarui|Incentive updated
Insentif disimpan sebagai draft|Incentive saved as a draft
Tunjangan OL diperbarui|OL allowance updated
Tunjangan OL diajukan untuk disetujui|OL allowance submitted for approval
Edit insentif|Edit incentive
Tambah insentif bulanan|Add monthly incentive
Edit tunjangan OL|Edit OL allowance
Periode payroll {value0}. Disimpan sebagai draft, lalu diajukan dan disetujui.|Payroll period {value0}. Saved as a draft, then submitted and approved.
Berlaku berulang mulai periode payroll yang dipilih setelah disetujui.|Recurs from the selected payroll period once approved.
Tipe komponen|Component type
Kosong = belum diisi|Blank = not entered
Kode skema (opsional)|Scheme code (optional)
Otomatis dari nama|Generated from the name
Awal periode kinerja|Performance period start
Akhir periode kinerja|Performance period end
Mulai periode payroll|From payroll period
Sampai periode payroll (opsional)|Until payroll period (optional)
Referensi|Reference
Kosongkan nominal jika belum diketahui; isi 0 hanya bila nilainya memang nol final. Nominal tidak diprorata ulang oleh payroll.|Leave the amount blank if it is not known yet; enter 0 only for a final zero. Payroll does not prorate this amount again.
Pilih periode mulai.|Select the start period.
Versi baru diajukan untuk disetujui|New version submitted for approval
Versi baru tunjangan OL|New OL allowance version
Versi berlaku mulai periode payroll yang belum dibuat. Versi lama berakhir sehari sebelumnya setelah disetujui; periode yang sudah dibayar tidak diubah.|The version starts at a payroll period not yet generated. Once approved, the previous version ends the day before; paid periods are not changed.
Nominal baru (Rp)|New amount (Rp)
Ajukan versi|Submit version
Tolak pengajuan|Reject submission
Pengajuan ditolak|Submission rejected
Dibatalkan; riwayat tetap disimpan|Cancelled; history is kept
Ditandai sebagai tunjangan OL|Marked as an OL allowance
Tanggal akhir disimpan|End date saved
Alasan wajib diisi.|A reason is required.
Pilih periode terakhir.|Select the last period.
Nominal, status dan tanggal tidak berubah. Setelah ditandai, perubahan nominal dilakukan lewat versi baru.|Amount, status and dates do not change. After marking, amount changes go through a new version.
Dibayar sampai periode payroll|Paid through payroll period
Riwayat belum dapat dimuat.|History could not be loaded.
Pemakaian payroll|Payroll usage
Dilepas|Released
Belum dipakai|Not used yet
Muat ulang karyawan|Reload employees
Nilai tunjangan yang hanya tercatat di profil karyawan tidak dibayar payroll dan tidak disalin otomatis. Tinjau lalu masukkan sebagai tunjangan OL bila memang bagian dari kontrak.|Allowance values recorded only on the employee profile are not paid by payroll and are not copied automatically. Review them and enter them as OL allowances if they are part of the contract.
Perlakuan pajak dan BPJS mengikuti aturan payroll yang berlaku; tidak diatur per tunjangan di sini.|Tax and BPJS treatment follow the current payroll rules; they are not set per allowance here.
Periode akhir harus sama atau setelah periode mulai.|The end period must be the same as or after the start period.
Penanggung PPh21 dan BPJS karyawan tidak tercatat pada payroll ini.|Who bore PPh21 and employee BPJS was not recorded on this payroll.
{count} payroll tanpa THP tersimpan tidak dijumlahkan|{count} payroll(s) without a saved take-home pay are not included
Tunjangan Jabatan (gabungan tersimpan)|Position Allowance (saved combined)
Dasar pengenaan pajak (DPP)|Taxable base (DPP)
Bukan pendapatan tunai; termasuk objek BPJS.|Not cash earnings; includes the BPJS taxable object.
Total Pendapatan Tunai|Total Cash Earnings
Rapel|Back Pay
Selisih komponen tersimpan|Difference from saved components
Potongan sistem (absen, telat, pinjaman, lainnya)|System deductions (absence, late, loan, other)
Simulasi gaji|Salary simulation
Cari gaji pokok sebulan penuh untuk target gaji bersih, memakai mesin payroll saat ini.|Find the full-month basic salary that gives a target take-home pay, using the current payroll engine.
Target gaji bersih (THP) per bulan|Target take-home pay (THP) per month
Status payroll|Payroll status
Baru (Gross)|New (Gross)
Existing (Gross-up)|Existing (Gross-up)
Perusahaan menanggung PPh21 dan BPJS karyawan; gaji bersih sama dengan gaji pokok ditambah tunjangan.|Company bears PPh21 and employee BPJS; take-home pay equals basic plus allowances.
Karyawan membayar PPh21 dan BPJS karyawan dari gaji bruto.|Employee pays PPh21 and employee BPJS from gross pay.
Status PTKP|PTKP status
Pilih PTKP|Select PTKP
Pilih status PTKP yang didukung.|Select a supported PTKP status.
Tunjangan tetap bulanan|Fixed monthly allowances
Tunjangan berulang yang disetujui untuk karyawan ini|Approved recurring allowances of this employee
Isi nominal untuk disimulasikan|Enter amounts to simulate
Tunjangan jabatan|Position allowance
Tunjangan transport|Transport allowance
Tunjangan makan|Meal allowance
Tunjangan berulang lainnya|Other recurring allowances
Wajib diisi. Isi 0 bila tidak ada.|Required. Enter 0 if none.
Isi rupiah utuh (angka saja).|Enter whole rupiah (digits only).
Nominal melebihi batas simulasi.|Amount is above the simulation limit.
Simulasi gagal. Periksa input lalu coba lagi.|Simulation failed. Check the inputs and try again.
Hanya sebulan penuh: lembur, insentif bulanan, prorata, pinjaman dan potongan kehadiran tidak termasuk dan dapat berbeda pada payroll sebenarnya.|Full month only: overtime, monthly incentives, proration, loans and attendance deductions are not included and vary on actual payroll.
Menghitung…|Calculating…
Hitung|Calculate
Isi target lalu hitung. Hasil tampil di sini.|Enter a target and calculate. The result appears here.
Gaji pokok (sebulan penuh)|Basic salary (full month)
Gaji bersih (THP)|Take-home pay
Tepat: target tercapai.|Exact: the target is reached.
Di bawah minimum: dengan tunjangan ini gaji bersih terendah yang dapat dicapai adalah {amount}, pada gaji pokok {basic}.|Below the minimum: with these allowances the lowest achievable take-home pay is {amount}, at a basic salary of {basic}.
Periode payroll|Payroll period
Otomatisasi payroll perusahaan atau persiapan payroll karyawan berlaku pada {period}. Payroll sebenarnya memakai kebijakan itu, yang tidak dimodelkan simulasi ini, sehingga hasil sebenarnya dapat berbeda.|Company payroll automation or an employee payroll preparation applies in {period}. Actual payroll will use that policy, which this simulation does not model, so the actual result can differ.
Aturan payroll atau sumber tunjangan tersimpan untuk {period} tidak dapat dibaca; hasil sebenarnya dapat berbeda. Periksa terlebih dahulu.|Stored payroll rules or allowance sources for {period} could not be read; the actual result can differ. Check them first.
Dihitung untuk {period} dengan tarif payroll saat ini serta status payroll, PTKP dan tunjangan yang dipilih.|Calculated for {period} with the current payroll rates and the selected payroll status, PTKP and allowances.
Hasil terdekat, tidak tepat.|Nearest result, not exact.
Selisih|Difference
Gaji pokok|Basic salary
Tunjangan tetap|Fixed allowances
Uang tunai bulanan sebelum potongan|Monthly cash before deductions
ditanggung perusahaan|paid by company
BPJS karyawan (JHT, JP, JKS)|Employee BPJS (JHT, JP, JKS)
Dasar pengenaan pajak (DPP), bukan uang tunai|Taxable base (DPP), not cash
BPJS perusahaan|Company BPJS
Biaya perusahaan|Company cost
Tunjangan berulang yang disetujui dipakai: {amount}.|Approved recurring allowances used: {amount}.
Tunjangan sekali bayar tidak termasuk.|One-time allowances are excluded.
Terapkan mengisi Gaji Pokok, Status payroll dan Status PTKP pada formulir ini. Karyawan belum tersimpan sampai formulir disimpan. Tunjangan tidak diubah; daftarkan tunjangan di menu Tunjangan.|Apply fills Basic Salary, Payroll status and PTKP status in this form. The employee is not saved until you save the form. Allowances are not changed; register allowances in Allowances.
Terapkan hanya tersedia bila mata uang gaji IDR.|Apply is available only when the salary currency is IDR.
Hanya simulasi. Tidak ada yang diterapkan atau disimpan dari Payroll.|Simulation only. Nothing is applied or saved from Payroll.
Target tidak dapat dicapai tepat, sehingga hasil tidak dapat diterapkan.|The target cannot be reached exactly, so the result cannot be applied.
Aturan payroll perusahaan atau persiapan payroll karyawan berlaku pada periode ini; payroll sebenarnya memakai aturan itu, bukan perhitungan ini.|Company payroll rules or an employee payroll preparation apply in this period; actual payroll would use them, not this calculation.
Aturan payroll atau sumber tunjangan tersimpan tidak dapat dibaca; periksa sebelum menerapkan.|Stored payroll rules or allowance sources could not be read; check them before applying.
Tunjangan simulasi bukan tunjangan disetujui yang akan dibayar payroll. Daftarkan dahulu di menu Tunjangan, atau simulasikan dengan tunjangan yang disetujui.|The simulated allowances are not the approved allowances payroll would pay. Register them in Allowances first, or simulate with the approved allowances.
Versi tunjangan masih menunggu persetujuan.|An allowance version is still waiting for approval.
Terapkan ke formulir|Apply to form
Hitung dari target THP|Calculate from target THP
Cari gaji pokok untuk target gaji bersih. Tidak ada yang disimpan.|Find the basic salary for a target take-home pay. Nothing is saved.
Pilih perusahaan terlebih dahulu (langkah Info Pribadi).|Select the company first (Personal Info step).
Gaji pokok diisi dari simulasi. Simpan formulir untuk menyimpannya.|Basic salary filled from the simulation. Save the form to keep it.
{period} adalah masa pajak terakhir: payroll menyelesaikan pajak setahun dengan Pasal 17 dari payroll tersimpan sejak awal tahun, sehingga estimasi bulanan ini bukan pajak atau take-home pay final.|{period} is a final tax period: payroll settles the whole year with Pasal 17 from saved year-to-date payroll, so this monthly estimate is not the final tax or take-home pay.
Estimasi bulanan dengan tarif TER, bukan penyelesaian tahunan. Pada Desember atau bulan berhenti bekerja, pajak sebenarnya dapat berbeda.|Monthly estimate with TER rates, not an annual settlement. In December or the month employment ends, the actual tax can differ.
PPh 21 masa pajak terakhir|PPh 21 final tax period
PPh 21 masa pajak terakhir (tahunan)|PPh 21 final tax period (annual)
Pajak periode ini memakai settlement eksternal yang direview, bukan lembar kerja Pasal 17 PeopleHub.|This period's tax uses a reviewed external settlement, not the PeopleHub Pasal 17 worksheet.
Pasal 17 atas penghasilan setahun dikurangi PPh 21 yang sudah dipotong (PMK 168/2023). Hasil tersimpan; tidak dihitung ulang saat dibuka.|Pasal 17 on the year's income less PPh 21 already withheld (PMK 168/2023). Saved result; not recalculated when opened.
Tahun pajak|Tax year
Alasan masa pajak terakhir|Final period reason
Bulan berhenti bekerja|Month employment ended
dikonfirmasi HR|confirmed by HR
Settlement eksternal|External settlement
Lembar kerja Pasal 17|Pasal 17 worksheet
Kebijakan|Policy
Tanpa persiapan HR: perlakuan sesuai status gaji (existing gross-up, new gross dipotong).|No HR preparation: salary-status treatment (existing gross-up, new gross withheld).
PTKP awal tahun|Start-of-year PTKP
Input HR (dokumen awal tahun)|HR input (start-of-year document)
Riwayat tersimpan konsisten|Consistent saved history
Residensi|Residency
Subjek pajak sebagian tahun: {months} bulan (disetahunkan)|Partial-year tax subject: {months} months (annualized)
Setahun penuh (tidak disetahunkan)|Full year (not annualized)
Bulan kerja di tahun ini|Months employed this year
Lembar kerja tahunan|Annual worksheet
Penghasilan bruto setahun (DPP)|Annual gross income (DPP)
Termasuk tunjangan pajak periode ini|Including this period's tax allowance
Biaya jabatan|Occupational deduction
Iuran JHT/JP karyawan|Employee JHT/JP contributions
Pengurang lain|Other deductions
Penghasilan neto|Net income
Neto disetahunkan|Annualized net income
PKP (dibulatkan ke ribuan)|PKP (floored to thousands)
PPh Pasal 17 setahun penuh|Full-year Pasal 17 tax
PPh 21 terutang setahun|Annual PPh 21 liability
PPh 21 sudah dipotong|PPh 21 already withheld
Penyelesaian periode ini|This period's settlement
PPh 21 periode ini (refund kelebihan potong)|This period's PPh 21 (over-withholding refund)
PPh 21 periode ini|This period's PPh 21
Pengaruh pajak ke karyawan|Tax effect on employee
Beban pajak perusahaan|Company tax cost
Pengurang lain:|Other deductions:
Riwayat tahun ini yang dipakai|This year's history used
Penanggung iuran|Contributions borne by
Dipotong dari karyawan|Withheld from employee
Ditanggung perusahaan (tidak dikurangkan)|Company-funded (not deducted)
Koreksi HR|HR correction
koreksi HR|HR-corrected
Saldo awal HR|HR opening balance
Tidak dihitung:|Not counted:
pemberi kerja terpisah|separate employer
refund kelebihan potong|over-withholding refund
Referensi dokumen pajak wajib diisi.|Tax document reference is required.
Isi bulan subjek pajak 1 sampai 11, atau kosongkan untuk setahun penuh.|Enter tax-subject months from 1 to 11, or leave empty for a full year.
Pengurang lain harus lebih dari 0.|Other deductions must be greater than 0.
Isi nominal dan keterangan pengurang lain bersama-sama.|Enter the other deduction amount and description together.
Isi DPP saldo awal minimal 0.|Enter an opening DPP of at least 0.
Isi iuran JHT/JP saldo awal minimal 0.|Enter opening JHT/JP contributions of at least 0.
Isi PPh 21 yang sudah dipotong, termasuk 0 atau negatif.|Enter PPh 21 already withheld, including 0 or a negative amount.
Lanjutan: PPh 21 masa pajak terakhir (tahunan)|Advanced: PPh 21 final tax period (annual)
Desember dan bulan berhenti bekerja dihitung otomatis dengan Pasal 17 dari payroll final tersimpan tahun ini. Isi bagian ini hanya bila server meminta keputusan atau data yang tidak tersimpan; semua nilai memerlukan referensi dokumen.|December and the month employment ends are calculated automatically with Pasal 17 from this year's saved final payroll. Fill this in only when the server asks for a decision or data that is not saved; every value needs a document reference.
Isi keputusan/data PPh 21 tahunan|Enter annual PPh 21 decisions or data
Referensi dokumen pajak|Tax document reference
Misalnya bukti potong, SPT, atau memo HR yang direview.|For example a withholding slip, tax return or reviewed HR memo.
Masa pajak terakhir|Final tax period
Tentukan otomatis|Determine automatically
Periode ini|This period
Periode berikutnya|Next period
Status PTKP awal tahun|Start-of-year PTKP status
Dari riwayat tersimpan|From saved history
Bulan subjek pajak (sebagian tahun)|Tax-subject months (partial year)
Hanya untuk subjek pajak dalam negeri yang mulai/berakhir di tengah tahun. Kosong: setahun penuh, tidak disetahunkan.|Only for a resident tax subject who started or ended during the year. Empty: full year, not annualized.
Pengurang lain setahun|Other annual deductions
Hanya pengurang yang sah dan terdokumentasi, misalnya zakat melalui pemberi kerja.|Only eligible, documented deductions, for example zakat through the employer.
Keterangan pengurang lain|Other deduction description
Payroll perusahaan lain tahun ini adalah pemberi kerja terpisah (tidak dihitung)|Payroll from another company this year is a separate employer (not counted)
Sertakan payroll final di luar tanggal masuk/berhenti tercatat|Include final payroll outside the recorded join/resign dates
Saldo awal untuk bulan yang tidak tersimpan di PeopleHub|Opening balance for months not saved in PeopleHub
DPP saldo awal|Opening DPP
Iuran JHT/JP saldo awal|Opening JHT/JP contributions
PPh 21 sudah dipotong (saldo awal)|PPh 21 already withheld (opening)
Boleh 0 atau negatif sesuai bukti potong.|May be 0 or negative according to the withholding slip.
Koreksi riwayat yang tidak tersimpan|Corrections for unsaved history
Berhenti pada tahun pajak sebelumnya (settlement eksternal)|Left employment in the previous tax year (external settlement)
belum final, diganti saldo awal|unfinalized, replaced by opening balance
dari tanggal masuk/berhenti|from join/resign dates
input HR|HR input
Periode payroll tercakup|Payroll periods covered
Termasuk bonus terpisah periode ini|Including this period's separate bonus
Iuran JHT/JP dibayar karyawan|Employee-paid JHT/JP contributions
Bagian bonus terpisah|Separate bonus share
Kelebihan potong dikembalikan kepada karyawan melalui payroll ini (PMK 168/2023). Perlakuan PPh ditanggung pemerintah (DTP) tidak didukung.|The over-withholding is refunded to the employee through this payroll (PMK 168/2023). Government-borne (DTP) tax treatment is not supported.
Isi bulan kerja 1 sampai 12, atau kosongkan agar dihitung dari tanggal masuk/berhenti.|Enter employment months from 1 to 12, or leave empty to count them from the join/resign dates.
Pilih minimal satu bulan saldo awal.|Select at least one opening-balance month.
Pilih bulan koreksi.|Select the correction month.
Bulan koreksi tidak boleh ganda.|Each correction month may appear only once.
Isi minimal satu nilai koreksi, atau hapus baris ini.|Enter at least one correction value, or remove this row.
DPP minimal 0.|DPP must be at least 0.
Iuran JHT/JP minimal 0.|JHT/JP contributions must be at least 0.
Bulan kerja di tahun pajak|Employment months in the tax year
Kosong: dihitung dari tanggal masuk/berhenti. Isi hanya bila tanggal tersebut tidak tercatat atau tidak sesuai dokumen.|Empty: counted from the join/resign dates. Fill in only when those dates are missing or differ from the documents.
Bulan saldo awal|Opening-balance months
Pilih bulan yang tidak memiliki payroll final di PeopleHub. Bulan yang sudah final tidak boleh dipilih (tidak dihitung dua kali).|Select months without a final payroll in PeopleHub. Months that are already final cannot be selected (no double counting).
Hanya iuran yang dibayar karyawan.|Employee-paid contributions only.
Payroll belum final (draft) pada bulan terpilih tidak dibayarkan; gunakan saldo awal ini (draft tetap tersimpan, tidak dihitung)|Unfinalized (draft) payroll in the selected months was not paid; use this opening balance instead (the draft stays saved and is not counted)
Hanya untuk nilai tersimpan yang kosong atau penanggungnya tidak tercatat. Kosongkan nilai yang tidak dikoreksi; nilai tersimpan tidak ditimpa.|Only for saved values that are empty or whose payer is not recorded. Leave values you are not correcting empty; saved values are not overwritten.
Koreksi {number}|Correction {number}
Bulan koreksi|Correction month
DPP tersimpan (koreksi)|Saved DPP (correction)
Iuran JHT/JP (koreksi)|JHT/JP contributions (correction)
PPh 21 dipotong (koreksi)|PPh 21 withheld (correction)
Hapus koreksi|Remove correction
Tambah koreksi bulan|Add month correction
`.trim().split('\n').map(line => line.split('|') as unknown as MessagePair);

export const payroll: Record<string, MessagePair> = {};
for (const pair of entries) for (const source of pair) payroll[source] ??= pair;

const aliases: Record<string, string> = {
  'Basic Salary (Diterima Karyawan)': 'Basic Salary (Received by Employee)',
  'Approve potongan {value0}': 'Setujui potongan {value0}',
  'Reject potongan {value0}': 'Tolak potongan {value0}',
};
for (const [source, target] of Object.entries(aliases)) payroll[source] = payroll[target];

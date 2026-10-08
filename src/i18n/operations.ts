import type { MessagePair } from './index';

// Explicit application copy. The optional third column preserves exact legacy keys.
const rows = `
Karyawan Tidak Ditemukan|Employee Not Found
Kembali ke Karyawan|Back to Employees
Bagian data karyawan|Employee record sections
Informasi Dasar|Basic Information
Kontak & Alamat|Contact & Address
Informasi Kepegawaian|Employment Information
Tanggal Kepegawaian|Employment Dates
Rekening Bank|Bank Account
Dokumen Identitas|Identity Documents
Kontak Darurat|Emergency Contact
Manfaat & Asuransi|Benefits & Insurance
ID Karyawan|Employee ID
Nama Lengkap|Full Name
Nama Panggilan|Nickname
Jenis Kelamin|Gender
Tanggal Lahir|Date of Birth
Tempat Lahir|Place of Birth
Status Pernikahan|Marital Status
Agama|Religion
Golongan Darah|Blood Type
Kewarganegaraan|Nationality
Email|Email
Email Pribadi|Personal Email
Telepon|Phone
Ponsel|Mobile
Alamat Tetap (KTP)|Permanent Address (KTP)
Alamat Lengkap|Full Address
Kota|City
Provinsi|Province
Kode Pos|Postal Code
Alamat Saat Ini (Domisili)|Current Address (Domicile)
Departemen|Department
Jabatan|Job Title
Lokasi Kerja|Work Location
Tingkat Organisasi|Organizational Level
Golongan|Grade Level
Pusat Biaya|Cost Center
Atasan|Manager
Tipe Karyawan|Employment Type
Status Karyawan|Employment Status
Jadwal Kerja|Work Schedule
Tanggal Perekrutan|Hire Date
Tanggal Masuk|Join Date
Mulai Masa Percobaan|Probation Start
Akhir Masa Percobaan|Probation End
Tanggal Pengangkatan|Confirmation Date
Mulai Kontrak|Contract Start
Akhir Kontrak|Contract End
Gaji Pokok|Basic Salary
Mata Uang|Currency
Frekuensi Pembayaran|Pay Frequency
Tipe Pembayaran|Pay Type
Tunjangan Transportasi|Transport Allowance
Tunjangan Makan|Meal Allowance
Tunjangan Jabatan|Position Allowance
Tunjangan Perumahan|Housing Allowance
Nama Bank|Bank Name
Nomor Rekening|Account Number
KTP|National ID (KTP)
Kartu Keluarga (KK)|Family Card (KK)
NPWP|NPWP
Nomor Paspor|Passport Number
Masa Berlaku Paspor|Passport Expiry
Hubungan|Relationship
Status Pajak|Tax Status
BPJS Ketenagakerjaan|BPJS Ketenagakerjaan
BPJS Kesehatan|BPJS Kesehatan
Terdaftar JHT|JHT Registered
Terdaftar JP|JP Registered
Asuransi Kesehatan|Medical Insurance
Asuransi Jiwa|Life Insurance
Gagal memuat data|Failed to load data
Perbaiki kesalahan validasi sebelum melanjutkan|Please fix validation errors before continuing
Data karyawan berhasil diperbarui|Employee updated successfully
Karyawan berhasil ditambahkan|Employee created successfully
Periksa isian yang ditandai sebelum menyimpan.|Check the highlighted fields before saving.
Pengunduran diri karyawan berhasil dicatat|Employee resignation recorded successfully|Karyawan berhasil di-resign
Data formulir karyawan gagal dimuat|Could not load employee form data
Muat ulang data sebelum menambah atau mengedit karyawan.|Reload the data before adding or editing an employee.
Edit Karyawan|Edit Employee
Tambah Karyawan Baru|Add New Employee
Langkah|Step
dari|of
- Kolom bertanda * wajib diisi|- Fields marked * are required
Catat Pengunduran Diri|Resign
Kembali ke Daftar|Back to List
Langkah pendaftaran karyawan|Employee registration steps
Langkah Berikutnya|Next Step
Perbarui Karyawan|Update Employee
Buat Karyawan|Create Employee
Pengunduran Diri Karyawan|Employee Resignation|Resign Karyawan
Perhatian|Attention
Status karyawan akan diubah menjadi|The employee status will change to
Mengundurkan Diri|Resigned
. Data pengunduran diri akan disimpan dan karyawan tidak akan tampil di daftar aktif.|. Resignation details will be saved and the employee will no longer appear in the active list.|. Data resign akan disimpan dan karyawan tidak akan tampil di daftar aktif.
Tanggal Pengunduran Diri|Resignation Date|Tanggal Resign
Tipe Pengunduran Diri|Resignation Type|Tipe Resign
-- Pilih Tipe Pengunduran Diri --|-- Select Resignation Type --|-- Pilih Tipe Resign --
Sukarela (Mengundurkan Diri)|Voluntary (Resignation)|Voluntary (Mengundurkan Diri)
Tidak Sukarela (PHK)|Involuntary (Termination)|Involuntary (PHK)
Pensiun|Retirement|Retirement (Pensiun)
Kontrak Berakhir|Contract End|Contract End (Kontrak Berakhir)
Kesepakatan Bersama|Mutual Agreement|Mutual Agreement (Kesepakatan Bersama)
Lainnya|Other|Other (Lainnya)
Alasan Pengunduran Diri|Resignation Reason|Alasan Resign
Contoh: Pindah ke perusahaan lain, melanjutkan pendidikan, dll.|Example: Moving to another company, continuing education, etc.|Contoh: Pindah ke perusahaan lain, Melanjutkan pendidikan, dll
Catatan Tambahan|Additional Notes
Catatan tambahan mengenai proses pengunduran diri...|Additional notes about the resignation process...|Catatan tambahan mengenai proses resign...
Memproses...|Processing...
Konfirmasi Pengunduran Diri|Confirm Resignation|Konfirmasi Resign
Pendaftaran|Registration
-- Pilih Perusahaan --|-- Select Company --|-- Pilih Company --
Pilih perusahaan tempat karyawan akan didaftarkan|Select the company where the employee will be registered|Pilih company dimana karyawan akan didaftarkan
ID Karyawan (NIK)|Employee ID (NIK)
Membuat...|Generating...
Pilih perusahaan untuk membuat ID otomatis|Select a company to generate an ID automatically|Pilih company untuk generate otomatis
Pilih perusahaan terlebih dahulu untuk membuat ID otomatis|Select a company first to generate an ID automatically|Pilih company terlebih dahulu untuk generate ID otomatis
Data pribadi|Personal details
Dokumen identitas|Identity documents
NIK KTP|NIK KTP
Nomor Kartu Keluarga (KK)|Family Card Number (KK)
Rincian Pekerjaan|Job Details
Jabatan|Position
Melapor Kepada (Atasan)|Reports To (Manager)
-- Tanpa Atasan (Tingkat Tertinggi / Group CEO) --|-- No Manager (Top Level / Group CEO) --
Tidak ada karyawan ditemukan|No employees found
Pilih atasan langsung. Kosongkan untuk posisi tertinggi (Group CEO)|Select the direct manager. Leave blank for the highest position (Group CEO)
Sen-Jum, 09:00-18:00|Mon-Fri, 09:00-18:00
Tanggal Penting|Important Dates
Tanggal masa percobaan yang tersimpan.|Saved probation date.|Tanggal probation yang tersimpan.
Otomatis sama dengan tanggal masuk|Automatically matches the join date|Otomatis sama dengan Join Date
Tanggal masa percobaan yang tersimpan; tidak berubah otomatis saat edit.|Saved probation date; does not change automatically when editing.|Tanggal probation yang tersimpan; tidak berubah otomatis saat edit.
Default tanggal masuk + 3 bulan kalender; menyesuaikan akhir bulan.|Defaults to join date + 3 calendar months, adjusted for month-end.|Default Join Date + 3 bulan kalender; menyesuaikan akhir bulan.
Status Karyawan (Penggajian)|Employee Status (Payroll)|Status Karyawan (Payroll)
Pemilik Rekening|Account Holder
Nama pemilik rekening|Account holder name
Informasi Pajak|Tax Information
Nomor NPWP|NPWP Number
Status PTKP|PTKP Status
BPJS & Asuransi|BPJS & Insurance
Nomor BPJS|BPJS Number
No. BPJS Ketenagakerjaan|BPJS Ketenagakerjaan Number
Masukkan nomor BPJS TK|Enter BPJS Ketenagakerjaan number
No. BPJS Kesehatan|BPJS Kesehatan Number
Masukkan nomor BPJS Kesehatan|Enter BPJS Kesehatan number
Program BPJS Ketenagakerjaan dan asuransi akan diatur otomatis berdasarkan tipe karyawan yang dipilih.|BPJS Ketenagakerjaan and insurance programs will be set automatically based on the selected employment type.
Informasi Kontak|Contact Information
Nomor Telepon|Phone Number
Nomor Ponsel|Mobile Number
Karyawan memiliki email kantor|Employee has office email
Email Kantor|Office Email
Kredensial masuk akan dikirim ke email pribadi. Email kantor dapat ditambahkan nanti.|Login credential will be sent to personal email. Office email can be added later.
Informasi Alamat|Address Information
Alamat lengkap sesuai KTP|Full address as per ID card
Alamat tempat tinggal saat ini|Current residential address
Nama Kontak|Contact Name
Nama lengkap|Full name
Telepon Kontak|Contact Phone
Alamat Kontak|Contact Address
Alamat lengkap|Full address
Informasi Pribadi|Personal Information
Kepegawaian|Employment
Melapor Kepada|Reports To
Bank|Bank
Kota KTP|KTP City
Kota Domisili|Current City
BPJS TK|BPJS TK
JHT|JHT
JP|JP
Silakan Periksa|Please Review
Pastikan semua informasi benar sebelum mengirim. Anda dapat kembali ke langkah mana pun untuk melakukan perubahan.|Make sure all information is correct before submitting. You can go back to any step to make changes.
Data karyawan berhasil diekspor|Employee data exported successfully
Lihat Detail|View Details
Direktori Karyawan|Employee Directory
Karyawan, jabatan, dan data kepegawaian di seluruh perusahaan Anda.|People, roles and employment records across your companies.
Mengekspor...|Exporting...
Ekspor|Export
Tambah Karyawan|Add Employee
Cari karyawan|Search employees
Cari berdasarkan nama atau email...|Search by name or email...
Memuat perusahaan...|Loading companies...
Semua Perusahaan|All Companies
Gagal memuat perusahaan.|Could not load companies.|Gagal memuat company.
Muat ulang perusahaan|Reload companies|Muat ulang company
Memuat departemen...|Loading departments...
Semua Departemen|All Departments
Gagal memuat departemen.|Could not load departments.|Gagal memuat department.
Hapus filter perusahaan|Clear company filter|Hapus filter company
Hapus perusahaan|Clear company
Hapus filter departemen|Clear department filter|Hapus filter department
Hapus departemen|Clear department
Status kepegawaian|Employment status
Tentang direktori ini|About this directory
Data tidak aktif mencakup karyawan yang mengundurkan diri, diberhentikan, dan pensiun. Pencarian mencakup semua status kepegawaian.|Inactive records include resigned, terminated and retired employees. Search includes all employment statuses.
Hapus Semua Filter|Clear All Filters
Memuat data...|Loading records...
/ semua status|/ all statuses
Tampilan direktori|Directory view
Daftar|List
Kisi|Grid
Data karyawan tidak dapat dimuat.|Unable to load employees.
Coba muat ulang karyawan|Retry employees
Memuat karyawan...|Loading employees...
Sesuaikan filter atau pencarian untuk melihat lebih banyak karyawan.|Adjust the filters or search to see more people.
Tidak ada data karyawan dalam pilihan ini.|No employee records in this selection.
Jabatan / departemen|Position / department
Halaman|Page
Hapus Karyawan|Delete Employee
Yakin ingin menghapus|Are you sure you want to delete
? Tindakan ini tidak dapat dibatalkan.|? This action cannot be undone.
Menghapus...|Deleting...
Silakan pilih karyawan|Please select an employee
Silakan pilih tanggal efektif|Please select effective date
Pilih jabatan atau masukkan jabatan secara manual|Select a position or enter a job title manually|Pilih posisi atau masukkan job title manual
Silakan pilih departemen baru|Please select new department
Silakan masukkan gaji baru|Please enter new salary
Silakan pilih perusahaan baru|Please select new company
Mutasi berhasil diperbarui|Movement updated successfully
Mutasi berhasil dibuat|Movement created successfully
Silakan isi alasan penolakan|Please provide rejection reason
Mutasi berhasil dihapus|Movement deleted successfully
Mutasi Karyawan|Employee Movement
Tinjau perubahan kepegawaian, tanggal efektif, dan keputusan yang tercatat.|Review employment changes, effective dates and recorded decisions.
Mutasi Baru|New Movement
Cari mutasi|Search movements
Cari karyawan, ID, atau alasan...|Search employee, ID or reason...
Pilih perusahaan|Select company
Perusahaan atau pilihan formulir tidak dapat dimuat.|Unable to load company or form options.
Coba muat ulang pilihan|Retry options
Tipe mutasi|Movement type
Semua tipe|All types
Semua status|All statuses
Cara menerapkan mutasi|How movements are applied
Mutasi yang disetujui diterapkan secara terpisah. Tinjau tanggal efektif dan perubahan yang diminta sebelum menerapkannya.|Approved movements are applied separately. Review the effective date and requested changes before applying.
Reset filter|Reset filters
Memuat mutasi...|Loading movements...
Mutasi tidak dapat dimuat.|Unable to load movements.
Coba muat ulang mutasi|Retry movements
Muat ulang perusahaan untuk membuka daftar.|Retry loading companies to open the register.
Tidak ada perusahaan yang dapat diakses.|No accessible companies available.
Tidak ada mutasi ditemukan|No movements found
Sesuaikan filter untuk melihat perubahan kepegawaian lainnya.|Adjust the filters to see other employment changes.
Perubahan yang diminta|Requested change
Tanggal efektif|Effective date
Status / tindakan|Status / actions
Tinjau|Review
Edit Mutasi|Edit Movement
Karyawan dan waktu berlaku|Employee and timing
Filter berdasarkan Perusahaan|Filter by Company
Pilih karyawan...|Select employee...
Tipe Mutasi|Movement Type
Promosi|Promotion
Demosi|Demotion
Perpindahan|Transfer
Mutasi|Mutation
Penyesuaian Gaji|Salary Adjustment
Perpindahan Perusahaan|Company Transfer
Perubahan Departemen|Department Change
Perubahan Jabatan|Position Change
Perubahan Golongan|Grade Change
Perubahan Status|Status Change
Tanggal Efektif|Effective Date
Jabatan Baru|New Position
Saat ini:|Current:
Pilih dari daftar|Select from the list
Tidak ada? Isi manual|Not listed? Enter manually
Jabatan manual|Manual job title
Masukkan jabatan...|Enter job title...|Masukkan job title...
Pilih jabatan baru...|Select new position...
Pilih karyawan terlebih dahulu|Select an employee first|Pilih employee dulu
Departemen Baru|New Department
Pilih departemen baru...|Select new department...
Perusahaan Baru|New Company
Pilih perusahaan baru...|Select new company...
Gaji Setelah Penurunan|Reduced Salary
Gaji Setelah Kenaikan|Increased Salary
Gaji Baru|New Salary
Gaji saat ini:|Current salary:
Rp|Rp
Gaji setelah demosi harus lebih rendah dari gaji saat ini|Demotion salary must be lower than current salary
Golongan baru|New grade
Status baru|New status
Informasi pendukung|Supporting information
Alasan|Reason
Alasan mutasi...|Reason for movement...
Catatan tambahan...|Additional notes...
Perbarui|Update
Buat|Create
Detail Mutasi|Movement Details
Perubahan gaji|Salary change
Disetujui oleh|Approved by
Alasan penolakan|Rejection reason
Tolak|Reject
Setujui|Approve
Terapkan ke Karyawan|Apply to Employee
Tolak Mutasi?|Reject Movement?
Alasan Penolakan|Rejection Reason
Hapus Mutasi?|Delete Movement?
Yakin ingin menghapus mutasi ini?|Are you sure you want to delete this movement?
Tarik untuk menggeser · Gulir untuk memperbesar · Klik kartu untuk detail|Drag to pan · Scroll to zoom · Click a card for details|Tarik untuk menggeser · Scroll untuk zoom · Klik kartu untuk detail
Bagan organisasi yang dapat digulir|Scrollable organization chart
bawahan ditampilkan|reports shown
Struktur Organisasi|Organization Structure
Jelajahi hubungan pelaporan dan temukan rekan di organisasi Anda.|Explore reporting lines and find people in your organization.
Perusahaan tidak tersedia.|Companies unavailable.
Coba muat ulang perusahaan|Retry companies
Cari dalam organisasi|Search organization
Nama, jabatan, atau departemen|Name, role or department
Membaca bagan|Reading the chart
Pencarian mempertahankan jalur pelaporan untuk setiap hasil. Klik dan tarik untuk menggeser bagan. Gulir ke atas untuk memperbesar dan ke bawah untuk memperkecil di sekitar kursor. Klik seseorang untuk melihat detail dan bawahan langsungnya. Sentuhan dan tombol panah juga dapat menggulir bagan.|Search keeps the reporting path to each match. Click and drag to move the chart. Scroll up to zoom in and down to zoom out around your cursor. Click a person for their details and direct reports. Touch and arrow keys can also scroll the chart.
Ruang kerja bagan organisasi|Organization chart workspace
karyawan|employees
departemen|departments
tingkat|levels
Menampilkan jalur pelaporan yang cocok|Showing matching reporting paths
Perbesaran bagan|Chart zoom
Perkecil|Zoom out
Tingkat perbesaran|Zoom level
Perbesar|Zoom in
Reset perbesaran|Reset zoom
Layar penuh tidak tersedia di browser ini|Fullscreen is unavailable in this browser
Keluar dari layar penuh|Exit fullscreen
Layar penuh|Fullscreen
Mode layar penuh tidak dapat diubah. Silakan coba lagi.|Fullscreen could not be changed. Please try again.
Memuat struktur organisasi...|Loading organization structure...
Struktur organisasi tidak dapat dimuat.|Unable to load organization structure.
Coba muat ulang bagan|Retry chart
Tidak ada karyawan yang cocok|No matching employees
Tidak ada data organisasi|No organization data
Coba nama, jabatan, atau departemen lain.|Try another name, role or department.
Tidak ada data pelaporan dalam pilihan perusahaan ini.|There are no reporting records in this company selection.
Detail karyawan|Employee details
Tutup detail karyawan|Close employee details
Bawahan langsung ({count})|Direct reports ({count})
Pengajuan berhasil disetujui|Request approved successfully
Pengajuan ditolak|Request rejected
Pengajuan cuti dan lembur yang menunggu dalam lingkup persetujuan Anda.|Pending leave and overtime requests within your approval scope.
Pengajuan cuti yang ditugaskan kepada Anda sebagai pemberi persetujuan. Data seluruh perusahaan ada di Pengajuan Cuti.|Leave requests assigned to you as approver. Company-wide records are in Leave Requests.
Cari pengajuan|Search requests
Cari karyawan atau pemberi persetujuan...|Search employee or approver...
Jenis pengajuan|Request type
Semua jenis pengajuan|All request types
Status pengajuan|Request status
Lingkup persetujuan|Approval scope
Pengajuan yang menunggu mengikuti akses perusahaan dan persetujuan Anda. Tindakan persetujuan tetap memerlukan otorisasi; antrean ini tidak mencakup riwayat yang sudah selesai.|Pending requests follow your existing company and approval access. Approval actions remain subject to authorization; this queue does not include completed history.
Pengajuan mengikuti pemberi persetujuan cuti yang ditunjuk. Jika belum ditetapkan, pengajuan mengikuti atasan karyawan. Peran HR Anda tidak menambahkan karyawan lain ke kotak masuk ini.|Requests follow the designated leave approver. If none is assigned, they follow the employee's manager. Your HR role does not add other employees to this inbox.
Jenis aktivitas|Activity type
Semua aktivitas|All activity
Tampilan persetujuan|Approval view
Kotak masuk persetujuan|Approval inbox
Aktivitas|Activity
Memuat riwayat...|Loading history...
Riwayat tidak tersedia|History unavailable
Memuat pengajuan...|Loading requests...
Pengajuan persetujuan tidak dapat dimuat.|Unable to load approval requests.
Coba muat ulang pengajuan|Retry requests
Tidak ada pengajuan dalam tampilan ini|No requests in this view
Tidak ada pengajuan yang ditugaskan yang cocok dengan filter ini.|There are no assigned requests matching these filters.
Menunggu pemberi persetujuan yang ditunjuk|Awaiting assigned approver
Alasan penolakan:|Rejection reason:
Detail pengajuan|Request details
Diajukan|Submitted
Pemberi persetujuan:|Approver:
Serah terima:|Handover:
aktivitas|events
pengajuan|requests
Durasi tercatat|Recorded duration
Tanggal|Dates
Komentar (Opsional)|Comment (Optional)
Ya, Setujui|Yes, Approve
Ya, Tolak|Yes, Reject
Dokumen gagal diunduh.|Could not download the document.
Dokumen berhasil diunggah.|Document uploaded successfully.
Dokumen gagal disimpan. Silakan coba lagi.|Could not save the document. Please try again.
Verifikasi dicabut.|Verification revoked.
Dokumen terverifikasi.|Document verified.
Status verifikasi gagal diperbarui.|Could not update verification status.
Dokumen berhasil dihapus.|Document deleted successfully.
Dokumen gagal dihapus.|Could not delete the document.
Kontrak & Dokumen|Contracts & Documents
Kontrak kerja dan berkas karyawan, dalam satu tempat.|Employment contracts and employee files in one place.
Unggah dokumen|Upload document
Jenis arsip|Record type
Memuat perusahaan…|Loading companies…|Memuat company…
Perusahaan belum dapat dimuat|Could not load companies|Company belum dapat dimuat
Coba muat ulang daftar perusahaan.|Try reloading the company list.|Coba muat ulang daftar company.
Belum ada perusahaan yang tersedia|No companies available|Belum ada company yang tersedia
Hubungi admin untuk memeriksa akses perusahaan.|Contact an administrator to check company access.|Hubungi admin untuk memeriksa akses company.
Filter arsip|Record filters
Cari arsip|Search records
Cari nama, ID, atau nomor kontrak…|Search name, ID, or contract number…
Cari nama karyawan atau dokumen…|Search employee or document name…
Tipe kontrak|Contract type
Kategori dokumen|Document category
Semua tipe|All types
Semua status|All statuses
Reset filter|Reset filter
Daftar kontrak|Contract list
Daftar dokumen|Document list
Memuat arsip|Loading records
Memuat arsip…|Loading records…
Arsip belum dapat dimuat|Could not load records
Data perusahaan ini belum tersedia. Silakan coba lagi.|This company's data is unavailable. Please try again.|Data company ini belum tersedia. Silakan coba lagi.
Tidak ada hasil yang cocok|No matching results
Belum ada arsip|No records yet
Coba kata kunci lain atau reset filter.|Try another keyword or reset the filters.
Arsip akan tampil di sini setelah tersedia untuk perusahaan ini.|Records will appear here when available for this company.|Arsip akan tampil di sini setelah tersedia untuk company ini.
Dokumen / Karyawan|Document / Employee
Tipe / Nomor|Type / Number
Kategori / Jenis|Category / Type
Periode kontrak|Contract period
Diunggah|Uploaded
Aksi|Actions
Tanpa tanggal berakhir|No end date
Berakhir dalam 30 hari|Expires within 30 days
Terverifikasi|Verified
Belum Terverifikasi|Unverified
Halaman arsip|Record pages
Halaman sebelumnya|Previous page
Halaman berikutnya|Next page
Penambahan, perubahan, dan penghapusan kontrak belum tersedia di halaman ini. Dokumen kontrak dapat diunggah melalui tab Dokumen.|Creating, editing, and deleting contracts is not yet available on this page. Contract documents can be uploaded from the Documents tab.|Penambahan, perubahan, dan penghapusan kontrak belum tersedia di halaman ini. Dokumen kontrak dapat diunggah melalui tab Documents.
Detail kontrak|Contract details
Detail gagal dimuat|Could not load details
Memuat detail…|Loading details…
Ketentuan kontrak|Contract terms
Nomor kontrak|Contract number
Tanggal mulai|Start date
Tanggal berakhir|End date
Gaji dalam kontrak|Contract salary
Unduh lampiran|Download attachment
Detail dokumen|Document details
Informasi dan verifikasi|Information and verification
ID karyawan|Employee ID
Kategori|Category
Diunggah oleh|Uploaded by
Tanggal unggah|Upload date
Verifikasi:|Verification:
Cabut verifikasi|Revoke verification
Verifikasi|Verify
Hapus dokumen?|Delete document?
milik|belonging to
akan dihapus. Pastikan dokumen ini sudah tidak diperlukan.|will be deleted. Make sure this document is no longer needed.
Menghapus…|Deleting…
Hapus dokumen|Delete document
Pemilik dokumen|Document owner
Cari karyawan|Search employees
Nama atau ID karyawan|Employee name or ID
Daftar karyawan gagal dimuat|Could not load the employee list
Karyawan *|Employee *
Memuat karyawan…|Loading employees…
Pilih karyawan|Select employee
File dan keterangan|File and description
Jenis dokumen *|Document type *
Pilih jenis dokumen|Select document type
Nama dokumen *|Document name *
Contoh: Kontrak kerja 2026|Example: Employment contract 2026
Pilih file dokumen *|Choose document file *
PDF, JPG, PNG, DOC, atau DOCX|PDF, JPG, PNG, DOC, or DOCX
Mengunggah…|Uploading…
Memuat ringkasan kontrak…|Loading contract overview…
Tampilan eksekutif - Pengelolaan kontrak seluruh perusahaan|Executive view - All companies contract management
Jumlah kontrak|Contract totals
Semua Kontrak|All Contracts
Kontrak Aktif|Active Contracts
Dalam 30 Hari|Within 30 Days
Kontrak Kedaluwarsa|Expired Contracts
Kontrak Segera Berakhir|Contracts Expiring Soon
kontrak berakhir dalam 30 hari,|contracts expiring within 30 days,
dalam 60 hari,|within 60 days,
dalam 90 hari.|within 90 days.
Lihat Semua|View All
Ringkasan Kontrak per Perusahaan|Contract Overview by Company
Distribusi kontrak di seluruh anak perusahaan|Contract distribution across all subsidiaries
Total|Total
Berakhir (30 hari)|Expiring (30d)
Tetap|Permanent
Kontrak|Contract
Masa Percobaan|Probation
Segera Berakhir|Expiring Soon
Kontrak berakhir dalam 30 hari|Contracts expiring within 30 days
Tidak ada kontrak yang berakhir dalam 30 hari|No contracts expiring within 30 days
hari|days
hari cuti|leave days
jam|hours
Kontrak Terbaru|Recent Contracts
Aktivitas kontrak terbaru|Latest contract activities
Tidak ada kontrak terbaru|No recent contracts
Karyawan yang Anda cari tidak ditemukan.|The employee you are looking for does not exist.
Ke langkah {step}|Go to {step}
Format:|Format:
Nama lengkap sesuai KTP|Full legal name as per ID card
Nama pilihan atau nama panggilan|Preferred name or nickname
Kota/kabupaten kelahiran|City/regency of birth
-- Pilih Jenis Kelamin --|-- Select Gender --
Laki-laki|Male|Male (Laki-laki)
Perempuan|Female|Female (Perempuan)
-- Pilih Status --|-- Select Status --
Belum Menikah|Single|Single (Belum Menikah)
Menikah|Married|Married (Menikah)
Cerai|Divorced|Divorced (Cerai)
Duda/Janda|Widowed|Widowed (Duda/Janda)
-- Pilih Agama --|-- Select Religion --
Islam|Islam
Kristen|Protestant
Katolik|Catholic
Hindu|Hindu
Buddha|Buddhist
Konghucu|Confucian
Negara kewarganegaraan|Country of citizenship
Nomor Induk Kependudukan 16 digit|16-digit National ID Number
Nomor Kartu Keluarga 16 digit|16-digit Family Card Number
Rekayasa Perangkat Lunak|Software Engineer
-- Pilih Departemen --|-- Select Department --
-- Pilih Perusahaan Dahulu --|-- Select Company First --|-- Pilih Company dulu --
Belum ada jabatan|No position|No Position
-- Pilih Lokasi Kerja --|-- Select Work Location --
-- Pilih Tipe --|-- Select Type --
Tetap|Permanent|Permanent (Tetap)
Kontrak|Contract|Contract (Kontrak)
Magang|Internship|Internship (Magang)
Pekerja Lepas|Freelance
Paruh waktu|Part time
Diberhentikan|Terminated
Pensiun|Retired
Dinonaktifkan Sementara|Suspended
Diterapkan|Applied
Kedaluwarsa|Expired
Diperpanjang|Renewed
Bruto|Gross
Bulanan|Monthly
Mingguan|Weekly
Dua Mingguan|Biweekly
Sukarela|Voluntary
Tidak Sukarela|Involuntary
Tanggal mulai bekerja. Tanggal masa percobaan tersimpan tidak dihitung ulang saat edit.|Employment start date. Saved probation dates are not recalculated when editing.|Tanggal mulai bekerja. Tanggal probation tersimpan tidak dihitung ulang saat edit.
Tanggal mulai bekerja. Default masa percobaan dihitung 3 bulan kalender.|Employment start date. Probation defaults to 3 calendar months.|Tanggal mulai bekerja. Default probation dihitung 3 bulan kalender.
IDR - Rupiah Indonesia|IDR - Indonesian Rupiah
USD - Dolar Amerika Serikat|USD - US Dollar
SGD - Dolar Singapura|SGD - Singapore Dollar
Semua karyawan PFI menggunakan tipe Gross — PPh21 dipotong dari gaji|All PFI employees use Gross pay — PPh21 is deducted from salary|Semua karyawan PFI menggunakan tipe Gross — PPh 21 dipotong dari gaji
Gross (Pajak Ditanggung Karyawan)|Gross (Employee Bears Tax)
Existing: karyawan lama dari skema net. New (Gross): karyawan baru, gaji murni gross.|Existing: legacy employees from the net scheme. New (Gross): new employees with a pure gross salary.|Existing: karyawan lama dari skema net. New (Gross): karyawan baru, gaji pure gross.
Existing (Migrasi Net→Gross) — THP = Gaji Pokok, tunjangan pajak otomatis|Existing (Legacy Net→Gross) — THP = Basic, automatic tax allowance|Existing (Legacy Net→Gross) — THP = Basic, tunjangan pajak otomatis
New (Gross) — Karyawan membayar PPh21, THP < Gaji Pokok|New (Gross) — Employee pays PPh21, THP < Basic|New (Gross) — Karyawan bayar PPh21, THP < Basic
BCA, Mandiri, BNI, dll.|BCA, Mandiri, BNI, etc.
Nomor Pokok Wajib Pajak|Taxpayer Identification Number
Penghasilan Tidak Kena Pajak untuk perhitungan PPh21|Non-taxable income allowance for PPh21 calculation|Penghasilan Tidak Kena Pajak untuk perhitungan PPh 21
-- Pilih Status PTKP --|-- Select PTKP Status --
TK/0 - Tidak Kawin, Tanpa Tanggungan|TK/0 - Unmarried, No Dependants
TK/1 - Tidak Kawin, 1 Tanggungan|TK/1 - Unmarried, 1 Dependant
TK/2 - Tidak Kawin, 2 Tanggungan|TK/2 - Unmarried, 2 Dependants
TK/3 - Tidak Kawin, 3 Tanggungan|TK/3 - Unmarried, 3 Dependants
K/0 - Kawin, Tanpa Tanggungan|K/0 - Married, No Dependants
K/1 - Kawin, 1 Tanggungan|K/1 - Married, 1 Dependant
K/2 - Kawin, 2 Tanggungan|K/2 - Married, 2 Dependants
K/3 - Kawin, 3 Tanggungan|K/3 - Married, 3 Dependants
K/I/0 - Kawin, Penghasilan Istri Digabung|K/I/0 - Married, Combined Spousal Income
K/I/1 - Kawin, Penghasilan Istri Digabung, 1 Tanggungan|K/I/1 - Married, Combined Spousal Income, 1 Dependant
K/I/2 - Kawin, Penghasilan Istri Digabung, 2 Tanggungan|K/I/2 - Married, Combined Spousal Income, 2 Dependants
K/I/3 - Kawin, Penghasilan Istri Digabung, 3 Tanggungan|K/I/3 - Married, Combined Spousal Income, 3 Dependants
Telepon kantor atau rumah|Office or home landline
Ponsel pribadi/WhatsApp|Personal mobile/WhatsApp
Untuk kredensial karyawan baru|For onboarding credentials
Digunakan untuk masuk dan notifikasi|Used as login & for notifications
Email resmi perusahaan (M365 / Google Workspace)|Official company email (M365 / Google Workspace)
-- Pilih Hubungan --|-- Select Relationship --
Suami|Husband
Istri|Wife
Orang Tua|Parent
Ayah|Father
Ibu|Mother
Anak|Child
Saudara|Sibling
Kakak|Older sibling
Adik|Younger sibling
Dibuat otomatis|Auto-generated
Tanpa Atasan (Tingkat Tertinggi)|No Manager (Top Level)
Tidak berlaku (menggunakan email pribadi)|N/A (uses personal email)
Terdaftar|Registered
Belum ada ID karyawan|No employee ID
Belum ada departemen|No department
Lihat {name}|View {name}
Edit {name}|Edit {name}
Belum ada perusahaan|No company
{count} karyawan yang cocok|{count} matching employees
Mutasi untuk {name} telah disetujui|Movement for {name} has been approved
Karyawan tidak diketahui|Unknown employee
Mutasi untuk {name} telah ditolak|Movement for {name} has been rejected
Mutasi untuk {name} telah diterapkan ke data karyawan|Movement for {name} has been applied to employee data
Mutasi {company}|{company} movements
{count} mutasi yang cocok|{count} matching movements
Pilih karyawan, tanggal efektif, dan perubahan kepegawaian.|Choose the employee, effective date and employment changes.
Keluar dari layar penuh (Esc)|Exit fullscreen (Esc)
Lihat bagan dalam layar penuh|View chart fullscreen
Baru saja|Just now
{count} menit lalu|{count} minutes ago
{count} jam lalu|{count} hours ago
{count} hari lalu|{count} days ago
{count} minggu lalu|{count} weeks ago
{count} bulan lalu|{count} months ago
{count} menunggu persetujuan Anda|{count} awaiting your approval
Tidak ada alasan yang diberikan.|No reason provided.
Setujui Pengajuan Cuti?|Approve Leave Request?
Setujui Pengajuan Lembur?|Approve Overtime Request?
Tolak Pengajuan Cuti?|Reject Leave Request?
Tolak Pengajuan Lembur?|Reject Overtime Request?
Dokumen P&C|P&C documents
Dokumen karyawan|Employee documents
Nama belum tersedia|Name unavailable
Periode|Period
s.d. {date}|Until {date}
Detail kontrak untuk {name}|Contract details for {name}
Detail dokumen: {name}|Document details: {name}
Unduh {name}|Download {name}
Belum ada catatan.|No notes yet.
karyawan ini|this employee
{count} kontrak|{count} contracts
{count} dokumen|{count} documents
Total kontrak|Total contracts
Kontrak aktif|Active contracts
Total dokumen|Total documents
Perlu verifikasi|Needs verification
Kartu Tanda Penduduk (KTP)|National ID Card (KTP)
NPWP|Tax ID (NPWP)
Kartu Keluarga|Family Card
Ijazah Terakhir|Latest Diploma
Transkrip Akademik|Academic Transcript
Sertifikat Keahlian|Skill Certificate
Surat Keterangan Catatan Kepolisian (SKCK)|Police Clearance (SKCK)
Surat Keterangan Sehat|Health Certificate
Pas Foto|Passport Photo
BPJS Kesehatan|BPJS Health Insurance
BPJS Ketenagakerjaan|BPJS Employment
Buku Rekening Bank|Bank Account Book
Surat Penawaran|Offer Letter
Kontrak Kerja|Employment Contract
Perjanjian Kerja Waktu Tertentu (PKWT)|Fixed-Term Contract (PKWT)
Perjanjian Kerja Waktu Tidak Tertentu (PKWTT)|Permanent Contract (PKWTT)
Adendum Kontrak|Contract Addendum
Surat Peringatan 1|Warning Letter 1
Surat Peringatan 2|Warning Letter 2
Surat Peringatan 3|Warning Letter 3
Surat Pengangkatan|Appointment Letter
Surat Promosi|Promotion Letter
Surat Mutasi|Transfer Letter
Surat PHK|Termination Letter
Surat Referensi|Reference Letter
Paklaring|Employment Certificate
Slip Gaji|Salary Slip
Tetap (PKWTT)|Permanent (PKWTT)
Kontrak (PKWT)|Contract (PKWT)
Informasi Pribadi|Personal Info
Data dasar|Basic details
Informasi pekerjaan|Job info
Gaji & Pajak|Salary & Tax
Kontak|Contact
Alamat|Address
Konfirmasi|Confirm
No. KK|Family Card No.
No. Paspor|Passport No.|No. Passport
Atasan / Manajer|Supervisor / Manager|Atasan / Manager
No. Rekening|Account No.
Nama Pemilik Rekening|Account Holder Name
No. HP|Mobile No.
Alamat KTP|ID Card Address
Alamat Domisili|Residential Address
Kota Domisili|Residential City
Provinsi Domisili|Residential Province
Kode Pos Domisili|Residential Postal Code
Nama Kontak Darurat|Emergency Contact Name
No. HP Kontak Darurat|Emergency Contact Mobile No.
Gagal memuat karyawan|Failed to fetch employee
Gagal memuat data|Failed to fetch data
Gagal mengekspor data karyawan|Failed to export employee data
Gagal menyimpan mutasi|Failed to save movement
Gagal menyetujui mutasi|Failed to approve movement
Gagal menolak mutasi|Failed to reject movement
Gagal menerapkan mutasi|Failed to apply movement
Gagal menghapus mutasi|Failed to delete movement
Alasan penolakan wajib diisi.|Rejection reason is required.
Keputusan tidak dapat disimpan. Coba lagi.|Unable to save the decision. Try again.
…dan {count} lainnya|…and {count} more
Perbaiki hal berikut:|Please fix the following:
Nomor telepon terlalu panjang|Phone number too long
Format telepon tidak valid (contoh: +6281234567890 atau 081234567890)|Invalid phone format (e.g. +6281234567890 or 081234567890)
NIK hanya boleh berisi angka|NIK must contain digits only
NIK harus terdiri dari 16 digit|NIK must be 16 digits
KK hanya boleh berisi angka|KK must contain digits only
KK harus terdiri dari 16 digit|KK must be 16 digits
NPWP terlalu panjang|NPWP too long
NPWP harus terdiri dari 15 atau 16 digit|NPWP must be 15 or 16 digits
Maksimal 255 karakter|Maximum 255 characters
Maksimal 1000 karakter|Maximum 1000 characters
Maksimal 10 karakter|Maximum 10 characters
Kode pos tidak valid|Invalid postal code
Email tidak valid|Invalid email
Isian tidak valid|Invalid input
Tanggal harus berformat YYYY-MM-DD|Date must be YYYY-MM-DD
Tanggal harus merupakan tanggal kalender yang valid|Date must be a valid calendar date
Harus 0 atau lebih|Must be 0 or greater
Jumlah terlalu besar|Amount too large
Harus berupa angka positif|Must be a positive number
Harus berupa bilangan bulat|Must be a whole number
Pilih opsi yang valid|Select a valid option
Pilih mata uang yang valid|Select a valid currency
Pilih status penggajian yang valid|Select a valid salary status
Nama lengkap wajib diisi (minimal 2 karakter)|Full name is required (min 2 chars)
Email pribadi wajib diisi|Personal email is required
Perusahaan wajib diisi|Company is required
Akhir masa percobaan tidak boleh mendahului awalnya|Probation end must not precede start
Email kantor wajib diisi jika "Memiliki email kantor" diaktifkan|Office email is required when "Has office email" is enabled
Akhir kontrak harus setelah awal kontrak|Contract end must be after contract start
Tanggal pengunduran diri wajib diisi|Resignation date is required|Tanggal resign harus diisi
Format tanggal tidak valid|Invalid date format
Tipe pengunduran diri wajib dipilih|Select a resignation type|Tipe resign harus dipilih
Alasan minimal 3 karakter|Reason must contain at least 3 characters
Alasan maksimal 500 karakter|Reason must contain no more than 500 characters
Catatan maksimal 1000 karakter|Notes must contain no more than 1000 characters
`.trim().split('\n');

export const operations: Record<string, MessagePair> = {};
for (const row of rows) {
  const [id, en, alias] = row.split('|');
  const pair: MessagePair = [id, en];
  for (const key of [id, en, alias]) if (key) operations[key] ??= pair;
}

import type { MessagePair } from '@/i18n';

// Leave supporting document copy (self-service form and download action). [Indonesian, English].
const pairs: MessagePair[] = [
  ["Surat keterangan dokter", "Doctor's certificate"],
  ['Dokumen pendukung', 'Supporting document'],
  ['(wajib)', '(required)'],
  ['Satu file PDF, JPG, JPEG, atau PNG, maksimal 5 MB. Hanya karyawan, approver yang ditugaskan, dan P&C yang dapat membukanya.',
    'One PDF, JPG, JPEG or PNG file, up to 5 MB. Only the employee, the assigned approver and P&C can open it.'],
  ['File terpilih', 'Selected file'],
  ['Pilih surat dokter', "Choose doctor's certificate"],
  ['Pilih dokumen pendukung', 'Choose supporting document'],
  ['Ganti', 'Change file'],
  ['Siap dilampirkan', 'Ready to attach'],
  ['Pilih file dari perangkat Anda.', 'Select a file from your device.'],
  ['PDF, JPG, JPEG atau PNG · Maksimal 5 MB', 'PDF, JPG, JPEG or PNG · Maximum 5 MB'],
  ['Privat. Hanya Anda, approver yang ditugaskan, dan P&C yang dapat membuka dokumen ini.', 'Private. Only you, your assigned approver and P&C can open this document.'],
  ['Hapus {name}', 'Remove {name}'],
  ['Hapus', 'Remove'],
  ['Gunakan file PDF, JPG, JPEG, atau PNG.', 'Use a PDF, JPG, JPEG or PNG file.'],
  ['File yang dipilih kosong.', 'The selected file is empty.'],
  ['Ukuran file lebih dari 5 MB.', 'The file is larger than 5 MB.'],
  ['Jenis cuti ini wajib melampirkan dokumen pendukung.', 'This leave type requires a supporting document.'],
  ['Dokumen gagal diunggah. Pengajuan belum dikirim; silakan coba lagi.', 'The document could not be uploaded. Your request was not sent; try again.'],
  ['Jenis cuti ini tidak menerima dokumen pendukung.', 'This leave type does not take a supporting document.'],
  ['Lampirkan surat keterangan dokter sebelum mengirim.', "Attach the doctor's certificate before submitting."],
  ['Lampirkan dokumen pendukung sebelum mengirim.', 'Attach the supporting document before submitting.'],
  ['Menyiapkan unduhan…', 'Preparing download…'],
  ['Unduh surat keterangan dokter', "Download doctor's certificate"],
  ['Unduh dokumen pendukung', 'Download supporting document'],
  ['Anda tidak memiliki akses ke dokumen ini.', 'You do not have access to this document.'],
  ['Dokumen ini tidak tersedia.', 'This document is not available.'],
  ['Dokumen tidak dapat dibuka. Silakan coba lagi.', 'The document could not be opened. Try again.'],
];

export const leaveDocumentMessages: Record<string, MessagePair> = {};
for (const pair of pairs) { leaveDocumentMessages[pair[1]] = pair; leaveDocumentMessages[pair[0]] = pair; }

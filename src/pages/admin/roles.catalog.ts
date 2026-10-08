import type { MessagePair } from '@/i18n';

export const rolesErrorMessages: Record<string, MessagePair> = {
  'ID must be a positive integer': ['ID harus berupa bilangan bulat positif', 'ID must be a positive integer'],
  'Pagination offset is too large': ['Offset paginasi terlalu besar', 'Pagination offset is too large'],
  'At least one field is required': ['Minimal satu kolom wajib diisi', 'At least one field is required'],
  'Unknown permission IDs': ['ID permission tidak dikenal', 'Unknown permission IDs'],
  'Permission IDs must be positive integers': ['ID permission harus berupa bilangan bulat positif', 'Permission IDs must be positive integers'],
  'Role, permission or assignment already exists': ['Role, permission, atau penetapan sudah ada', 'Role, permission or assignment already exists'],
  'Referenced role, permission or user no longer exists': ['Role, permission, atau pengguna yang dirujuk sudah tidak ada', 'Referenced role, permission or user no longer exists'],
  'Role, permission or assignment not found': ['Role, permission, atau penetapan tidak ditemukan', 'Role, permission or assignment not found'],
  'Unable to complete RBAC request': ['Permintaan pengelolaan role dan permission tidak dapat diselesaikan', 'Unable to complete RBAC request'],
  'Invalid role id': ['ID role tidak valid', 'Invalid role id'],
  'Cannot change the name or authority of a system role': ['Nama atau kewenangan role sistem tidak dapat diubah', 'Cannot change the name or authority of a system role'],
  'Cannot delete system roles': ['Role sistem tidak dapat dihapus', 'Cannot delete system roles'],
  'Role name already exists': ['Nama role sudah digunakan', 'Role name already exists'],
  'Cannot delete role with assigned users. Please remove users first.': ['Role masih memiliki pengguna. Hapus penetapan pengguna terlebih dahulu.', 'Cannot delete role with assigned users. Please remove users first.'],
  'System role names are reserved': ['Nama role sistem tidak dapat digunakan untuk role kustom', 'System role names are reserved'],
};

export const rolesMessages: Record<string, MessagePair> = {
  ...rolesErrorMessages,
  'No permissions are registered in this environment. There are no permission assignments available to edit.': ['Belum ada permission terdaftar di lingkungan ini. Tidak ada penetapan permission yang dapat diedit.', 'No permissions are registered in this environment. There are no permission assignments available to edit.'],
  'Remove assigned users before deleting this role.': ['Hapus penetapan pengguna sebelum menghapus role ini.', 'Remove assigned users before deleting this role.'],
  'Manage roles and registered permission assignments': ['Kelola role dan penetapan permission terdaftar', 'Manage roles and registered permission assignments'],
  'Saved permission assignments do not yet govern module or page access. Built-in role rules still apply.': ['Penetapan permission yang disimpan belum mengatur akses modul atau halaman. Aturan role bawaan tetap berlaku.', 'Saved permission assignments do not yet govern module or page access. Built-in role rules still apply.'],
  'Role levels are used for account-management hierarchy. They do not automatically grant module access or Super Admin privileges.': ['Level role digunakan untuk hierarki pengelolaan akun. Level tidak otomatis memberikan akses modul atau hak Super Admin.', 'Role levels are used for account-management hierarchy. They do not automatically grant module access or Super Admin privileges.'],
  'Super Admin access follows built-in role rules, independently of these assignments.': ['Akses Super Admin mengikuti aturan role bawaan, terlepas dari penetapan permission ini.', 'Super Admin access follows built-in role rules, independently of these assignments.'],
  '{selected} of {total} registered permissions selected': ['{selected} dari {total} permission terdaftar dipilih', '{selected} of {total} registered permissions selected'],
  'No permissions registered': ['Belum ada permission terdaftar', 'No permissions registered'],
  'No matching roles': ['Tidak ada role yang cocok', 'No matching roles'],
  'Read-only access': ['Akses hanya baca', 'Read-only access'],
  'Discard permission changes?': ['Buang perubahan permission?', 'Discard permission changes?'],
  'Your unsaved permission selection will be discarded.': ['Pilihan permission yang belum disimpan akan dibuang.', 'Your unsaved permission selection will be discarded.'],
  'Discard changes': ['Buang perubahan', 'Discard changes'],
  'Delete this role and its registered assignments?': ['Hapus role ini beserta penetapan permission terdaftarnya?', 'Delete this role and its registered assignments?'],
};

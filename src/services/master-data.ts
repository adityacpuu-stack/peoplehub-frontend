// Master lists and dropdowns must not silently stop at the API's first page.
export async function collectPages<T extends { id: number }>(fetchPage: (page: number, limit: number) => Promise<{ data: T[]; pagination?: { totalPages: number; total?: number } }>): Promise<T[]> {
  const rows = new Map<number, T>();
  for (let page = 1; ; page++) {
    const result = await fetchPage(page, 100);
    const previousSize = rows.size;
    result.data.forEach(row => rows.set(row.id, row));
    const last = result.pagination ? page >= result.pagination.totalPages : result.data.length < 100;
    if (last) return [...rows.values()];
    if (rows.size === previousSize) throw new Error('Data pagination did not advance');
  }
}

export const organizationEditors = ['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'HR Staff'];
export const calendarLocationEditors = ['Super Admin', 'HR Manager'];
export const hasMasterRole = (roles: string[] | undefined, allowed = organizationEditors) => roles?.some(role => allowed.includes(role)) ?? false;

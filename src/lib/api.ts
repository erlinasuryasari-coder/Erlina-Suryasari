import {
  AsesmenRecord,
  DashboardSummary,
  KoordinasiRecord,
  MitraLayananRecord,
  PendampinganRecord,
  PengaduanDetailResponse,
  PengaduanListItem,
  PengaduanRecord,
  PenugasanRecord,
  PermissionKey,
  PetugasProfile,
  RiwayatAktivitasRecord,
  RoleDefinition,
  RujukanRecord,
  SessionUser,
  StatusPendampingan,
  StatusPengaduan,
  StatusRujukan,
  StatusTindakLanjut,
  UserAccount,
  UserRoleCode,
} from '../types/sigap.ts';

let inMemoryToken: string | null = null;

export function setSessionToken(token: string | null): void {
  inMemoryToken = token;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Permintaan gagal (${response.status})`);
  }
  return data as T;
}

export interface DemoAccountInfo {
  email: string;
  nama: string;
  role: UserRoleCode;
  roleNama: string;
  deskripsi: string;
}

export const api = {
  getDemoAccounts: () =>
    request<{ isDemoSimulation: boolean; accounts: DemoAccountInfo[] }>('/api/auth/demo-accounts'),

  login: async (email: string, password: string) => {
    const res = await request<{ user: SessionUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setSessionToken(res.token);
    return res.user;
  },

  logout: async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setSessionToken(null);
    }
  },

  me: () => request<{ user: SessionUser; isDemoSimulation: boolean }>('/api/auth/me'),

  getDashboard: () => request<DashboardSummary>('/api/dashboard'),

  getPetugas: () => request<{ petugas: PetugasProfile[] }>('/api/petugas'),

  getMitra: () => request<{ mitra: MitraLayananRecord[] }>('/api/mitra'),

  createMitra: (payload: Omit<MitraLayananRecord, 'id'>) =>
    request<{ mitra: MitraLayananRecord }>('/api/mitra', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateMitra: (id: string, payload: Partial<MitraLayananRecord>) =>
    request<{ mitra: MitraLayananRecord }>(`/api/mitra/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getNextNomorRegistrasi: () =>
    request<{ nextNomorRegistrasi: string }>('/api/pengaduan/next-number'),

  getPengaduanList: (params?: { q?: string; status?: string; kategori?: string; kanal?: string }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.status) sp.set('status', params.status);
    if (params?.kategori) sp.set('kategori', params.kategori);
    if (params?.kanal) sp.set('kanal', params.kanal);
    const qs = sp.toString();
    return request<{ items: PengaduanListItem[] }>(`/api/pengaduan${qs ? `?${qs}` : ''}`);
  },

  createPengaduan: (payload: Record<string, unknown>) =>
    request<{ pengaduan: PengaduanRecord }>('/api/pengaduan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getPengaduanDetail: (id: string) => request<PengaduanDetailResponse>(`/api/pengaduan/${id}`),

  updatePengaduanStatus: (id: string, status: StatusPengaduan, butuhTindakLanjut?: boolean) =>
    request<{ pengaduan: PengaduanRecord }>(`/api/pengaduan/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, butuhTindakLanjut }),
    }),

  getAsesmenList: () => request<{ items: AsesmenRecord[] }>('/api/asesmen'),

  createAsesmen: (payload: Record<string, unknown>) =>
    request<{ asesmen: AsesmenRecord }>('/api/asesmen', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getPenugasanList: () => request<{ items: PenugasanRecord[] }>('/api/penugasan'),

  createPenugasan: (payload: Record<string, unknown>) =>
    request<{ penugasan: PenugasanRecord }>('/api/penugasan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePenugasanStatus: (id: string, statusTugas: 'Aktif' | 'Selesai' | 'Dialihkan') =>
    request<{ penugasan: PenugasanRecord }>(`/api/penugasan/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ statusTugas }),
    }),

  getKoordinasiList: () => request<{ items: KoordinasiRecord[] }>('/api/koordinasi'),

  createKoordinasi: (payload: Record<string, unknown>) =>
    request<{ koordinasi: KoordinasiRecord }>('/api/koordinasi', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateKoordinasi: (id: string, payload: { statusTindakLanjut?: StatusTindakLanjut; hasilKoordinasi?: string }) =>
    request<{ koordinasi: KoordinasiRecord }>(`/api/koordinasi/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getPendampinganList: () => request<{ items: PendampinganRecord[] }>('/api/pendampingan'),

  createPendampingan: (payload: Record<string, unknown>) =>
    request<{ pendampingan: PendampinganRecord }>('/api/pendampingan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRujukanList: () => request<{ items: RujukanRecord[] }>('/api/rujukan'),

  createRujukan: (payload: Record<string, unknown>) =>
    request<{ rujukan: RujukanRecord }>('/api/rujukan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateRujukan: (id: string, payload: { statusRujukan?: StatusRujukan; konfirmasiTindakLanjut?: string }) =>
    request<{ rujukan: RujukanRecord }>(`/api/rujukan/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getAdminUsers: () =>
    request<{ users: UserAccount[]; petugas: PetugasProfile[] }>('/api/admin/users'),

  createAdminUser: (payload: Record<string, unknown>) =>
    request<{ user: UserAccount; petugas: PetugasProfile }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAdminUser: (id: string, payload: Record<string, unknown>) =>
    request<{ user: UserAccount }>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getRoles: () => request<{ roles: RoleDefinition[] }>('/api/admin/roles'),

  updateRolePermissions: (code: UserRoleCode, permissions: PermissionKey[]) =>
    request<{ role: RoleDefinition }>(`/api/admin/roles/${code}`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    }),

  getAuditLogs: (params?: { q?: string; modul?: string }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.modul) sp.set('modul', params.modul);
    const qs = sp.toString();
    return request<{ logs: RiwayatAktivitasRecord[]; lastBackupAt: string }>(
      `/api/audit${qs ? `?${qs}` : ''}`
    );
  },

  triggerBackupSnapshot: () =>
    request<{ ok: boolean; lastBackupAt: string }>('/api/admin/backup', { method: 'POST' }),

  resetDemoData: () =>
    request<{ ok: boolean; message: string }>('/api/admin/backup/reset-demo', { method: 'POST' }),

  exportBackupJsonUrl: () => '/api/admin/backup/export',
};

export const KECAMATAN_SIDOARJO = [
  'Balongbendo',
  'Buduran',
  'Candi',
  'Gedangan',
  'Jabon',
  'Krembung',
  'Krian',
  'Prambon',
  'Porong',
  'Sedati',
  'Sidoarjo',
  'Sukodono',
  'Taman',
  'Tanggulangin',
  'Tarik',
  'Tulangan',
  'Waru',
  'Wonoayu',
];

export function formatTanggal(isoDate: string): string {
  if (!isoDate) return '-';
  const d = new Date(isoDate.length === 10 ? `${isoDate}T00:00:00` : isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatWaktuIso(isoDateTime: string): string {
  if (!isoDateTime) return '-';
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return isoDateTime;
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColorClass(status: StatusPengaduan | StatusRujukan | StatusPendampingan | StatusTindakLanjut | string): string {
  switch (status) {
    case StatusPengaduan.BARU_DITERIMA:
    case StatusRujukan.BELUM_DIKIRIM:
    case StatusTindakLanjut.MENUNGGU:
      return 'text-amber-700 bg-amber-50 border-amber-200';
    case StatusPengaduan.DALAM_VERIFIKASI:
    case StatusPengaduan.DALAM_ASESMEN:
    case StatusRujukan.SUDAH_DIKIRIM:
    case StatusPendampingan.TERJADWAL:
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case StatusPengaduan.DALAM_PENANGANAN:
    case StatusRujukan.DALAM_PROSES:
    case StatusPendampingan.BERJALAN:
    case StatusTindakLanjut.DALAM_PROSES:
      return 'text-teal-800 bg-teal-50 border-teal-200';
    case StatusPendampingan.PERLU_LANJUTAN:
      return 'text-orange-700 bg-orange-50 border-orange-200';
    case StatusPengaduan.SELESAI_ADMINISTRATIF:
    case StatusRujukan.SUDAH_DITINDAKLANJUTI:
    case StatusRujukan.SELESAI:
    case StatusPendampingan.SELESAI:
    case StatusTindakLanjut.SELESAI:
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    default:
      return 'text-slate-700 bg-slate-100 border-slate-200';
  }
}

export function hasPerm(user: SessionUser | null, perm: PermissionKey): boolean {
  return Boolean(user && user.permissions.includes(perm));
}

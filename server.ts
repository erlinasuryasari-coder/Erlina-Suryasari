import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import {
  loadDatabase,
  resetToDemoSeed,
  saveDatabase,
  SigapDatabase,
  verifyPassword,
  hashPassword,
} from './server/db.js';
import {
  AsesmenRecord,
  DashboardSummary,
  JenisLayananPendampingan,
  KanalPengaduan,
  KategoriKasus,
  KoordinasiRecord,
  KorbanRecord,
  MitraLayananRecord,
  PendampinganRecord,
  PengaduanDetailResponse,
  PengaduanListItem,
  PengaduanRecord,
  PenugasanRecord,
  PermissionKey,
  PetugasProfile,
  PrioritasKasus,
  RiwayatAktivitasRecord,
  RujukanRecord,
  SessionUser,
  StatusPendampingan,
  StatusPengaduan,
  StatusRujukan,
  StatusTindakLanjut,
  UserRoleCode,
} from './src/types/sigap.js';

dotenv.config();

const PORT = 3000;
const SESSION_COOKIE = 'sigap_ppa_sid';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'sigap-ppa-sidoarjo-secret-2026';

function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + SESSION_TTL_MS })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function verifySessionToken(token: string): { userId: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.userId || typeof data.exp !== 'number' || Date.now() > data.exp) return null;
    return { userId: String(data.userId) };
  } catch {
    return null;
  }
}

let db: SigapDatabase = await loadDatabase();

interface AuthenticatedRequest extends Request {
  sessionUser?: SessionUser;
  sessionToken?: string;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const key = part.slice(0, idx).trim();
      const val = decodeURIComponent(part.slice(idx + 1).trim());
      result[key] = val;
    }
  }
  return result;
}

function buildSessionUser(userId: string): SessionUser | null {
  const user = db.users.find((u) => u.id === userId && u.aktif);
  if (!user) return null;
  const roleDef = db.roles.find((r) => r.code === user.role);
  const petugas = db.petugas.find((p) => p.id === user.petugasId);
  return {
    id: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
    roleNama: roleDef?.nama ?? user.role,
    petugasId: user.petugasId,
    jabatan: petugas?.jabatan ?? 'Petugas UPTD PPA',
    permissions: roleDef?.permissions ?? [],
  };
}

function hasPermission(user: SessionUser, perm: PermissionKey): boolean {
  return user.permissions.includes(perm);
}

function isAssignedToCase(petugasId: string, pengaduanId: string): boolean {
  return db.penugasan.some(
    (t) => t.pengaduanId === pengaduanId && t.petugasId === petugasId && t.statusTugas === 'Aktif'
  );
}

function canViewFullVictimIdentity(user: SessionUser, pengaduanId: string): boolean {
  if (!hasPermission(user, 'korban.view_identitas_penuh')) return false;
  if (user.role === UserRoleCode.PENERIMA_PENGADUAN) return true;
  if (user.role === UserRoleCode.ASESMEN_PENDAMPING) {
    return isAssignedToCase(user.petugasId, pengaduanId);
  }
  return false;
}

function canViewRestrictedAssessmentNotes(user: SessionUser, pengaduanId: string): boolean {
  if (!hasPermission(user, 'asesmen.view_catatan_terbatas')) return false;
  if (user.role === UserRoleCode.ASESMEN_PENDAMPING) {
    return isAssignedToCase(user.petugasId, pengaduanId);
  }
  return false;
}

function maskKorbanRecord(korban: KorbanRecord, allowFull: boolean): KorbanRecord {
  if (allowFull) {
    return { ...korban, isMasked: false };
  }
  return {
    ...korban,
    namaLengkap: `[Identitas Dilindungi — ${korban.kodeAnonim}]`,
    nikSamaran: '3515**********',
    alamatRingkas: `Wilayah Kec. ${korban.kecamatanDomisili} (Detail disamarkan)`,
    kontakAman: '[Dilindungi — Akses Terbatas]',
    isMasked: true,
  };
}

async function appendAudit(
  user: { id: string; nama: string; role: UserRoleCode },
  modul: string,
  aksi: string,
  ringkasan: string,
  entitasId?: string
): Promise<void> {
  const entry: RiwayatAktivitasRecord = {
    id: `LOG-${String(db.riwayatAktivitas.length + 1).padStart(4, '0')}`,
    waktu: new Date().toISOString(),
    userId: user.id,
    userNama: user.nama,
    userRole: user.role,
    modul,
    aksi,
    entitasId,
    ringkasan,
  };
  db.riwayatAktivitas.unshift(entry);
  if (db.riwayatAktivitas.length > 500) {
    db.riwayatAktivitas = db.riwayatAktivitas.slice(0, 500);
  }
  await saveDatabase(db);
}

function extractSessionToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE] ?? '';
}

function buildCookieHeader(req: Request, value: string, maxAgeSec: number): string {
  const isHttps =
    req.secure ||
    String(req.headers['x-forwarded-proto'] || '').toLowerCase().includes('https');
  const sameSite = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax';
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; HttpOnly; Path=/; ${sameSite}; Max-Age=${maxAgeSec}`;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractSessionToken(req);

  if (!token) {
    res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk terlebih dahulu.' });
    return;
  }

  const session = verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' });
    return;
  }

  const sessionUser = buildSessionUser(session.userId);
  if (!sessionUser) {
    res.status(403).json({ error: 'Akun dinonaktifkan atau tidak memiliki akses aktif.' });
    return;
  }

  req.sessionUser = sessionUser;
  req.sessionToken = token;
  next();
}

function requirePermission(...allowed: PermissionKey[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.sessionUser;
    if (!user) {
      res.status(401).json({ error: 'Autentikasi diperlukan.' });
      return;
    }
    const ok = allowed.some((perm) => hasPermission(user, perm));
    if (!ok) {
      res.status(403).json({ error: 'Anda tidak memiliki kewenangan untuk mengakses fitur atau data ini.' });
      return;
    }
    next();
  };
}

function nextRegistrationNumber(increment = false): string {
  const seq = db.meta.sequenceCounter + 1;
  if (increment) {
    db.meta.sequenceCounter = seq;
  }
  const year = new Date().getFullYear();
  return `REG-PPA-SDA-${year}-${String(seq).padStart(4, '0')}`;
}

function buildDashboardSummary(user: SessionUser): DashboardSummary {
  const totalPengaduan = db.pengaduan.length;
  const currentMonthPrefix = '2026-11';
  const pengaduanBulanIni = db.pengaduan.filter((p) =>
    p.tanggalPenerimaan.startsWith(currentMonthPrefix)
  ).length;
  const kasusDalamPenanganan = db.pengaduan.filter(
    (p) => p.status === StatusPengaduan.DALAM_PENANGANAN
  ).length;
  const kasusMenungguAsesmen = db.pengaduan.filter(
    (p) =>
      p.status === StatusPengaduan.BARU_DITERIMA ||
      p.status === StatusPengaduan.DALAM_VERIFIKASI ||
      p.status === StatusPengaduan.DALAM_ASESMEN
  ).length;
  const kasusButuhTindakLanjut = db.pengaduan.filter(
    (p) => p.butuhTindakLanjut && p.status !== StatusPengaduan.SELESAI_ADMINISTRATIF
  ).length;
  const rujukanSedangBerjalan = db.rujukan.filter(
    (r) =>
      r.statusRujukan === StatusRujukan.BELUM_DIKIRIM ||
      r.statusRujukan === StatusRujukan.SUDAH_DIKIRIM ||
      r.statusRujukan === StatusRujukan.DALAM_PROSES
  ).length;
  const kasusSelesaiAdministratif = db.pengaduan.filter(
    (p) => p.status === StatusPengaduan.SELESAI_ADMINISTRATIF
  ).length;

  const months = [
    { key: '2026-06', label: 'Jun' },
    { key: '2026-07', label: 'Jul' },
    { key: '2026-08', label: 'Agu' },
    { key: '2026-09', label: 'Sep' },
    { key: '2026-10', label: 'Okt' },
    { key: '2026-11', label: 'Nov' },
  ];

  const grafikBulanan = months.map((m) => {
    const items = db.pengaduan.filter((p) => p.tanggalPenerimaan.startsWith(m.key));
    return {
      bulan: m.label,
      jumlah: items.length,
      selesai: items.filter((p) => p.status === StatusPengaduan.SELESAI_ADMINISTRATIF).length,
    };
  });

  const kategoriCounts = new Map<string, number>();
  for (const cat of Object.values(KategoriKasus)) {
    kategoriCounts.set(cat, 0);
  }
  for (const p of db.pengaduan) {
    kategoriCounts.set(p.kategori, (kategoriCounts.get(p.kategori) ?? 0) + 1);
  }
  const grafikKategori = Array.from(kategoriCounts.entries())
    .filter(([, jumlah]) => jumlah > 0)
    .map(([kategori, jumlah]) => ({ kategori, jumlah }));

  const grafikStatus = Object.values(StatusPengaduan).map((status) => ({
    status,
    jumlah: db.pengaduan.filter((p) => p.status === status).length,
  }));

  const grafikRujukan = Object.values(StatusRujukan).map((status) => ({
    status,
    jumlah: db.rujukan.filter((r) => r.statusRujukan === status).length,
  }));

  const visiblePendingCases = db.pengaduan.filter((p) => {
    if (p.status === StatusPengaduan.SELESAI_ADMINISTRATIF) return false;
    if (user.role === UserRoleCode.ASESMEN_PENDAMPING) {
      return isAssignedToCase(user.petugasId, p.id);
    }
    return true;
  });

  const tugasTindakLanjut = visiblePendingCases.map((p) => {
    const korban = db.korban.find((k) => k.id === p.korbanId);
    const assigned = db.penugasan
      .filter((t) => t.pengaduanId === p.id && t.statusTugas === 'Aktif')
      .map((t) => t.petugasNama);

    let keterangan = 'Menunggu tindak lanjut petugas';
    if (p.status === StatusPengaduan.BARU_DITERIMA) {
      keterangan = 'Perlu verifikasi awal & penugasan petugas';
    } else if (p.status === StatusPengaduan.DALAM_VERIFIKASI) {
      keterangan = 'Verifikasi berkas & penjadwalan asesmen';
    } else if (p.status === StatusPengaduan.DALAM_ASESMEN) {
      keterangan = 'Asesmen awal & rencana layanan sedang disusun';
    } else if (p.status === StatusPengaduan.DALAM_PENANGANAN) {
      keterangan = 'Pendampingan & koordinasi rujukan aktif';
    }

    return {
      pengaduanId: p.id,
      nomorRegistrasi: p.nomorRegistrasi,
      kategori: p.kategori,
      status: p.status,
      prioritas: p.prioritas,
      tanggalPenerimaan: p.tanggalPenerimaan,
      kodeKorban: korban ? `${korban.kodeAnonim} (${korban.kelompokUsia})` : 'Anonim',
      petugasDitugaskan: assigned.length > 0 ? assigned.join(', ') : 'Belum ditugaskan',
      keterangan,
    };
  });

  const aktivitasTerbaru = db.riwayatAktivitas
    .filter((log) => {
      if (user.role === UserRoleCode.ADMIN || user.role === UserRoleCode.KOORDINATOR) return true;
      return log.userId === user.id || log.modul === 'SIAP LAPOR';
    })
    .slice(0, 8);

  const casesWithAsesmen = new Set(db.asesmen.map((a) => a.pengaduanId)).size;
  const casesWithAssignee = new Set(
    db.penugasan.filter((t) => t.statusTugas === 'Aktif').map((t) => t.pengaduanId)
  ).size;
  const rujukanFollowedUp = db.rujukan.filter(
    (r) =>
      r.statusRujukan === StatusRujukan.SUDAH_DITINDAKLANJUTI ||
      r.statusRujukan === StatusRujukan.SELESAI
  ).length;
  const activeCases = db.pengaduan.filter(
    (p) => p.status !== StatusPengaduan.SELESAI_ADMINISTRATIF
  );
  const activeMonitored = activeCases.filter((p) => {
    const hasTask = db.penugasan.some((t) => t.pengaduanId === p.id && t.statusTugas === 'Aktif');
    return hasTask || p.status === StatusPengaduan.BARU_DITERIMA;
  }).length;

  return {
    kpi: {
      totalPengaduan,
      pengaduanBulanIni,
      kasusDalamPenanganan,
      kasusMenungguAsesmen,
      kasusButuhTindakLanjut,
      rujukanSedangBerjalan,
      kasusSelesaiAdministratif,
    },
    grafikBulanan,
    grafikKategori,
    grafikStatus,
    grafikRujukan,
    tugasTindakLanjut,
    aktivitasTerbaru,
    metrikPrd: {
      pencatatanPengaduanPct: totalPengaduan > 0 ? 100 : 0,
      asesmenAwalPct: totalPengaduan > 0 ? Math.round((casesWithAsesmen / totalPengaduan) * 100) : 0,
      penanggungJawabPct:
        activeCases.length > 0
          ? Math.round((Math.min(casesWithAssignee, activeCases.length) / activeCases.length) * 100)
          : 100,
      tindakLanjutRujukanPct:
        db.rujukan.length > 0 ? Math.round((rujukanFollowedUp / db.rujukan.length) * 100) : 100,
      monitoringAktifPct:
        activeCases.length > 0 ? Math.round((activeMonitored / activeCases.length) * 100) : 100,
      mitraAktifCount: db.mitra.filter((m) => m.aktif).length,
    },
  };
}

const app = express();
app.use(express.json({ limit: '2mb' }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// --- AUTH ENDPOINTS ---
app.get('/api/auth/demo-accounts', (_req, res) => {
  const accounts = db.users
    .filter((u) => u.aktif)
    .map((u) => {
      const roleDef = db.roles.find((r) => r.code === u.role);
      return {
        email: u.email,
        nama: u.nama,
        role: u.role,
        roleNama: roleDef?.nama ?? u.role,
        deskripsi: roleDef?.deskripsi ?? '',
      };
    });
  res.json({
    isDemoSimulation: db.meta.isDemoSimulation,
    accounts,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
    return;
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    res.status(401).json({ error: 'Email atau kata sandi tidak valid.' });
    return;
  }
  if (!user.aktif) {
    res.status(403).json({ error: 'Akun petugas ini telah dinonaktifkan oleh Administrator.' });
    return;
  }
  if (!verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'Email atau kata sandi tidak valid.' });
    return;
  }

  const token = createSessionToken(user.id);

  user.terakhirLogin = new Date().toISOString();
  appendAudit(
    { id: user.id, nama: user.nama, role: user.role },
    'Autentikasi',
    'LOGIN_BERHASIL',
    `Pengguna ${user.nama} masuk dengan peran ${user.role}.`
  );

  const sessionUser = buildSessionUser(user.id);
  res.setHeader(
    'Set-Cookie',
    buildCookieHeader(req, token, Math.floor(SESSION_TTL_MS / 1000))
  );
  res.json({ user: sessionUser, token });
});

app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.sessionUser) {
    appendAudit(
      { id: req.sessionUser.id, nama: req.sessionUser.nama, role: req.sessionUser.role },
      'Autentikasi',
      'LOGOUT',
      `Pengguna ${req.sessionUser.nama} keluar dari sesi.`
    );
  }
  res.setHeader('Set-Cookie', buildCookieHeader(req, '', 0));
  res.json({ ok: true });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const token = extractSessionToken(req);
  const session = token ? verifySessionToken(token) : null;
  if (!session) {
    res.json({ authenticated: false, user: null, isDemoSimulation: db.meta.isDemoSimulation });
    return;
  }
  const sessionUser = buildSessionUser(session.userId);
  if (!sessionUser) {
    res.json({ authenticated: false, user: null, isDemoSimulation: db.meta.isDemoSimulation });
    return;
  }
  res.json({ authenticated: true, user: sessionUser, isDemoSimulation: db.meta.isDemoSimulation });
});

// --- DASHBOARD & MONITORING ---
app.get('/api/dashboard', requireAuth, requirePermission('dashboard.view'), (req: AuthenticatedRequest, res) => {
  res.json(buildDashboardSummary(req.sessionUser!));
});

// --- PETUGAS & MITRA DIRECTORY ---
app.get('/api/petugas', requireAuth, (_req, res) => {
  res.json({ petugas: db.petugas });
});

app.get('/api/mitra', requireAuth, (_req, res) => {
  res.json({ mitra: db.mitra });
});

app.post('/api/mitra', requireAuth, requirePermission('mitra.manage'), (req: AuthenticatedRequest, res) => {
  const { namaLembaga, kategoriSektor, jenisLayanan, kontakKedinasan, wilayahLayanan, alamatKantor, aktif } =
    req.body ?? {};
  if (!namaLembaga || !kategoriSektor || !jenisLayanan || !kontakKedinasan || !wilayahLayanan) {
    res.status(400).json({ error: 'Seluruh kolom wajib direktori mitra harus dilengkapi.' });
    return;
  }
  const newMitra: MitraLayananRecord = {
    id: `MTR-${String(db.mitra.length + 1).padStart(3, '0')}`,
    namaLembaga: String(namaLembaga).trim(),
    kategoriSektor,
    jenisLayanan: String(jenisLayanan).trim(),
    kontakKedinasan: String(kontakKedinasan).trim(),
    wilayahLayanan: String(wilayahLayanan).trim(),
    alamatKantor: String(alamatKantor ?? '').trim() || 'Kabupaten Sidoarjo',
    aktif: aktif !== false,
  };
  db.mitra.push(newMitra);
  appendAudit(
    req.sessionUser!,
    'Direktori Mitra',
    'TAMBAH_MITRA',
    `Menambahkan mitra layanan baru: ${newMitra.namaLembaga}.`,
    newMitra.id
  );
  res.status(201).json({ mitra: newMitra });
});

app.patch('/api/mitra/:id', requireAuth, requirePermission('mitra.manage'), (req: AuthenticatedRequest, res) => {
  const target = db.mitra.find((m) => m.id === req.params.id);
  if (!target) {
    res.status(404).json({ error: 'Data mitra layanan tidak ditemukan.' });
    return;
  }
  const { namaLembaga, kategoriSektor, jenisLayanan, kontakKedinasan, wilayahLayanan, alamatKantor, aktif } =
    req.body ?? {};
  if (namaLembaga !== undefined) target.namaLembaga = String(namaLembaga).trim();
  if (kategoriSektor !== undefined) target.kategoriSektor = kategoriSektor;
  if (jenisLayanan !== undefined) target.jenisLayanan = String(jenisLayanan).trim();
  if (kontakKedinasan !== undefined) target.kontakKedinasan = String(kontakKedinasan).trim();
  if (wilayahLayanan !== undefined) target.wilayahLayanan = String(wilayahLayanan).trim();
  if (alamatKantor !== undefined) target.alamatKantor = String(alamatKantor).trim();
  if (aktif !== undefined) target.aktif = Boolean(aktif);

  appendAudit(
    req.sessionUser!,
    'Direktori Mitra',
    'UBAH_MITRA',
    `Memperbarui data mitra layanan ${target.namaLembaga} (Status aktif: ${target.aktif ? 'Ya' : 'Tidak'}).`,
    target.id
  );
  res.json({ mitra: target });
});

// --- SIAP LAPOR: PENGADUAN ---
app.get('/api/pengaduan/next-number', requireAuth, (_req, res) => {
  res.json({ nextNomorRegistrasi: nextRegistrationNumber(false) });
});

app.get('/api/pengaduan', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const canViewAll = hasPermission(user, 'pengaduan.view_all');
  const canViewAssigned = hasPermission(user, 'pengaduan.view_assigned');
  if (!canViewAll && !canViewAssigned) {
    res.status(403).json({ error: 'Anda tidak memiliki akses ke daftar pengaduan.' });
    return;
  }

  const q = String(req.query.q ?? '').trim().toLowerCase();
  const statusFilter = String(req.query.status ?? '').trim();
  const kategoriFilter = String(req.query.kategori ?? '').trim();
  const kanalFilter = String(req.query.kanal ?? '').trim();

  let list = db.pengaduan.slice();
  if (!canViewAll && canViewAssigned) {
    list = list.filter((p) => isAssignedToCase(user.petugasId, p.id));
  }

  if (statusFilter) {
    list = list.filter((p) => p.status === statusFilter);
  }
  if (kategoriFilter) {
    list = list.filter((p) => p.kategori === kategoriFilter);
  }
  if (kanalFilter) {
    list = list.filter((p) => p.kanal === kanalFilter);
  }
  if (q) {
    list = list.filter((p) => {
      const korban = db.korban.find((k) => k.id === p.korbanId);
      return (
        p.nomorRegistrasi.toLowerCase().includes(q) ||
        p.kategori.toLowerCase().includes(q) ||
        p.kecamatanKejadian.toLowerCase().includes(q) ||
        p.ringkasanPengaduan.toLowerCase().includes(q) ||
        (korban && korban.kodeAnonim.toLowerCase().includes(q))
      );
    });
  }

  const items: PengaduanListItem[] = list
    .sort((a, b) => b.tanggalPenerimaan.localeCompare(a.tanggalPenerimaan))
    .map((p) => {
      const korban = db.korban.find((k) => k.id === p.korbanId);
      const allowFull = canViewFullVictimIdentity(user, p.id);
      const activeTasks = db.penugasan.filter((t) => t.pengaduanId === p.id && t.statusTugas === 'Aktif');
      return {
        pengaduan: p,
        korbanRingkas: {
          kodeAnonim: korban?.kodeAnonim ?? '-',
          inisial: korban?.inisial ?? '-',
          kelompokUsia: korban?.kelompokUsia ?? '-',
          kecamatanDomisili: korban?.kecamatanDomisili ?? p.kecamatanKejadian,
          namaTampil: allowFull && korban ? korban.namaLengkap : `${korban?.kodeAnonim ?? '-'} (${korban?.inisial ?? 'Anonim'})`,
        },
        assignedPetugasIds: activeTasks.map((t) => t.petugasId),
        assignedPetugasNames: Array.from(new Set(activeTasks.map((t) => t.petugasNama))),
        hasAsesmen: db.asesmen.some((a) => a.pengaduanId === p.id),
        jumlahKoordinasi: db.koordinasi.filter((k) => k.pengaduanId === p.id).length,
        jumlahPendampingan: db.pendampingan.filter((d) => d.pengaduanId === p.id).length,
        jumlahRujukan: db.rujukan.filter((r) => r.pengaduanId === p.id).length,
      };
    });

  res.json({ items });
});

app.post('/api/pengaduan', requireAuth, requirePermission('pengaduan.create'), (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const body = req.body ?? {};
  const {
    tanggalPenerimaan,
    waktuPenerimaan,
    kanal,
    kategori,
    prioritas,
    kecamatanKejadian,
    namaPelapor,
    statusPelapor,
    kontakPelapor,
    ringkasanPengaduan,
    status,
    korban,
  } = body;

  if (
    !tanggalPenerimaan ||
    !kanal ||
    !kategori ||
    !kecamatanKejadian ||
    !namaPelapor ||
    !ringkasanPengaduan ||
    !korban?.inisial ||
    !korban?.kelompokUsia
  ) {
    res.status(400).json({
      error: 'Data wajib pengaduan (tanggal, kanal, kategori, kecamatan, pelapor, ringkasan, dan inisial/kelompok usia korban) harus diisi.',
    });
    return;
  }

  const validStatuses = Object.values(StatusPengaduan);
  const initialStatus: StatusPengaduan = validStatuses.includes(status)
    ? status
    : StatusPengaduan.BARU_DITERIMA;

  const pengaduanId = `PGD-${String(db.pengaduan.length + 1).padStart(3, '0')}`;
  const korbanId = `KBN-${String(db.korban.length + 1).padStart(3, '0')}`;
  const nomorRegistrasi = nextRegistrationNumber(true);
  const kodeAnonim = `KBN-${new Date().getFullYear()}-${String(db.meta.sequenceCounter).padStart(3, '0')}`;

  const newKorban: KorbanRecord = {
    id: korbanId,
    pengaduanId,
    kodeAnonim,
    inisial: String(korban.inisial).trim(),
    namaLengkap: String(korban.namaLengkap || korban.inisial).trim(),
    nikSamaran: String(korban.nikSamaran || '3515**********').trim(),
    kelompokUsia: korban.kelompokUsia,
    usia: Number(korban.usia) || (korban.kelompokUsia === 'Anak (< 18 tahun)' ? 14 : 28),
    jenisKelamin: korban.jenisKelamin === 'Laki-laki' ? 'Laki-laki' : 'Perempuan',
    kecamatanDomisili: String(korban.kecamatanDomisili || kecamatanKejadian).trim(),
    alamatRingkas: String(korban.alamatRingkas || `Kec. ${kecamatanKejadian}`).trim(),
    kontakAman: String(korban.kontakAman || kontakPelapor || '-').trim(),
    hubunganPelapor: String(korban.hubunganPelapor || statusPelapor || 'Pelapor').trim(),
  };

  const newPengaduan: PengaduanRecord = {
    id: pengaduanId,
    nomorRegistrasi,
    tanggalPenerimaan: String(tanggalPenerimaan),
    waktuPenerimaan: String(waktuPenerimaan || '09:00'),
    kanal: kanal as KanalPengaduan,
    kategori: kategori as KategoriKasus,
    prioritas: (prioritas as PrioritasKasus) || PrioritasKasus.STANDAR,
    kecamatanKejadian: String(kecamatanKejadian).trim(),
    namaPelapor: String(namaPelapor).trim(),
    statusPelapor: String(statusPelapor || 'Pelapor Langsung').trim(),
    kontakPelapor: String(kontakPelapor || '-').trim(),
    ringkasanPengaduan: String(ringkasanPengaduan).trim(),
    petugasPenerimaId: user.petugasId,
    petugasPenerimaNama: user.nama,
    status: initialStatus,
    korbanId,
    butuhTindakLanjut: initialStatus !== StatusPengaduan.SELESAI_ADMINISTRATIF,
    diperbaruiPada: new Date().toISOString(),
  };

  db.korban.push(newKorban);
  db.pengaduan.push(newPengaduan);

  appendAudit(
    user,
    'SIAP LAPOR',
    'BUAT_PENGADUAN',
    `Mencatat pengaduan baru ${nomorRegistrasi} kategori ${kategori} melalui kanal ${kanal}.`,
    nomorRegistrasi
  );

  res.status(201).json({ pengaduan: newPengaduan, korban: newKorban });
});

app.get('/api/pengaduan/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const pengaduan = db.pengaduan.find((p) => p.id === req.params.id);
  if (!pengaduan) {
    res.status(404).json({ error: 'Pengaduan tidak ditemukan.' });
    return;
  }

  const canViewAll = hasPermission(user, 'pengaduan.view_all');
  const assigned = isAssignedToCase(user.petugasId, pengaduan.id);
  if (!canViewAll && !(hasPermission(user, 'pengaduan.view_assigned') && assigned)) {
    res.status(403).json({ error: 'Anda tidak ditugaskan pada kasus ini sehingga tidak memiliki akses.' });
    return;
  }

  const rawKorban = db.korban.find((k) => k.id === pengaduan.korbanId);
  if (!rawKorban) {
    res.status(404).json({ error: 'Data korban terkait kasus tidak ditemukan.' });
    return;
  }
  const allowFullIdentity = canViewFullVictimIdentity(user, pengaduan.id);
  const allowRestrictedNotes = canViewRestrictedAssessmentNotes(user, pengaduan.id);

  const asesmenList = db.asesmen
    .filter((a) => a.pengaduanId === pengaduan.id)
    .map((a) => ({
      ...a,
      catatanTerbatas: allowRestrictedNotes
        ? a.catatanTerbatas
        : '[Catatan asesmen bersifat rahasia — hanya dapat diakses oleh Petugas Asesmen/Pendamping yang ditugaskan]',
      aksesTerbatasMasked: !allowRestrictedNotes,
    }));

  const detail: PengaduanDetailResponse = {
    pengaduan,
    korban: maskKorbanRecord(rawKorban, allowFullIdentity),
    asesmen: asesmenList,
    penugasan: db.penugasan.filter((t) => t.pengaduanId === pengaduan.id),
    koordinasi: db.koordinasi.filter((k) => k.pengaduanId === pengaduan.id),
    pendampingan: db.pendampingan.filter((d) => d.pengaduanId === pengaduan.id),
    rujukan: db.rujukan.filter((r) => r.pengaduanId === pengaduan.id),
    aktivitasKasus: db.riwayatAktivitas.filter((l) => l.entitasId === pengaduan.nomorRegistrasi),
    canAccessFullVictimIdentity: allowFullIdentity,
    canAccessRestrictedNotes: allowRestrictedNotes,
    canEditCase:
      hasPermission(user, 'pengaduan.update_status') &&
      (user.role !== UserRoleCode.ASESMEN_PENDAMPING || assigned),
  };

  appendAudit(
    user,
    'Detail Kasus',
    'LIHAT_DETAIL_KASUS',
    `Mengakses detail kasus ${pengaduan.nomorRegistrasi} (Identitas penuh: ${allowFullIdentity ? 'Terbuka sesuai kewenangan' : 'Disamarkan'}).`,
    pengaduan.nomorRegistrasi
  );

  res.json(detail);
});

app.patch(
  '/api/pengaduan/:id/status',
  requireAuth,
  requirePermission('pengaduan.update_status'),
  (req: AuthenticatedRequest, res) => {
    const user = req.sessionUser!;
    const pengaduan = db.pengaduan.find((p) => p.id === req.params.id);
    if (!pengaduan) {
      res.status(404).json({ error: 'Pengaduan tidak ditemukan.' });
      return;
    }
    if (user.role === UserRoleCode.ASESMEN_PENDAMPING && !isAssignedToCase(user.petugasId, pengaduan.id)) {
      res.status(403).json({ error: 'Hanya petugas yang ditugaskan yang dapat memperbarui status kasus ini.' });
      return;
    }
    const { status, butuhTindakLanjut } = req.body ?? {};
    if (!Object.values(StatusPengaduan).includes(status)) {
      res.status(400).json({ error: 'Status pengaduan tidak valid.' });
      return;
    }

    const prevStatus = pengaduan.status;
    pengaduan.status = status;
    pengaduan.butuhTindakLanjut =
      status === StatusPengaduan.SELESAI_ADMINISTRATIF
        ? false
        : butuhTindakLanjut !== undefined
          ? Boolean(butuhTindakLanjut)
          : pengaduan.butuhTindakLanjut;
    pengaduan.diperbaruiPada = new Date().toISOString();

    appendAudit(
      user,
      'SIAP LAPOR',
      'UBAH_STATUS_KASUS',
      `Mengubah status ${pengaduan.nomorRegistrasi} dari "${prevStatus}" menjadi "${status}".`,
      pengaduan.nomorRegistrasi
    );

    res.json({ pengaduan });
  }
);

// --- SIAP ASESMEN ---
app.get('/api/asesmen', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const canViewAll = hasPermission(user, 'pengaduan.view_all');
  const canViewAssigned = hasPermission(user, 'pengaduan.view_assigned');
  if (!canViewAll && !canViewAssigned) {
    res.status(403).json({ error: 'Akses ke daftar asesmen ditolak.' });
    return;
  }

  const list = db.asesmen
    .filter((a) => canViewAll || isAssignedToCase(user.petugasId, a.pengaduanId))
    .map((a) => {
      const allowNotes = canViewRestrictedAssessmentNotes(user, a.pengaduanId);
      return {
        ...a,
        catatanTerbatas: allowNotes
          ? a.catatanTerbatas
          : '[Catatan asesmen bersifat rahasia — hanya untuk Petugas Asesmen/Pendamping yang ditugaskan]',
        aksesTerbatasMasked: !allowNotes,
      };
    });

  res.json({ items: list });
});

app.post('/api/asesmen', requireAuth, requirePermission('asesmen.manage'), (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const body = req.body ?? {};
  const {
    pengaduanId,
    tanggalAsesmen,
    kebutuhanKorban,
    kebutuhanPerlindungan,
    butuhLayananPsikologis,
    rincianPsikologis,
    butuhLayananHukum,
    rincianHukum,
    butuhLayananKesehatan,
    rincianKesehatan,
    rencanaTindakLanjut,
    catatanTerbatas,
  } = body;

  const pengaduan = db.pengaduan.find((p) => p.id === pengaduanId);
  if (!pengaduan) {
    res.status(404).json({ error: 'Kasus pengaduan tidak ditemukan.' });
    return;
  }
  if (user.role === UserRoleCode.ASESMEN_PENDAMPING && !isAssignedToCase(user.petugasId, pengaduan.id)) {
    res.status(403).json({ error: 'Anda tidak ditugaskan pada kasus ini.' });
    return;
  }
  if (!kebutuhanKorban || !kebutuhanPerlindungan || !rencanaTindakLanjut) {
    res.status(400).json({
      error: 'Kebutuhan korban, identifikasi kebutuhan perlindungan, dan rencana tindak lanjut wajib diisi.',
    });
    return;
  }

  const newAsesmen: AsesmenRecord = {
    id: `ASM-${String(db.asesmen.length + 1).padStart(3, '0')}`,
    pengaduanId: pengaduan.id,
    nomorRegistrasi: pengaduan.nomorRegistrasi,
    tanggalAsesmen: String(tanggalAsesmen || new Date().toISOString().slice(0, 10)),
    petugasAsesmenId: user.petugasId,
    petugasAsesmenNama: user.nama,
    kebutuhanKorban: String(kebutuhanKorban).trim(),
    kebutuhanPerlindungan: String(kebutuhanPerlindungan).trim(),
    butuhLayananPsikologis: Boolean(butuhLayananPsikologis),
    rincianPsikologis: String(rincianPsikologis || '-').trim(),
    butuhLayananHukum: Boolean(butuhLayananHukum),
    rincianHukum: String(rincianHukum || '-').trim(),
    butuhLayananKesehatan: Boolean(butuhLayananKesehatan),
    rincianKesehatan: String(rincianKesehatan || '-').trim(),
    rencanaTindakLanjut: String(rencanaTindakLanjut).trim(),
    catatanTerbatas: String(catatanTerbatas || 'Tidak ada catatan khusus.').trim(),
    dibuatPada: new Date().toISOString(),
  };

  db.asesmen.unshift(newAsesmen);
  if (
    pengaduan.status === StatusPengaduan.BARU_DITERIMA ||
    pengaduan.status === StatusPengaduan.DALAM_VERIFIKASI
  ) {
    pengaduan.status = StatusPengaduan.DALAM_ASESMEN;
    pengaduan.diperbaruiPada = new Date().toISOString();
  }

  appendAudit(
    user,
    'SIAP ASESMEN',
    'SIMPAN_ASESMEN',
    `Menyimpan instrumen asesmen awal untuk ${pengaduan.nomorRegistrasi}.`,
    pengaduan.nomorRegistrasi
  );

  res.status(201).json({ asesmen: newAsesmen });
});

// --- PENUGASAN PETUGAS ---
app.get('/api/penugasan', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const canViewAll = hasPermission(user, 'pengaduan.view_all');
  const items = canViewAll
    ? db.penugasan
    : db.penugasan.filter((t) => t.petugasId === user.petugasId);
  res.json({ items });
});

app.post('/api/penugasan', requireAuth, requirePermission('penugasan.manage'), (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const { pengaduanId, petugasId, peranTugas, targetTindakLanjut, catatanPenugasan } = req.body ?? {};
  const pengaduan = db.pengaduan.find((p) => p.id === pengaduanId);
  const petugas = db.petugas.find((p) => p.id === petugasId && p.aktif);

  if (!pengaduan || !petugas) {
    res.status(400).json({ error: 'Kasus pengaduan atau petugas aktif tidak valid.' });
    return;
  }

  const newTask: PenugasanRecord = {
    id: `TGS-${String(db.penugasan.length + 1).padStart(3, '0')}`,
    pengaduanId: pengaduan.id,
    nomorRegistrasi: pengaduan.nomorRegistrasi,
    petugasId: petugas.id,
    petugasNama: petugas.nama,
    peranTugas: peranTugas || 'Penanggung Jawab Kasus',
    tanggalPenugasan: new Date().toISOString().slice(0, 10),
    targetTindakLanjut: String(targetTindakLanjut || new Date().toISOString().slice(0, 10)),
    catatanPenugasan: String(catatanPenugasan || 'Segera lakukan asesmen dan koordinasi layanan.').trim(),
    ditugaskanOleh: user.nama,
    statusTugas: 'Aktif',
  };

  db.penugasan.unshift(newTask);
  if (pengaduan.status === StatusPengaduan.BARU_DITERIMA) {
    pengaduan.status = StatusPengaduan.DALAM_VERIFIKASI;
    pengaduan.diperbaruiPada = new Date().toISOString();
  }

  appendAudit(
    user,
    'Penugasan',
    'TUGASKAN_PETUGAS',
    `Menugaskan ${petugas.nama} sebagai ${newTask.peranTugas} pada ${pengaduan.nomorRegistrasi}.`,
    pengaduan.nomorRegistrasi
  );

  res.status(201).json({ penugasan: newTask });
});

app.patch('/api/penugasan/:id', requireAuth, requirePermission('penugasan.manage'), (req: AuthenticatedRequest, res) => {
  const task = db.penugasan.find((t) => t.id === req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Data penugasan tidak ditemukan.' });
    return;
  }
  const { statusTugas } = req.body ?? {};
  if (!['Aktif', 'Selesai', 'Dialihkan'].includes(statusTugas)) {
    res.status(400).json({ error: 'Status penugasan tidak valid.' });
    return;
  }
  task.statusTugas = statusTugas;
  appendAudit(
    req.sessionUser!,
    'Penugasan',
    'UBAH_STATUS_TUGAS',
    `Mengubah status penugasan ${task.petugasNama} pada ${task.nomorRegistrasi} menjadi ${statusTugas}.`,
    task.nomorRegistrasi
  );
  res.json({ penugasan: task });
});

// --- SIAP KOORDINASI ---
app.get('/api/koordinasi', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const canViewAll = hasPermission(user, 'pengaduan.view_all');
  const items = canViewAll
    ? db.koordinasi
    : db.koordinasi.filter((k) => isAssignedToCase(user.petugasId, k.pengaduanId));
  res.json({ items });
});

app.post('/api/koordinasi', requireAuth, requirePermission('koordinasi.manage'), (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const { pengaduanId, mitraId, instansiDikoordinasikan, jenisKebutuhan, tanggalKoordinasi, hasilKoordinasi, statusTindakLanjut } =
    req.body ?? {};

  const pengaduan = db.pengaduan.find((p) => p.id === pengaduanId);
  if (!pengaduan) {
    res.status(404).json({ error: 'Kasus pengaduan tidak ditemukan.' });
    return;
  }
  if (user.role === UserRoleCode.ASESMEN_PENDAMPING && !isAssignedToCase(user.petugasId, pengaduan.id)) {
    res.status(403).json({ error: 'Anda tidak ditugaskan pada kasus ini.' });
    return;
  }
  const mitra = db.mitra.find((m) => m.id === mitraId);
  const namaInstansi = mitra ? mitra.namaLembaga : String(instansiDikoordinasikan || '').trim();
  if (!namaInstansi || !jenisKebutuhan || !hasilKoordinasi) {
    res.status(400).json({ error: 'Instansi, jenis kebutuhan koordinasi, dan hasil koordinasi wajib diisi.' });
    return;
  }

  const record: KoordinasiRecord = {
    id: `KRD-${String(db.koordinasi.length + 1).padStart(3, '0')}`,
    pengaduanId: pengaduan.id,
    nomorRegistrasi: pengaduan.nomorRegistrasi,
    mitraId: mitra?.id ?? 'MITRA-LAIN',
    instansiDikoordinasikan: namaInstansi,
    jenisKebutuhan: String(jenisKebutuhan).trim(),
    tanggalKoordinasi: String(tanggalKoordinasi || new Date().toISOString().slice(0, 10)),
    petugasPenanggungJawabId: user.petugasId,
    petugasPenanggungJawabNama: user.nama,
    hasilKoordinasi: String(hasilKoordinasi).trim(),
    statusTindakLanjut: Object.values(StatusTindakLanjut).includes(statusTindakLanjut)
      ? statusTindakLanjut
      : StatusTindakLanjut.DALAM_PROSES,
  };

  db.koordinasi.unshift(record);
  appendAudit(
    user,
    'SIAP KOORDINASI',
    'CATAT_KOORDINASI',
    `Mencatat koordinasi dengan ${namaInstansi} untuk ${pengaduan.nomorRegistrasi}.`,
    pengaduan.nomorRegistrasi
  );
  res.status(201).json({ koordinasi: record });
});

app.patch('/api/koordinasi/:id', requireAuth, requirePermission('koordinasi.manage'), (req: AuthenticatedRequest, res) => {
  const item = db.koordinasi.find((k) => k.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Data koordinasi tidak ditemukan.' });
    return;
  }
  const { statusTindakLanjut, hasilKoordinasi } = req.body ?? {};
  if (statusTindakLanjut && Object.values(StatusTindakLanjut).includes(statusTindakLanjut)) {
    item.statusTindakLanjut = statusTindakLanjut;
  }
  if (hasilKoordinasi !== undefined) {
    item.hasilKoordinasi = String(hasilKoordinasi).trim();
  }
  appendAudit(
    req.sessionUser!,
    'SIAP KOORDINASI',
    'UBAH_KOORDINASI',
    `Memperbarui tindak lanjut koordinasi ${item.instansiDikoordinasikan} pada ${item.nomorRegistrasi}.`,
    item.nomorRegistrasi
  );
  res.json({ koordinasi: item });
});

// --- SIAP DAMPING ---
app.get('/api/pendampingan', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const canViewAll = hasPermission(user, 'pengaduan.view_all');
  const items = canViewAll
    ? db.pendampingan
    : db.pendampingan.filter((d) => isAssignedToCase(user.petugasId, d.pengaduanId));
  res.json({ items });
});

app.post('/api/pendampingan', requireAuth, requirePermission('pendampingan.manage'), (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const {
    pengaduanId,
    tanggalPendampingan,
    jenisLayanan,
    bentukPendampingan,
    catatanPerkembangan,
    statusPendampingan,
  } = req.body ?? {};

  const pengaduan = db.pengaduan.find((p) => p.id === pengaduanId);
  if (!pengaduan) {
    res.status(404).json({ error: 'Kasus pengaduan tidak ditemukan.' });
    return;
  }
  if (user.role === UserRoleCode.ASESMEN_PENDAMPING && !isAssignedToCase(user.petugasId, pengaduan.id)) {
    res.status(403).json({ error: 'Anda tidak ditugaskan pada kasus ini.' });
    return;
  }
  if (!jenisLayanan || !bentukPendampingan || !catatanPerkembangan) {
    res.status(400).json({ error: 'Jenis layanan, bentuk pendampingan, dan catatan perkembangan wajib diisi.' });
    return;
  }

  const record: PendampinganRecord = {
    id: `DMP-${String(db.pendampingan.length + 1).padStart(3, '0')}`,
    pengaduanId: pengaduan.id,
    nomorRegistrasi: pengaduan.nomorRegistrasi,
    tanggalPendampingan: String(tanggalPendampingan || new Date().toISOString().slice(0, 10)),
    petugasPendampingId: user.petugasId,
    petugasPendampingNama: user.nama,
    jenisLayanan: Object.values(JenisLayananPendampingan).includes(jenisLayanan)
      ? jenisLayanan
      : JenisLayananPendampingan.LAINNYA,
    bentukPendampingan: String(bentukPendampingan).trim(),
    catatanPerkembangan: String(catatanPerkembangan).trim(),
    statusPendampingan: Object.values(StatusPendampingan).includes(statusPendampingan)
      ? statusPendampingan
      : StatusPendampingan.BERJALAN,
  };

  db.pendampingan.unshift(record);
  if (pengaduan.status !== StatusPengaduan.SELESAI_ADMINISTRATIF) {
    pengaduan.status = StatusPengaduan.DALAM_PENANGANAN;
    pengaduan.diperbaruiPada = new Date().toISOString();
  }

  appendAudit(
    user,
    'SIAP DAMPING',
    'CATAT_PENDAMPINGAN',
    `Mencatat ${record.jenisLayanan} untuk ${pengaduan.nomorRegistrasi}.`,
    pengaduan.nomorRegistrasi
  );

  res.status(201).json({ pendampingan: record });
});

// --- SIAP RUJUK ---
app.get('/api/rujukan', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const canViewAll = hasPermission(user, 'pengaduan.view_all');
  const items = canViewAll
    ? db.rujukan
    : db.rujukan.filter((r) => isAssignedToCase(user.petugasId, r.pengaduanId));
  res.json({ items });
});

('/api/rujukan', requireAuth, requirePermission('rujukan.manage'), (req: AuthenticatedRequest, res) => {
  const user = req.sessionUser!;
  const {
    pengaduanId,
    mitraId,
    namaLembagaTujuan,
    jenisLayananDibutuhkan,
    alasanRujukan,
    tanggalRujukan,
    statusRujukan,
    konfirmasiTindakLanjut,
  } = req.body ?? {};

  const pengaduan = db.pengaduan.find((p) => p.id === pengaduanId);
  if (!pengaduan) {
    res.status(404).json({ error: 'Kasus pengaduan tidak ditemukan.' });
    return;
  }
  if (user.role === UserRoleCode.ASESMEN_PENDAMPING && !isAssignedToCase(user.petugasId, pengaduan.id)) {
    res.status(403).json({ error: 'Anda tidak ditugaskan pada kasus ini.' });
    return;
  }
  const mitra = db.mitra.find((m) => m.id === mitraId);
  const lembaga = mitra ? mitra.namaLembaga : String(namaLembagaTujuan || '').trim();
  if (!lembaga || !jenisLayananDibutuhkan || !alasanRujukan) {
    res.status(400).json({ error: 'Lembaga tujuan, jenis layanan, dan alasan rujukan wajib diisi.' });
    return;
  }

  const record: RujukanRecord = {
    id: `RJK-${String(db.rujukan.length + 1).padStart(3, '0')}`,
    pengaduanId: pengaduan.id,
    nomorRegistrasi: pengaduan.nomorRegistrasi,
    mitraId: mitra?.id ?? 'MITRA-LAIN',
    namaLembagaTujuan: lembaga,
    jenisLayananDibutuhkan: String(jenisLayananDibutuhkan).trim(),
    alasanRujukan: String(alasanRujukan).trim(),
    tanggalRujukan: String(tanggalRujukan || new Date().toISOString().slice(0, 10)),
    petugasPengirimId: user.petugasId,
    petugasPengirimNama: user.nama,
    statusRujukan: Object.values(StatusRujukan).includes(statusRujukan)
      ? statusRujukan
      : StatusRujukan.SUDAH_DIKIRIM,
    konfirmasiTindakLanjut: String(konfirmasiTindakLanjut || 'Menunggu konfirmasi tindak lanjut dari mitra.').trim(),
  };

  db.rujukan.unshift(record);
  appendAudit(
    user,
    'SIAP RUJUK',
    'BUAT_RUJUKAN',
    `Membuat rujukan ke ${lembaga} untuk kasus ${pengaduan.nomorRegistrasi}.`,
    pengaduan.nomorRegistrasi
  );
  res.status(201).json({ rujukan: record });
});

app.patch('/api/rujukan/:id', requireAuth, requirePermission('rujukan.manage'), (req: AuthenticatedRequest, res) => {
  const item = db.rujukan.find((r) => r.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Data rujukan tidak ditemukan.' });
    return;
  }
  const user = req.sessionUser!;
  if (user.role === UserRoleCode.ASESMEN_PENDAMPING && !isAssignedToCase(user.petugasId, item.pengaduanId)) {
    res.status(403).json({ error: 'Anda tidak ditugaskan pada kasus ini.' });
    return;
  }

  const { statusRujukan, konfirmasiTindakLanjut } = req.body ?? {};
  if (statusRujukan && Object.values(StatusRujukan).includes(statusRujukan)) {
    item.statusRujukan = statusRujukan;
    if (
      statusRujukan === StatusRujukan.SUDAH_DITINDAKLANJUTI ||
      statusRujukan === StatusRujukan.SELESAI
    ) {
      item.tanggalKonfirmasi = new Date().toISOString().slice(0, 10);
    }
  }
  if (konfirmasiTindakLanjut !== undefined) {
    item.konfirmasiTindakLanjut = String(konfirmasiTindakLanjut).trim();
  }

  appendAudit(
    user,
    'SIAP RUJUK',
    'UPDATE_RUJUKAN',
    `Memperbarui status rujukan ${item.id} menjadi "${item.statusRujukan}".`,
    item.nomorRegistrasi
  );
  res.json({ rujukan: item });
});

// --- ADMIN: USERS, ROLES, AUDIT, BACKUP ---
app.get('/api/admin/users', requireAuth, requirePermission('users.manage'), (_req, res) => {
  const safeUsers = db.users.map(({ passwordHash: _ph, ...rest }) => rest);
  res.json({ users: safeUsers, petugas: db.petugas });
});

app.post('/api/admin/users', requireAuth, requirePermission('users.manage'), (req: AuthenticatedRequest, res) => {
  const { email, nama, role, jabatan, bidang, teleponKedinasan, nipSimulasi, password } = req.body ?? {};
  if (!email || !nama || !role) {
    res.status(400).json({ error: 'Email, nama lengkap, dan peran pengguna wajib diisi.' });
    return;
  }
  if (!Object.values(UserRoleCode).includes(role)) {
    res.status(400).json({ error: 'Kode peran tidak valid.' });
    return;
  }
  if (db.users.some((u) => u.email.toLowerCase() === String(email).trim().toLowerCase())) {
    res.status(409).json({ error: 'Email tersebut sudah terdaftar.' });
    return;
  }

  const petugasId = `PTG-${String(db.petugas.length + 1).padStart(3, '0')}`;
  const userId = `USR-${String(db.users.length + 1).padStart(3, '0')}`;

  const newPetugas: PetugasProfile = {
    id: petugasId,
    nipSimulasi: String(nipSimulasi || '19950101 202401 1 000 (Simulasi)').trim(),
    nama: String(nama).trim(),
    jabatan: String(jabatan || 'Petugas UPTD PPA').trim(),
    bidang: String(bidang || 'Pelayanan Terpadu').trim(),
    role,
    teleponKedinasan: String(teleponKedinasan || '(031) 894-0001').trim(),
    aktif: true,
  };

  const newUser = {
    id: userId,
    email: String(email).trim().toLowerCase(),
    nama: String(nama).trim(),
    role,
    petugasId,
    aktif: true,
    dibuatPada: new Date().toISOString(),
    passwordHash: hashPassword(String(password || 'DemoSigap2026!')),
  };

  db.petugas.push(newPetugas);
  db.users.push(newUser);
  appendAudit(
    req.sessionUser!,
    'Manajemen Pengguna',
    'TAMBAH_PENGGUNA',
    `Menambahkan akun petugas baru: ${newUser.nama} (${newUser.role}).`,
    newUser.id
  );

  const { passwordHash: _ph, ...safeUser } = newUser;
  res.status(201).json({ user: safeUser, petugas: newPetugas });
});

app.patch('/api/admin/users/:id', requireAuth, requirePermission('users.manage'), (req: AuthenticatedRequest, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    return;
  }
  const { aktif, role, nama, resetPassword } = req.body ?? {};
  if (aktif !== undefined) {
    if (user.id === req.sessionUser!.id && aktif === false) {
      res.status(400).json({ error: 'Tidak dapat menonaktifkan akun yang sedang Anda gunakan.' });
      return;
    }
    user.aktif = Boolean(aktif);
    const ptg = db.petugas.find((p) => p.id === user.petugasId);
    if (ptg) ptg.aktif = Boolean(aktif);
  }
  if (role && Object.values(UserRoleCode).includes(role)) {
    user.role = role;
    const ptg = db.petugas.find((p) => p.id === user.petugasId);
    if (ptg) ptg.role = role;
  }
  if (nama !== undefined) {
    user.nama = String(nama).trim();
    const ptg = db.petugas.find((p) => p.id === user.petugasId);
    if (ptg) ptg.nama = String(nama).trim();
  }
  if (resetPassword) {
    user.passwordHash = hashPassword('DemoSigap2026!');
  }

  appendAudit(
    req.sessionUser!,
    'Manajemen Pengguna',
    'UBAH_PENGGUNA',
    `Memperbarui akun ${user.nama} (Aktif: ${user.aktif ? 'Ya' : 'Nonaktif'}, Peran: ${user.role}).`,
    user.id
  );
  const { passwordHash: _ph, ...safeUser } = user;
  res.json({ user: safeUser });
});

app.get('/api/admin/roles', requireAuth, (_req, res) => {
  res.json({ roles: db.roles });
});

app.patch('/api/admin/roles/:code', requireAuth, requirePermission('users.manage'), (req: AuthenticatedRequest, res) => {
  const roleDef = db.roles.find((r) => r.code === req.params.code);
  if (!roleDef) {
    res.status(404).json({ error: 'Definisi peran tidak ditemukan.' });
    return;
  }
  const { permissions } = req.body ?? {};
  if (!Array.isArray(permissions)) {
    res.status(400).json({ error: 'Daftar hak akses harus berupa larik.' });
    return;
  }
  roleDef.permissions = permissions;
  appendAudit(
    req.sessionUser!,
    'Pengaturan RBAC',
    'UBAH_MATRIKS_AKSES',
    `Memperbarui matriks hak akses peran ${roleDef.nama} (${permissions.length} izin aktif).`,
    roleDef.code
  );
  res.json({ role: roleDef });
});

app.get('/api/audit', requireAuth, requirePermission('audit.view'), (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const modul = String(req.query.modul ?? '').trim();
  let logs = db.riwayatAktivitas.slice();
  if (modul) {
    logs = logs.filter((l) => l.modul === modul);
  }
  if (q) {
    logs = logs.filter(
      (l) =>
        l.userNama.toLowerCase().includes(q) ||
        l.aksi.toLowerCase().includes(q) ||
        l.ringkasan.toLowerCase().includes(q) ||
        (l.entitasId && l.entitasId.toLowerCase().includes(q))
    );
  }
  res.json({ logs, lastBackupAt: db.meta.lastBackupAt });
});

app.post('/api/admin/backup', requireAuth, requirePermission('backup.manage'), (req: AuthenticatedRequest, res) => {
  db.meta.lastBackupAt = new Date().toISOString();
  appendAudit(
    req.sessionUser!,
    'Keamanan & Cadangan',
    'CADANGKAN_DATA',
    'Membuat cadangan snapshot basis data simulasi SIGAP PPA.'
  );
  res.json({ ok: true, lastBackupAt: db.meta.lastBackupAt });
});

app.get('/api/admin/backup/export', requireAuth, requirePermission('backup.manage'), (req: AuthenticatedRequest, res) => {
  const sanitizedDb = {
    ...db,
    users: db.users.map(({ passwordHash: _ph, ...rest }) => rest),
  };
  appendAudit(
    req.sessionUser!,
    'Keamanan & Cadangan',
    'UNDUH_CADANGAN',
    'Mengunduh arsip cadangan JSON terstruktur (tanpa kredensial sandi).'
  );
  res.setHeader('Content-Disposition', `attachment; filename="sigap-ppa-sidoarjo-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(sanitizedDb);
});

app.post('/api/admin/backup/reset-demo', requireAuth, requirePermission('backup.manage'), async (req: AuthenticatedRequest, res) => {
  const actor = req.sessionUser!;
  db = await resetToDemoSeed();
  await appendAudit(
    actor,
    'Keamanan & Cadangan',
    'RESET_DATA_DEMO',
    'Mengembalikan data prototipe ke kondisi simulasi awal.'
  );
  res.json({ ok: true, message: 'Data simulasi demonstrasi berhasil dipulihkan ke kondisi awal.' });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
});

// Local development / non-Vercel server startup
if (!process.env.VERCEL) {
  (async () => {
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distDir = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`SIGAP PPA SIDOARJO berjalan pada http://localhost:${PORT}`);
    });
  })();
}

export default app;

import React, { useEffect, useState } from 'react';
import { Database, Download, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { api, formatWaktuIso, hasPerm } from '../lib/api.ts';
import {
  PermissionKey,
  RiwayatAktivitasRecord,
  RoleDefinition,
  SessionUser,
} from '../types/sigap.ts';

interface PengaturanAuditPageProps {
  user: SessionUser;
  onRefreshSession: () => Promise<void>;
}

const PERMISSION_CATALOG: Array<{ key: PermissionKey; label: string; group: string }> = [
  { key: 'dashboard.view', label: 'Lihat Dashboard Agregat', group: 'Dashboard' },
  { key: 'pengaduan.view_all', label: 'Lihat Seluruh Register Pengaduan', group: 'SIAP LAPOR' },
  { key: 'pengaduan.view_assigned', label: 'Lihat Kasus yang Ditugaskan Saja', group: 'SIAP LAPOR' },
  { key: 'pengaduan.create', label: 'Input Pengaduan & Nomor Registrasi', group: 'SIAP LAPOR' },
  { key: 'pengaduan.update_status', label: 'Perbarui Status Penanganan Kasus', group: 'SIAP LAPOR' },
  { key: 'korban.view_identitas_penuh', label: 'Buka Identitas Penuh Korban (Sesuai Penugasan)', group: 'Privasi' },
  { key: 'asesmen.manage', label: 'Isi & Kelola Instrumen Asesmen', group: 'SIAP ASESMEN' },
  { key: 'asesmen.view_catatan_terbatas', label: 'Buka Catatan Asesmen Terbatas', group: 'Privasi' },
  { key: 'penugasan.manage', label: 'Tugaskan Petugas ke Kasus', group: 'Penugasan' },
  { key: 'koordinasi.manage', label: 'Catat & Perbarui Koordinasi Lintas Sektor', group: 'SIAP KOORDINASI' },
  { key: 'pendampingan.manage', label: 'Catat Layanan Pendampingan', group: 'SIAP DAMPING' },
  { key: 'rujukan.manage', label: 'Buat & Perbarui Rujukan Mitra', group: 'SIAP RUJUK' },
  { key: 'monitoring.view', label: 'Akses Panel Monitoring Kasus', group: 'SIAP MONITOR' },
  { key: 'laporan.view', label: 'Akses & Ekspor Laporan Agregat', group: 'Pelaporan' },
  { key: 'mitra.manage', label: 'Kelola Direktori Mitra Layanan', group: 'Tata Kelola' },
  { key: 'users.manage', label: 'Kelola Pengguna & Matriks RBAC', group: 'Tata Kelola' },
  { key: 'audit.view', label: 'Lihat Log Audit Aktivitas', group: 'Keamanan' },
  { key: 'backup.manage', label: 'Cadangan Basis Data & Reset Demo', group: 'Keamanan' },
];

export const PengaturanAuditPage: React.FC<PengaturanAuditPageProps> = ({
  user,
  onRefreshSession,
}) => {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [logs, setLogs] = useState<RiwayatAktivitasRecord[]>([]);
  const [lastBackupAt, setLastBackupAt] = useState('');
  const [q, setQ] = useState('');
  const [modul, setModul] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEditRbac = hasPerm(user, 'users.manage');
  const canViewAudit = hasPerm(user, 'audit.view');
  const canBackup = hasPerm(user, 'backup.manage');

  const loadData = async () => {
    setError(null);
    try {
      const rRes = await api.getRoles();
      setRoles(rRes.roles);
      if (canViewAudit) {
        const aRes = await api.getAuditLogs({ q, modul });
        setLogs(aRes.logs);
        setLastBackupAt(aRes.lastBackupAt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan dan audit.');
    }
  };

  useEffect(() => {
    loadData();
  }, [q, modul]);

  const handleTogglePermission = async (role: RoleDefinition, perm: PermissionKey) => {
    if (!canEditRbac) return;
    setError(null);
    setMessage(null);
    const exists = role.permissions.includes(perm);
    const nextPerms = exists
      ? role.permissions.filter((p) => p !== perm)
      : [...role.permissions, perm];

    try {
      await api.updateRolePermissions(role.code, nextPerms);
      setMessage(`Hak akses "${perm}" pada peran ${role.nama} berhasil diperbarui.`);
      await loadData();
      await onRefreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui hak akses.');
    }
  };

  const handleBackupSnapshot = async () => {
    setError(null);
    try {
      const res = await api.triggerBackupSnapshot();
      setLastBackupAt(res.lastBackupAt);
      setMessage('Cadangan snapshot basis data berhasil dicatat.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat cadangan.');
    }
  };

  const handleResetDemo = async () => {
    setError(null);
    try {
      const res = await api.resetDemoData();
      setMessage(res.message);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mereset data demo.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
          Pengaturan Hak Akses, Keamanan & Audit Aktivitas
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Konfigurasi matriks Role-Based Access Control (RBAC), pemantauan jejak audit, dan pengelolaan cadangan data.
        </p>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</div>}

      {/* Backup & Security Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-navy-900">
            <Database className="w-4 h-4 text-teal-700" />
            <span>Cadangan Basis Data & Pemulihan</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Cadangan terakhir tercatat pada:{' '}
            <strong className="font-mono text-navy-900">{formatWaktuIso(lastBackupAt)}</strong>. Unduh arsip JSON terstruktur (tanpa hash kredensial) atau pulihkan data simulasi awal.
          </p>
          {canBackup ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={handleBackupSnapshot}
                className="px-3.5 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer"
              >
                Catat Snapshot Sekarang
              </button>
              <button
                type="button"
                onClick={async () => {
                  setError(null);
                  try {
                    await api.downloadBackupJson();
                    setMessage('Cadangan JSON terstruktur berhasil diunduh.');
                    await loadData();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Gagal mengunduh cadangan.');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-navy-900 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Cadangan JSON</span>
              </button>
              <button
                type="button"
                onClick={handleResetDemo}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-900 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pulihkan Data Simulasi Awal</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Hanya Administrator yang dapat menjalankan pencadangan.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-base font-bold text-navy-900">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Kepatuhan Privasi & Keamanan (UU PDP / SPBE)</span>
          </div>
          <ul className="text-xs text-slate-700 space-y-2 leading-relaxed list-disc pl-4">
            <li>Identitas korban disamarkan secara otomatis pada dashboard umum, monitoring, dan laporan agregat.</li>
            <li>Tidak ada penyimpanan data sensitif korban pada localStorage browser (sesi dikelola di server).</li>
            <li>Tidak ada pengiriman data kasus atau identitas korban ke layanan AI eksternal.</li>
            <li>Asesmen dan keputusan perlindungan sepenuhnya dilakukan oleh petugas berwenang.</li>
          </ul>
        </div>
      </div>

      {/* RBAC Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-navy-900">Matriks Hak Akses Berbasis Peran (RBAC)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {canEditRbac
              ? 'Administrator dapat menyesuaikan izin tiap peran secara langsung (berlaku pada validasi server).'
              : 'Tampilan baca-saja matriks kewenangan antarperan.'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                <th className="py-3 px-4">Kewenangan / Fitur</th>
                {roles.map((r) => (
                  <th key={r.code} className="py-3 px-4 text-center">
                    {r.nama}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PERMISSION_CATALOG.map((perm) => (
                <tr key={perm.key} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4">
                    <span className="font-semibold text-slate-900">{perm.label}</span>
                    <span className="text-slate-400 ml-2">({perm.group})</span>
                  </td>
                  {roles.map((role) => {
                    const checked = role.permissions.includes(perm.key);
                    return (
                      <td key={role.code} className="py-2.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canEditRbac}
                          onChange={() => handleTogglePermission(role, perm.key)}
                          aria-label={`${perm.label} untuk ${role.nama}`}
                          className="w-4 h-4 accent-navy-900 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-navy-900">Riwayat Audit Aktivitas Sistem</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pencatatan otomatis akses data sensitif, perubahan status, dan administrasi sistem.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari pengguna, aksi, nomor..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <select
              value={modul}
              onChange={(e) => setModul(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Semua Modul</option>
              <option value="Autentikasi">Autentikasi</option>
              <option value="SIAP LAPOR">SIAP LAPOR</option>
              <option value="SIAP ASESMEN">SIAP ASESMEN</option>
              <option value="SIAP KOORDINASI">SIAP KOORDINASI</option>
              <option value="SIAP DAMPING">SIAP DAMPING</option>
              <option value="SIAP RUJUK">SIAP RUJUK</option>
              <option value="Detail Kasus">Detail Kasus</option>
              <option value="Penugasan">Penugasan</option>
              <option value="Manajemen Pengguna">Manajemen Pengguna</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Modul & Aksi</th>
                <th className="py-3 px-4">Ringkasan Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {formatWaktuIso(l.waktu)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{l.userNama}</div>
                    <div className="text-[11px] text-slate-500">{l.userRole}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-teal-800">{l.modul}</div>
                    <div className="font-mono text-[11px] text-slate-500">{l.aksi}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{l.ringkasan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { KeyRound, UserPlus } from 'lucide-react';
import { api, formatWaktuIso } from '../lib/api.ts';
import { PetugasProfile, SessionUser, UserAccount, UserRoleCode } from '../types/sigap.ts';

interface PenggunaPageProps {
  user: SessionUser;
}

const ROLE_LABELS: Record<UserRoleCode, string> = {
  [UserRoleCode.ADMIN]: 'Admin Sistem',
  [UserRoleCode.PENERIMA_PENGADUAN]: 'Petugas Penerima Pengaduan',
  [UserRoleCode.ASESMEN_PENDAMPING]: 'Petugas Asesmen / Pendamping',
  [UserRoleCode.KOORDINATOR]: 'Koordinator / Kepala UPTD',
};

export const PenggunaPage: React.FC<PenggunaPageProps> = ({ user }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [petugas, setPetugas] = useState<PetugasProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRoleCode>(UserRoleCode.ASESMEN_PENDAMPING);
  const [jabatan, setJabatan] = useState('Petugas Pendamping Kasus');
  const [bidang, setBidang] = useState('Tindak Lanjut & Rehabilitasi');
  const [teleponKedinasan, setTeleponKedinasan] = useState('(031) 894-0001');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminUsers();
      setUsers(res.users);
      setPetugas(res.petugas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.createAdminUser({
        nama,
        email,
        role,
        jabatan,
        bidang,
        teleponKedinasan,
      });
      setNama('');
      setEmail('');
      setShowForm(false);
      setSuccess('Akun petugas baru berhasil dibuat (kata sandi awal demo: DemoSigap2026!).');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat akun pengguna.');
    }
  };

  const handleToggleActive = async (target: UserAccount) => {
    setError(null);
    setSuccess(null);
    try {
      await api.updateAdminUser(target.id, { aktif: !target.aktif });
      setSuccess(`Status akun ${target.nama} berhasil diperbarui.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status akun.');
    }
  };

  const handleRoleChange = async (target: UserAccount, nextRole: UserRoleCode) => {
    setError(null);
    try {
      await api.updateAdminUser(target.id, { role: nextRole });
      setSuccess(`Peran ${target.nama} diperbarui menjadi ${ROLE_LABELS[nextRole]}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui peran pengguna.');
    }
  };

  const handleResetPassword = async (target: UserAccount) => {
    setError(null);
    try {
      await api.updateAdminUser(target.id, { resetPassword: true });
      setSuccess(`Kata sandi demo untuk ${target.nama} direset ke "DemoSigap2026!".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mereset kata sandi.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            Manajemen Pengguna & Petugas
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Kelola akun petugas UPTD PPA, penugasan peran RBAC, dan penonaktifan akun ketika petugas tidak lagi berwenang.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>{showForm ? 'Tutup Formulir' : 'Tambah Petugas & Akun'}</span>
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</div>}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-navy-900 pb-3 border-b border-slate-200">
            Registrasi Akun Petugas Baru
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Kedinasan / Demo *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="petugas.baru@sigap-ppa.sidoarjo.test"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Peran RBAC *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRoleCode)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {Object.entries(ROLE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan</label>
              <input
                type="text"
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bidang / Unit</label>
              <input
                type="text"
                value={bidang}
                onChange={(e) => setBidang(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telepon Kedinasan</label>
              <input
                type="text"
                value={teleponKedinasan}
                onChange={(e) => setTeleponKedinasan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold cursor-pointer"
            >
              Simpan Pengguna
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500 text-center">Memuat daftar pengguna...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Petugas & Email</th>
                  <th className="py-3 px-4">Jabatan & Bidang</th>
                  <th className="py-3 px-4">Peran RBAC</th>
                  <th className="py-3 px-4">Login Terakhir</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const ptg = petugas.find((p) => p.id === u.petugasId);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 align-top">
                        <div className="text-xs font-bold text-slate-900">{u.nama}</div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-xs">
                        <div className="text-slate-800">{ptg?.jabatan ?? '-'}</div>
                        <div className="text-slate-500 mt-0.5">{ptg?.bidang ?? '-'}</div>
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRoleCode)}
                          disabled={u.id === user.id}
                          className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:opacity-60"
                        >
                          {Object.entries(ROLE_LABELS).map(([code, label]) => (
                            <option key={code} value={code}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 align-top text-xs text-slate-600 tabular-nums">
                        {u.terakhirLogin ? formatWaktuIso(u.terakhirLogin) : 'Belum pernah'}
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${
                            u.aktif
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : 'text-red-700 bg-red-50 border-red-200'
                          }`}
                        >
                          {u.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleResetPassword(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                            title="Reset sandi demo"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Reset Sandi</span>
                          </button>
                          <button
                            type="button"
                            disabled={u.id === user.id}
                            onClick={() => handleToggleActive(u)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-navy-900 disabled:opacity-40 cursor-pointer"
                          >
                            {u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

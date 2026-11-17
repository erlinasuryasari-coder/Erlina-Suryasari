import React, { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { api, formatTanggal, getStatusColorClass, hasPerm } from '../lib/api.ts';
import {
  MitraLayananRecord,
  PengaduanListItem,
  RujukanRecord,
  SessionUser,
  StatusRujukan,
} from '../types/sigap.ts';

interface RujukanPageProps {
  user: SessionUser;
  onOpenCase: (id: string) => void;
}

export const RujukanPage: React.FC<RujukanPageProps> = ({ user, onOpenCase }) => {
  const [items, setItems] = useState<RujukanRecord[]>([]);
  const [cases, setCases] = useState<PengaduanListItem[]>([]);
  const [mitra, setMitra] = useState<MitraLayananRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<StatusRujukan>(StatusRujukan.DALAM_PROSES);
  const [editKonfirmasi, setEditKonfirmasi] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pengaduanId, setPengaduanId] = useState('');
  const [mitraId, setMitraId] = useState('');
  const [jenisLayananDibutuhkan, setJenisLayananDibutuhkan] = useState('');
  const [alasanRujukan, setAlasanRujukan] = useState('');
  const [tanggalRujukan, setTanggalRujukan] = useState(new Date().toISOString().slice(0, 10));
  const [statusRujukan, setStatusRujukan] = useState<StatusRujukan>(StatusRujukan.SUDAH_DIKIRIM);
  const [konfirmasiTindakLanjut, setKonfirmasiTindakLanjut] = useState('');

  const canManage = hasPerm(user, 'rujukan.manage');

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, cRes, mRes] = await Promise.all([
        api.getRujukanList(),
        api.getPengaduanList(),
        api.getMitra(),
      ]);
      setItems(rRes.items);
      setCases(cRes.items);
      const activeMitra = mRes.mitra.filter((m) => m.aktif);
      setMitra(activeMitra);
      if (cRes.items.length > 0 && !pengaduanId) setPengaduanId(cRes.items[0].pengaduan.id);
      if (activeMitra.length > 0 && !mitraId) setMitraId(activeMitra[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat register rujukan.');
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
      await api.createRujukan({
        pengaduanId,
        mitraId,
        jenisLayananDibutuhkan,
        alasanRujukan,
        tanggalRujukan,
        statusRujukan,
        konfirmasiTindakLanjut,
      });
      setJenisLayananDibutuhkan('');
      setAlasanRujukan('');
      setKonfirmasiTindakLanjut('');
      setShowForm(false);
      setSuccess('Rujukan mitra layanan berhasil dicatat.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat rujukan.');
    }
  };

  const handleSaveUpdate = async (id: string) => {
    setError(null);
    try {
      await api.updateRujukan(id, {
        statusRujukan: editStatus,
        konfirmasiTindakLanjut: editKonfirmasi,
      });
      setEditingId(null);
      setSuccess('Konfirmasi tindak lanjut rujukan berhasil diperbarui.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui rujukan.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            Rujukan Layanan — SIAP RUJUK
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Pengelolaan rujukan ke mitra layanan terverifikasi serta pencatatan konfirmasi tindak lanjut dari lembaga tujuan.
          </p>
        </div>
        {canManage && cases.length > 0 && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showForm ? 'Tutup Formulir' : 'Buat Rujukan Baru'}</span>
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</div>}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {showForm && canManage && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-navy-900 pb-3 border-b border-slate-200">
            Formulir Rujukan Mitra Layanan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kasus *</label>
              <select
                value={pengaduanId}
                onChange={(e) => setPengaduanId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {cases.map((c) => (
                  <option key={c.pengaduan.id} value={c.pengaduan.id}>
                    {c.pengaduan.nomorRegistrasi}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lembaga Tujuan *</label>
              <select
                value={mitraId}
                onChange={(e) => setMitraId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {mitra.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.namaLembaga}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Rujukan *</label>
              <input
                type="date"
                required
                value={tanggalRujukan}
                onChange={(e) => setTanggalRujukan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Layanan yang Dibutuhkan *</label>
              <input
                type="text"
                required
                value={jenisLayananDibutuhkan}
                onChange={(e) => setJenisLayananDibutuhkan(e.target.value)}
                placeholder="Misal: Visum et Repertum, Penempatan Rumah Aman, Bantuan Hukum"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Rujukan</label>
              <select
                value={statusRujukan}
                onChange={(e) => setStatusRujukan(e.target.value as StatusRujukan)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {Object.values(StatusRujukan).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Rujukan *</label>
              <textarea
                required
                rows={2}
                value={alasanRujukan}
                onChange={(e) => setAlasanRujukan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Konfirmasi Awal</label>
              <textarea
                rows={2}
                value={konfirmasiTindakLanjut}
                onChange={(e) => setKonfirmasiTindakLanjut(e.target.value)}
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
              Simpan Rujukan
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500 text-center">Memuat register rujukan...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-sm text-slate-500 text-center">Belum ada rujukan tercatat.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">No. Registrasi & Tanggal</th>
                  <th className="py-3 px-4">Lembaga Tujuan & Layanan</th>
                  <th className="py-3 px-4">Konfirmasi Tindak Lanjut</th>
                  <th className="py-3 px-4">Status</th>
                  {canManage && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => {
                  const isEditing = editingId === r.id;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 align-top">
                        <button
                          type="button"
                          onClick={() => onOpenCase(r.pengaduanId)}
                          className="font-mono text-xs font-semibold text-navy-900 hover:underline cursor-pointer"
                        >
                          {r.nomorRegistrasi}
                        </button>
                        <div className="text-xs text-slate-500 mt-1 tabular-nums">
                          {formatTanggal(r.tanggalRujukan)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Oleh: {r.petugasPengirimNama}</div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-xs max-w-xs">
                        <div className="font-semibold text-slate-900">{r.namaLembagaTujuan}</div>
                        <div className="text-teal-800 mt-0.5">{r.jenisLayananDibutuhkan}</div>
                        <div className="text-slate-600 mt-1">{r.alasanRujukan}</div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-xs max-w-sm">
                        {isEditing ? (
                          <textarea
                            rows={2}
                            value={editKonfirmasi}
                            onChange={(e) => setEditKonfirmasi(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                          />
                        ) : (
                          <div>
                            <p className="text-slate-700">{r.konfirmasiTindakLanjut}</p>
                            {r.tanggalKonfirmasi && (
                              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                                Dikonfirmasi: {formatTanggal(r.tanggalKonfirmasi)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as StatusRujukan)}
                            className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                          >
                            {Object.values(StatusRujukan).map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getStatusColorClass(
                              r.statusRujukan
                            )}`}
                          >
                            {r.statusRujukan}
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="px-2.5 py-1 rounded border border-slate-300 text-xs cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveUpdate(r.id)}
                                className="px-2.5 py-1 rounded bg-navy-900 text-white text-xs font-semibold cursor-pointer"
                              >
                                Simpan
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(r.id);
                                setEditStatus(r.statusRujukan);
                                setEditKonfirmasi(r.konfirmasiTindakLanjut);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-navy-900 text-xs font-semibold text-navy-900 cursor-pointer"
                            >
                              Perbarui
                            </button>
                          )}
                        </td>
                      )}
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

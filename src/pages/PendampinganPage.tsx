import React, { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { api, formatTanggal, getStatusColorClass, hasPerm } from '../lib/api.ts';
import {
  JenisLayananPendampingan,
  PendampinganRecord,
  PengaduanListItem,
  SessionUser,
  StatusPendampingan,
} from '../types/sigap.ts';

interface PendampinganPageProps {
  user: SessionUser;
  onOpenCase: (id: string) => void;
}

export const PendampinganPage: React.FC<PendampinganPageProps> = ({ user, onOpenCase }) => {
  const [items, setItems] = useState<PendampinganRecord[]>([]);
  const [cases, setCases] = useState<PengaduanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pengaduanId, setPengaduanId] = useState('');
  const [tanggalPendampingan, setTanggalPendampingan] = useState(new Date().toISOString().slice(0, 10));
  const [jenisLayanan, setJenisLayanan] = useState<JenisLayananPendampingan>(
    JenisLayananPendampingan.PSIKOLOGIS
  );
  const [bentukPendampingan, setBentukPendampingan] = useState('');
  const [catatanPerkembangan, setCatatanPerkembangan] = useState('');
  const [statusPendampingan, setStatusPendampingan] = useState<StatusPendampingan>(
    StatusPendampingan.BERJALAN
  );

  const canManage = hasPerm(user, 'pendampingan.manage');

  const loadData = async () => {
    setLoading(true);
    try {
      const [dRes, cRes] = await Promise.all([api.getPendampinganList(), api.getPengaduanList()]);
      setItems(dRes.items);
      setCases(cRes.items);
      if (cRes.items.length > 0 && !pengaduanId) setPengaduanId(cRes.items[0].pengaduan.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat riwayat pendampingan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.createPendampingan({
        pengaduanId,
        tanggalPendampingan,
        jenisLayanan,
        bentukPendampingan,
        catatanPerkembangan,
        statusPendampingan,
      });
      setBentukPendampingan('');
      setCatatanPerkembangan('');
      setShowForm(false);
      setSuccess('Catatan layanan pendampingan berhasil disimpan.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pendampingan.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            Pendampingan Korban — SIAP DAMPING
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Dokumentasi pendampingan psikologis, hukum, sosial, dan layanan kesehatan sesuai kewenangan UPTD PPA.
          </p>
        </div>
        {canManage && cases.length > 0 && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showForm ? 'Tutup Formulir' : 'Catat Pendampingan'}</span>
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
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-navy-900 pb-3 border-b border-slate-200">
            Catat Sesi Pendampingan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal *</label>
              <input
                type="date"
                required
                value={tanggalPendampingan}
                onChange={(e) => setTanggalPendampingan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Layanan *</label>
              <select
                value={jenisLayanan}
                onChange={(e) => setJenisLayanan(e.target.value as JenisLayananPendampingan)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {Object.values(JenisLayananPendampingan).map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={statusPendampingan}
                onChange={(e) => setStatusPendampingan(e.target.value as StatusPendampingan)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {Object.values(StatusPendampingan).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis / Bentuk Pendampingan *</label>
            <input
              type="text"
              required
              value={bentukPendampingan}
              onChange={(e) => setBentukPendampingan(e.target.value)}
              placeholder="Misal: Konseling trauma sesi ke-2 / Pendampingan BAP di Polresta"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Perkembangan *</label>
            <textarea
              required
              rows={3}
              value={catatanPerkembangan}
              onChange={(e) => setCatatanPerkembangan(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
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
              Simpan Pendampingan
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500 text-center">Memuat catatan pendampingan...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-sm text-slate-500 text-center">Belum ada catatan pendampingan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Kasus & Tanggal</th>
                  <th className="py-3 px-4">Jenis Layanan</th>
                  <th className="py-3 px-4">Bentuk & Perkembangan</th>
                  <th className="py-3 px-4">Petugas Pendamping</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 align-top">
                      <button
                        type="button"
                        onClick={() => onOpenCase(d.pengaduanId)}
                        className="font-mono text-xs font-semibold text-navy-900 hover:underline cursor-pointer"
                      >
                        {d.nomorRegistrasi}
                      </button>
                      <div className="text-xs text-slate-500 mt-1 tabular-nums">
                        {formatTanggal(d.tanggalPendampingan)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-top text-xs font-semibold text-teal-900">
                      {d.jenisLayanan}
                    </td>
                    <td className="py-3.5 px-4 align-top text-xs max-w-md">
                      <div className="font-semibold text-slate-900">{d.bentukPendampingan}</div>
                      <div className="text-slate-600 mt-1">{d.catatanPerkembangan}</div>
                    </td>
                    <td className="py-3.5 px-4 align-top text-xs text-slate-700">
                      {d.petugasPendampingNama}
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getStatusColorClass(
                          d.statusPendampingan
                        )}`}
                      >
                        {d.statusPendampingan}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

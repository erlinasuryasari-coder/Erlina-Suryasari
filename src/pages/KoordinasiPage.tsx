import React, { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { api, formatTanggal, getStatusColorClass, hasPerm } from '../lib/api.ts';
import {
  KoordinasiRecord,
  MitraLayananRecord,
  PengaduanListItem,
  SessionUser,
  StatusTindakLanjut,
} from '../types/sigap.ts';

interface KoordinasiPageProps {
  user: SessionUser;
  onOpenCase: (id: string) => void;
}

export const KoordinasiPage: React.FC<KoordinasiPageProps> = ({ user, onOpenCase }) => {
  const [items, setItems] = useState<KoordinasiRecord[]>([]);
  const [cases, setCases] = useState<PengaduanListItem[]>([]);
  const [mitra, setMitra] = useState<MitraLayananRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pengaduanId, setPengaduanId] = useState('');
  const [mitraId, setMitraId] = useState('');
  const [jenisKebutuhan, setJenisKebutuhan] = useState('');
  const [tanggalKoordinasi, setTanggalKoordinasi] = useState(new Date().toISOString().slice(0, 10));
  const [hasilKoordinasi, setHasilKoordinasi] = useState('');
  const [statusTindakLanjut, setStatusTindakLanjut] = useState<StatusTindakLanjut>(
    StatusTindakLanjut.DALAM_PROSES
  );

  const canManage = hasPerm(user, 'koordinasi.manage');

  const loadData = async () => {
    setLoading(true);
    try {
      const [kRes, cRes, mRes] = await Promise.all([
        api.getKoordinasiList(),
        api.getPengaduanList(),
        api.getMitra(),
      ]);
      setItems(kRes.items);
      setCases(cRes.items);
      const activeMitra = mRes.mitra.filter((m) => m.aktif);
      setMitra(activeMitra);
      if (cRes.items.length > 0 && !pengaduanId) setPengaduanId(cRes.items[0].pengaduan.id);
      if (activeMitra.length > 0 && !mitraId) setMitraId(activeMitra[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat riwayat koordinasi.');
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
      await api.createKoordinasi({
        pengaduanId,
        mitraId,
        jenisKebutuhan,
        tanggalKoordinasi,
        hasilKoordinasi,
        statusTindakLanjut,
      });
      setJenisKebutuhan('');
      setHasilKoordinasi('');
      setShowForm(false);
      setSuccess('Koordinasi lintas sektor berhasil dicatat.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat koordinasi.');
    }
  };

  const handleStatusChange = async (id: string, nextStatus: StatusTindakLanjut) => {
    try {
      await api.updateKoordinasi(id, { statusTindakLanjut: nextStatus });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui tindak lanjut.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            Koordinasi Lintas Sektor — SIAP KOORDINASI
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Pencatatan koordinasi antarinstansi (Kepolisian, RSUD, Dinas Sosial, LBH, Pendidikan) dan status tindak lanjutnya.
          </p>
        </div>
        {canManage && cases.length > 0 && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showForm ? 'Tutup Formulir' : 'Catat Koordinasi Baru'}</span>
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
            Formulir Pencatatan Koordinasi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Registrasi Kasus *</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Instansi Mitra *</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Koordinasi *</label>
              <input
                type="date"
                required
                value={tanggalKoordinasi}
                onChange={(e) => setTanggalKoordinasi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kebutuhan Koordinasi *</label>
              <input
                type="text"
                required
                value={jenisKebutuhan}
                onChange={(e) => setJenisKebutuhan(e.target.value)}
                placeholder="Misal: Permohonan pengantar visum atau koordinasi penempatan rumah aman"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Tindak Lanjut</label>
              <select
                value={statusTindakLanjut}
                onChange={(e) => setStatusTindakLanjut(e.target.value as StatusTindakLanjut)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {Object.values(StatusTindakLanjut).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hasil Koordinasi *</label>
            <textarea
              required
              rows={2}
              value={hasilKoordinasi}
              onChange={(e) => setHasilKoordinasi(e.target.value)}
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
              Simpan Koordinasi
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500 text-center">Memuat riwayat koordinasi...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-sm text-slate-500 text-center">Belum ada catatan koordinasi.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Kasus & Tanggal</th>
                  <th className="py-3 px-4">Instansi Dikoordinasikan</th>
                  <th className="py-3 px-4">Kebutuhan & Hasil</th>
                  <th className="py-3 px-4">Penanggung Jawab</th>
                  <th className="py-3 px-4">Tindak Lanjut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 align-top">
                      <button
                        type="button"
                        onClick={() => onOpenCase(k.pengaduanId)}
                        className="font-mono text-xs font-semibold text-navy-900 hover:underline cursor-pointer"
                      >
                        {k.nomorRegistrasi}
                      </button>
                      <div className="text-xs text-slate-500 mt-1 tabular-nums">
                        {formatTanggal(k.tanggalKoordinasi)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-top text-xs font-semibold text-slate-900">
                      {k.instansiDikoordinasikan}
                    </td>
                    <td className="py-3.5 px-4 align-top text-xs max-w-md">
                      <div className="font-semibold text-slate-800">{k.jenisKebutuhan}</div>
                      <div className="text-slate-600 mt-1">{k.hasilKoordinasi}</div>
                    </td>
                    <td className="py-3.5 px-4 align-top text-xs text-slate-700">
                      {k.petugasPenanggungJawabNama}
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      {canManage ? (
                        <select
                          value={k.statusTindakLanjut}
                          onChange={(e) => handleStatusChange(k.id, e.target.value as StatusTindakLanjut)}
                          className={`px-2.5 py-1 text-xs font-medium rounded border ${getStatusColorClass(
                            k.statusTindakLanjut
                          )}`}
                        >
                          {Object.values(StatusTindakLanjut).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getStatusColorClass(
                            k.statusTindakLanjut
                          )}`}
                        >
                          {k.statusTindakLanjut}
                        </span>
                      )}
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

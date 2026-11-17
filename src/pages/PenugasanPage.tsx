import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api, formatTanggal, hasPerm } from '../lib/api.ts';
import { PengaduanListItem, PenugasanRecord, PetugasProfile, SessionUser } from '../types/sigap.ts';

interface PenugasanPageProps {
  user: SessionUser;
  onOpenCase: (id: string) => void;
}

export const PenugasanPage: React.FC<PenugasanPageProps> = ({ user, onOpenCase }) => {
  const [tasks, setTasks] = useState<PenugasanRecord[]>([]);
  const [cases, setCases] = useState<PengaduanListItem[]>([]);
  const [petugas, setPetugas] = useState<PetugasProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pengaduanId, setPengaduanId] = useState('');
  const [petugasId, setPetugasId] = useState('');
  const [peranTugas, setPeranTugas] = useState<'Petugas Asesmen' | 'Petugas Pendamping' | 'Penanggung Jawab Kasus'>(
    'Penanggung Jawab Kasus'
  );
  const [targetTindakLanjut, setTargetTindakLanjut] = useState(new Date().toISOString().slice(0, 10));
  const [catatanPenugasan, setCatatanPenugasan] = useState('');

  const canManage = hasPerm(user, 'penugasan.manage');

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, cRes, pRes] = await Promise.all([
        api.getPenugasanList(),
        api.getPengaduanList(),
        api.getPetugas(),
      ]);
      setTasks(tRes.items);
      setCases(cRes.items);
      const pendampingList = pRes.petugas.filter((p) => p.aktif && p.role === 'ASESMEN_PENDAMPING');
      setPetugas(pendampingList);
      if (cRes.items.length > 0 && !pengaduanId) setPengaduanId(cRes.items[0].pengaduan.id);
      if (pendampingList.length > 0 && !petugasId) setPetugasId(pendampingList[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data penugasan.');
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
      await api.createPenugasan({
        pengaduanId,
        petugasId,
        peranTugas,
        targetTindakLanjut,
        catatanPenugasan,
      });
      setCatatanPenugasan('');
      setSuccess('Penugasan petugas berhasil ditetapkan.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan penugasan.');
    }
  };

  const handleStatusUpdate = async (id: string, statusTugas: 'Aktif' | 'Selesai' | 'Dialihkan') => {
    try {
      await api.updatePenugasanStatus(id, statusTugas);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status tugas.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Penugasan Petugas</h1>
        <p className="text-sm text-slate-600 mt-1">
          Pembagian penanggung jawab kasus, asesmen, dan pendampingan serta pemantauan beban kerja petugas.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</div>}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {canManage && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-navy-900 pb-3 border-b border-slate-200">
            <UserPlus className="w-4 h-4 text-teal-700" />
            <span>Tetapkan Penugasan Baru</span>
          </div>
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
                    {c.pengaduan.nomorRegistrasi} ({c.pengaduan.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Petugas Asesmen/Pendamping *</label>
              <select
                value={petugasId}
                onChange={(e) => setPetugasId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {petugas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Peran Tugas</label>
              <select
                value={peranTugas}
                onChange={(e) =>
                  setPeranTugas(
                    e.target.value as 'Petugas Asesmen' | 'Petugas Pendamping' | 'Penanggung Jawab Kasus'
                  )
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Penanggung Jawab Kasus">Penanggung Jawab Kasus</option>
                <option value="Petugas Asesmen">Petugas Asesmen</option>
                <option value="Petugas Pendamping">Petugas Pendamping</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Tindak Lanjut</label>
              <input
                type="date"
                value={targetTindakLanjut}
                onChange={(e) => setTargetTindakLanjut(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={catatanPenugasan}
              onChange={(e) => setCatatanPenugasan(e.target.value)}
              placeholder="Arahan penugasan dan prioritas layanan..."
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              Simpan Penugasan
            </button>
          </div>
        </form>
      )}

      {/* Tasks Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-navy-900">Daftar Penugasan</h2>
        </div>
        {loading ? (
          <div className="p-8 text-sm text-slate-500 text-center">Memuat daftar penugasan...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">No. Registrasi</th>
                  <th className="py-3 px-4">Petugas & Peran</th>
                  <th className="py-3 px-4">Tanggal & Target</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4">Status Tugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 align-top">
                      <button
                        type="button"
                        onClick={() => onOpenCase(t.pengaduanId)}
                        className="font-mono text-xs font-semibold text-navy-900 hover:underline cursor-pointer"
                      >
                        {t.nomorRegistrasi}
                      </button>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="text-xs font-semibold text-slate-900">{t.petugasNama}</div>
                      <div className="text-xs text-teal-800 mt-0.5">{t.peranTugas}</div>
                    </td>
                    <td className="py-3 px-4 align-top text-xs text-slate-600 tabular-nums">
                      <div>Tugas: {formatTanggal(t.tanggalPenugasan)}</div>
                      <div>Target: {formatTanggal(t.targetTindakLanjut)}</div>
                    </td>
                    <td className="py-3 px-4 align-top text-xs text-slate-700 max-w-xs">
                      {t.catatanPenugasan}
                    </td>
                    <td className="py-3 px-4 align-top">
                      {canManage ? (
                        <select
                          value={t.statusTugas}
                          onChange={(e) =>
                            handleStatusUpdate(t.id, e.target.value as 'Aktif' | 'Selesai' | 'Dialihkan')
                          }
                          className="px-2.5 py-1 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="Aktif">Aktif</option>
                          <option value="Selesai">Selesai</option>
                          <option value="Dialihkan">Dialihkan</option>
                        </select>
                      ) : (
                        <span className="text-xs font-semibold text-slate-800">{t.statusTugas}</span>
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

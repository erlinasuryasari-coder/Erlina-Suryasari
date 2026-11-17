import React, { useEffect, useState } from 'react';
import { Lock, PlusCircle } from 'lucide-react';
import { api, formatTanggal, hasPerm } from '../lib/api.ts';
import { AsesmenRecord, PengaduanListItem, SessionUser } from '../types/sigap.ts';

interface AsesmenPageProps {
  user: SessionUser;
  onOpenCase: (id: string) => void;
}

export const AsesmenPage: React.FC<AsesmenPageProps> = ({ user, onOpenCase }) => {
  const [items, setItems] = useState<AsesmenRecord[]>([]);
  const [cases, setCases] = useState<PengaduanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pengaduanId, setPengaduanId] = useState('');
  const [tanggalAsesmen, setTanggalAsesmen] = useState(new Date().toISOString().slice(0, 10));
  const [kebutuhanKorban, setKebutuhanKorban] = useState('');
  const [kebutuhanPerlindungan, setKebutuhanPerlindungan] = useState('');
  const [butuhPsikologis, setButuhPsikologis] = useState(true);
  const [rincianPsikologis, setRincianPsikologis] = useState('');
  const [butuhHukum, setButuhHukum] = useState(false);
  const [rincianHukum, setRincianHukum] = useState('');
  const [butuhKesehatan, setButuhKesehatan] = useState(false);
  const [rincianKesehatan, setRincianKesehatan] = useState('');
  const [rencanaTindakLanjut, setRencanaTindakLanjut] = useState('');
  const [catatanTerbatas, setCatatanTerbatas] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [asmRes, caseRes] = await Promise.all([api.getAsesmenList(), api.getPengaduanList()]);
      setItems(asmRes.items);
      setCases(caseRes.items);
      if (caseRes.items.length > 0 && !pengaduanId) {
        setPengaduanId(caseRes.items[0].pengaduan.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data asesmen.');
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
      await api.createAsesmen({
        pengaduanId,
        tanggalAsesmen,
        kebutuhanKorban,
        kebutuhanPerlindungan,
        butuhLayananPsikologis: butuhPsikologis,
        rincianPsikologis,
        butuhLayananHukum: butuhHukum,
        rincianHukum,
        butuhLayananKesehatan: butuhKesehatan,
        rincianKesehatan,
        rencanaTindakLanjut,
        catatanTerbatas,
      });
      setSuccess('Instrumen asesmen awal berhasil disimpan.');
      setKebutuhanKorban('');
      setKebutuhanPerlindungan('');
      setRencanaTindakLanjut('');
      setCatatanTerbatas('');
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan asesmen.');
    }
  };

  const canManage = hasPerm(user, 'asesmen.manage');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            Asesmen Kebutuhan & Perlindungan — SIAP ASESMEN
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Pencatatan asesmen profesional oleh petugas berwenang (tanpa keputusan otomatis AI). Catatan klinis/sensitif hanya dapat dibuka oleh petugas asesmen yang ditugaskan.
          </p>
        </div>
        {canManage && cases.length > 0 && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showForm ? 'Tutup Formulir' : 'Isi Asesmen Baru'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {showForm && canManage && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <h2 className="text-base font-bold text-navy-900 pb-3 border-b border-slate-200">
            Formulir Asesmen Awal Korban
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Kasus (Nomor Registrasi) *
              </label>
              <select
                value={pengaduanId}
                onChange={(e) => setPengaduanId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {cases.map((c) => (
                  <option key={c.pengaduan.id} value={c.pengaduan.id}>
                    {c.pengaduan.nomorRegistrasi} — {c.pengaduan.kategori}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tanggal Asesmen *</label>
              <input
                type="date"
                required
                value={tanggalAsesmen}
                onChange={(e) => setTanggalAsesmen(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kebutuhan Korban *</label>
              <textarea
                required
                rows={3}
                value={kebutuhanKorban}
                onChange={(e) => setKebutuhanKorban(e.target.value)}
                placeholder="Identifikasi kebutuhan pemulihan, sosial, dan keselamatan dasar..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Identifikasi Kebutuhan Perlindungan *
              </label>
              <textarea
                required
                rows={3}
                value={kebutuhanPerlindungan}
                onChange={(e) => setKebutuhanPerlindungan(e.target.value)}
                placeholder="Kebutuhan rumah aman (shelter), pemisahan dari pelaku, atau pengamanan..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-navy-900">
                <input
                  type="checkbox"
                  checked={butuhPsikologis}
                  onChange={(e) => setButuhPsikologis(e.target.checked)}
                />
                <span>Kebutuhan Layanan Psikologis</span>
              </label>
              <input
                type="text"
                value={rincianPsikologis}
                onChange={(e) => setRincianPsikologis(e.target.value)}
                placeholder="Rincian konseling / terapi trauma..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-navy-900">
                <input
                  type="checkbox"
                  checked={butuhHukum}
                  onChange={(e) => setButuhHukum(e.target.checked)}
                />
                <span>Kebutuhan Layanan Hukum</span>
              </label>
              <input
                type="text"
                value={rincianHukum}
                onChange={(e) => setRincianHukum(e.target.value)}
                placeholder="Rincian konsultasi / pelaporan..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-navy-900">
                <input
                  type="checkbox"
                  checked={butuhKesehatan}
                  onChange={(e) => setButuhKesehatan(e.target.checked)}
                />
                <span>Kebutuhan Layanan Kesehatan</span>
              </label>
              <input
                type="text"
                value={rincianKesehatan}
                onChange={(e) => setRincianKesehatan(e.target.value)}
                placeholder="Rincian pemeriksaan medis / visum..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rencana Tindak Lanjut *</label>
            <textarea
              required
              rows={2}
              value={rencanaTindakLanjut}
              onChange={(e) => setRencanaTindakLanjut(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ruang Catatan Asesmen (Akses Terbatas)
            </label>
            <textarea
              rows={3}
              value={catatanTerbatas}
              onChange={(e) => setCatatanTerbatas(e.target.value)}
              placeholder="Catatan observasi psikologis/klinis sensitif yang hanya dapat dilihat petugas berwenang..."
              className="w-full px-3 py-2 text-sm border border-amber-300 bg-amber-50/40 rounded-lg"
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
              Simpan Asesmen
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500 text-center">
            Memuat daftar asesmen...
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500 text-center">
            Belum ada data asesmen pada cakupan akses Anda.
          </div>
        ) : (
          items.map((asm) => (
            <div key={asm.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <button
                    type="button"
                    onClick={() => onOpenCase(asm.pengaduanId)}
                    className="font-mono text-sm font-bold text-navy-900 hover:text-teal-700 hover:underline cursor-pointer"
                  >
                    {asm.nomorRegistrasi}
                  </button>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Tanggal Asesmen: {formatTanggal(asm.tanggalAsesmen)} · Petugas: {asm.petugasAsesmenNama}
                  </div>
                </div>
                <div className="text-xs text-slate-600">
                  Layanan:{' '}
                  {[
                    asm.butuhLayananPsikologis && 'Psikologis',
                    asm.butuhLayananHukum && 'Hukum',
                    asm.butuhLayananKesehatan && 'Kesehatan',
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Konseling Awal'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Kebutuhan Korban</div>
                  <p className="text-slate-800 mt-1">{asm.kebutuhanKorban}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Kebutuhan Perlindungan</div>
                  <p className="text-slate-800 mt-1">{asm.kebutuhanPerlindungan}</p>
                </div>
              </div>

              <div className="text-sm">
                <div className="text-xs font-semibold text-slate-500">Rencana Tindak Lanjut</div>
                <p className="text-slate-800 mt-1">{asm.rencanaTindakLanjut}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Catatan Terbatas {asm.aksesTerbatasMasked ? '(Dilindungi)' : ''}</span>
                </div>
                <p className="text-amber-950 mt-1">{asm.catatanTerbatas}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

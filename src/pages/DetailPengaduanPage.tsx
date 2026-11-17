import React, { useEffect, useState } from 'react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { PageRoute } from '../components/AppShell.tsx';
import {
  api,
  formatTanggal,
  formatWaktuIso,
  getStatusColorClass,
  hasPerm,
} from '../lib/api.ts';
import {
  JenisLayananPendampingan,
  MitraLayananRecord,
  PengaduanDetailResponse,
  PetugasProfile,
  SessionUser,
  StatusPendampingan,
  StatusPengaduan,
  StatusRujukan,
  StatusTindakLanjut,
} from '../types/sigap.ts';

interface DetailPengaduanPageProps {
  user: SessionUser;
  pengaduanId: string;
  onNavigate: (page: PageRoute) => void;
}

type DetailTab = 'ringkasan' | 'asesmen' | 'koordinasi' | 'pendampingan' | 'rujukan' | 'riwayat';

const WORKFLOW_STEPS = [
  StatusPengaduan.BARU_DITERIMA,
  StatusPengaduan.DALAM_VERIFIKASI,
  StatusPengaduan.DALAM_ASESMEN,
  StatusPengaduan.DALAM_PENANGANAN,
  StatusPengaduan.SELESAI_ADMINISTRATIF,
];

export const DetailPengaduanPage: React.FC<DetailPengaduanPageProps> = ({
  user,
  pengaduanId,
  onNavigate,
}) => {
  const [detail, setDetail] = useState<PengaduanDetailResponse | null>(null);
  const [petugasList, setPetugasList] = useState<PetugasProfile[]>([]);
  const [mitraList, setMitraList] = useState<MitraLayananRecord[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>('ringkasan');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Quick assignment form
  const [assignPetugasId, setAssignPetugasId] = useState('');
  const [assignPeran, setAssignPeran] = useState<'Petugas Asesmen' | 'Petugas Pendamping' | 'Penanggung Jawab Kasus'>('Penanggung Jawab Kasus');
  const [assignTarget, setAssignTarget] = useState(new Date().toISOString().slice(0, 10));
  const [assignNote, setAssignNote] = useState('');

  // Quick assessment form
  const [asmKebutuhan, setAsmKebutuhan] = useState('');
  const [asmPerlindungan, setAsmPerlindungan] = useState('');
  const [asmPsi, setAsmPsi] = useState(false);
  const [asmPsiNote, setAsmPsiNote] = useState('');
  const [asmHukum, setAsmHukum] = useState(false);
  const [asmHukumNote, setAsmHukumNote] = useState('');
  const [asmKes, setAsmKes] = useState(false);
  const [asmKesNote, setAsmKesNote] = useState('');
  const [asmRencana, setAsmRencana] = useState('');
  const [asmTerbatas, setAsmTerbatas] = useState('');

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const [det, ptg, mtr] = await Promise.all([
        api.getPengaduanDetail(pengaduanId),
        api.getPetugas(),
        api.getMitra(),
      ]);
      setDetail(det);
      setPetugasList(ptg.petugas.filter((p) => p.aktif));
      setMitraList(mtr.mitra.filter((m) => m.aktif));
      const firstPendamping = ptg.petugas.find((p) => p.aktif && p.role === 'ASESMEN_PENDAMPING');
      if (firstPendamping && !assignPetugasId) {
        setAssignPetugasId(firstPendamping.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail kasus.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [pengaduanId]);

  const handleStatusChange = async (newStatus: StatusPengaduan) => {
    try {
      await api.updatePengaduanStatus(pengaduanId, newStatus);
      setActionMessage(`Status kasus diperbarui menjadi "${newStatus}".`);
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status.');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPenugasan({
        pengaduanId,
        petugasId: assignPetugasId,
        peranTugas: assignPeran,
        targetTindakLanjut: assignTarget,
        catatanPenugasan: assignNote,
      });
      setAssignNote('');
      setActionMessage('Penugasan petugas berhasil disimpan.');
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menugaskan petugas.');
    }
  };

  const handleAsesmenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAsesmen({
        pengaduanId,
        tanggalAsesmen: new Date().toISOString().slice(0, 10),
        kebutuhanKorban: asmKebutuhan,
        kebutuhanPerlindungan: asmPerlindungan,
        butuhLayananPsikologis: asmPsi,
        rincianPsikologis: asmPsiNote,
        butuhLayananHukum: asmHukum,
        rincianHukum: asmHukumNote,
        butuhLayananKesehatan: asmKes,
        rincianKesehatan: asmKesNote,
        rencanaTindakLanjut: asmRencana,
        catatanTerbatas: asmTerbatas,
      });
      setAsmKebutuhan('');
      setAsmPerlindungan('');
      setAsmRencana('');
      setAsmTerbatas('');
      setActionMessage('Instrumen asesmen awal berhasil dicatat.');
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan asesmen.');
    }
  };

  if (loading && !detail) {
    return <div className="p-8 text-sm text-slate-500">Memuat berkas detail pengaduan...</div>;
  }

  if (error && !detail) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 space-y-3">
        <p className="text-sm text-red-800">{error}</p>
        <button
          type="button"
          onClick={() => onNavigate('pengaduan')}
          className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold cursor-pointer"
        >
          Kembali ke Data Pengaduan
        </button>
      </div>
    );
  }

  if (!detail) return null;

  const { pengaduan, korban } = detail;
  const currentStepIdx = WORKFLOW_STEPS.indexOf(pengaduan.status);

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => onNavigate('pengaduan')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900 mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Daftar Pengaduan</span>
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-navy-900">
                  {pengaduan.nomorRegistrasi}
                </h1>
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded border ${getStatusColorClass(
                    pengaduan.status
                  )}`}
                >
                  {pengaduan.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1.5">
                {pengaduan.kategori} · {pengaduan.kanal} · Kec. {pengaduan.kecamatanKejadian} · Diterima {formatTanggal(pengaduan.tanggalPenerimaan)} ({pengaduan.waktuPenerimaan} WIB)
              </p>
            </div>

            {detail.canEditCase && (
              <div className="flex items-center gap-2 shrink-0">
                <label htmlFor="status-select" className="text-xs font-semibold text-slate-600">
                  Perbarui Status:
                </label>
                <select
                  id="status-select"
                  value={pengaduan.status}
                  onChange={(e) => handleStatusChange(e.target.value as StatusPengaduan)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {WORKFLOW_STEPS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 5-step process bar */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {WORKFLOW_STEPS.map((step, idx) => {
              const passed = idx <= currentStepIdx;
              return (
                <div
                  key={step}
                  className={`px-3 py-2 rounded-lg border text-xs ${
                    passed
                      ? 'bg-teal-50/70 border-teal-200 text-teal-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="text-[10px] font-mono tabular-nums">Tahap 0{idx + 1}</div>
                  <div className="truncate mt-0.5">{step}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs font-medium text-emerald-900">
          {actionMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl w-fit">
        {(
          [
            { id: 'ringkasan', label: 'Ringkasan & Penugasan' },
            { id: 'asesmen', label: `Asesmen (${detail.asesmen.length})` },
            { id: 'koordinasi', label: `Koordinasi (${detail.koordinasi.length})` },
            { id: 'pendampingan', label: `Pendampingan (${detail.pendampingan.length})` },
            { id: 'rujukan', label: `Rujukan (${detail.rujukan.length})` },
            { id: 'riwayat', label: `Riwayat (${detail.aktivitasKasus.length})` },
          ] as Array<{ id: DetailTab; label: string }>
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-navy-900 shadow-xs'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Ringkasan, Identitas Korban Terproteksi & Penugasan */}
      {activeTab === 'ringkasan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-navy-900">Ringkasan Pengaduan</h2>
              <p className="text-sm text-slate-700 leading-relaxed">{pengaduan.ringkasanPengaduan}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <div className="text-slate-500">Petugas Penerima</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{pengaduan.petugasPenerimaNama}</div>
                </div>
                <div>
                  <div className="text-slate-500">Pelapor</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {detail.canAccessFullVictimIdentity ? pengaduan.namaPelapor : `[Disamarkan] (${pengaduan.statusPelapor})`}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Prioritas Penanganan</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{pengaduan.prioritas}</div>
                </div>
              </div>
            </div>

            {/* Penugasan Petugas pada Kasus */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-navy-900">Petugas yang Ditugaskan</h2>
              {detail.penugasan.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada petugas asesmen/pendamping yang ditugaskan.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {detail.penugasan.map((t) => (
                    <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{t.petugasNama}</div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {t.peranTugas} · Target: {formatTanggal(t.targetTindakLanjut)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{t.catatanPenugasan}</div>
                      </div>
                      <span className="text-xs font-semibold text-teal-800 shrink-0">{t.statusTugas}</span>
                    </div>
                  ))}
                </div>
              )}

              {hasPerm(user, 'penugasan.manage') && (
                <form onSubmit={handleAssignSubmit} className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-navy-900">Tugaskan Petugas Baru</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={assignPetugasId}
                      onChange={(e) => setAssignPetugasId(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      required
                    >
                      <option value="">Pilih Petugas</option>
                      {petugasList
                        .filter((p) => p.role === 'ASESMEN_PENDAMPING')
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nama}
                          </option>
                        ))}
                    </select>
                    <select
                      value={assignPeran}
                      onChange={(e) =>
                        setAssignPeran(
                          e.target.value as 'Petugas Asesmen' | 'Petugas Pendamping' | 'Penanggung Jawab Kasus'
                        )
                      }
                      className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Penanggung Jawab Kasus">Penanggung Jawab Kasus</option>
                      <option value="Petugas Asesmen">Petugas Asesmen</option>
                      <option value="Petugas Pendamping">Petugas Pendamping</option>
                    </select>
                    <input
                      type="date"
                      value={assignTarget}
                      onChange={(e) => setAssignTarget(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={assignNote}
                      onChange={(e) => setAssignNote(e.target.value)}
                      placeholder="Instruksi singkat tindak lanjut..."
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      Tugaskan
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Protected Victim Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-navy-900">Data Korban</h2>
              {korban.isMasked ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Disamarkan</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Akses Berwenang</span>
                </span>
              )}
            </div>

            {korban.isMasked && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 leading-relaxed">
                Identitas lengkap korban dilindungi oleh prinsip kebutuhan untuk mengetahui (RBAC). Hanya Petugas Penerima atau Petugas Pendamping yang ditugaskan pada kasus ini yang dapat membuka identitas penuh.
              </div>
            )}

            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-slate-500">Kode Kasus / Inisial</dt>
                <dd className="font-mono font-semibold text-navy-900 mt-0.5">
                  {korban.kodeAnonim} · {korban.inisial}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Nama Lengkap</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{korban.namaLengkap}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-slate-500">Kelompok Usia</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{korban.kelompokUsia}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Jenis Kelamin</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{korban.jenisKelamin}</dd>
                </div>
              </div>
              <div>
                <dt className="text-slate-500">Wilayah Domisili</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{korban.alamatRingkas}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Kontak Aman</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{korban.kontakAman}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Hubungan Pelapor</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{korban.hubunganPelapor}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* TAB 2: SIAP ASESMEN */}
      {activeTab === 'asesmen' && (
        <div className="space-y-6">
          {detail.asesmen.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
              Belum ada hasil asesmen awal yang dicatat untuk kasus ini.
            </div>
          ) : (
            detail.asesmen.map((asm) => (
              <div key={asm.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <div className="text-sm font-bold text-navy-900">
                      Asesmen Awal — {formatTanggal(asm.tanggalAsesmen)}
                    </div>
                    <div className="text-xs text-slate-500">Oleh: {asm.petugasAsesmenNama}</div>
                  </div>
                  <span className="text-xs font-mono text-slate-500">{asm.id}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-slate-500">Kebutuhan Korban</div>
                    <p className="text-slate-800 mt-1">{asm.kebutuhanKorban}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500">Identifikasi Kebutuhan Perlindungan</div>
                    <p className="text-slate-800 mt-1">{asm.kebutuhanPerlindungan}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-navy-900">
                      Layanan Psikologis: {asm.butuhLayananPsikologis ? 'Diperlukan' : 'Tidak'}
                    </div>
                    <p className="text-slate-600 mt-1">{asm.rincianPsikologis}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-navy-900">
                      Layanan Hukum: {asm.butuhLayananHukum ? 'Diperlukan' : 'Tidak'}
                    </div>
                    <p className="text-slate-600 mt-1">{asm.rincianHukum}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-navy-900">
                      Layanan Kesehatan: {asm.butuhLayananKesehatan ? 'Diperlukan' : 'Tidak'}
                    </div>
                    <p className="text-slate-600 mt-1">{asm.rincianKesehatan}</p>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Rencana Tindak Lanjut</div>
                  <p className="text-sm text-slate-800 mt-1">{asm.rencanaTindakLanjut}</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                  <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Catatan Asesmen Akses Terbatas</span>
                  </div>
                  <p className="text-amber-950 mt-1">{asm.catatanTerbatas}</p>
                </div>
              </div>
            ))
          )}

          {hasPerm(user, 'asesmen.manage') && detail.canEditCase && (
            <form onSubmit={handleAsesmenSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-navy-900">Tambah Asesmen Awal Baru</h3>
                <p className="text-xs text-slate-500">
                  Penilaian dan rencana layanan ditetapkan sepenuhnya oleh petugas berwenang (non-AI).
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kebutuhan Korban *</label>
                  <textarea
                    required
                    rows={2}
                    value={asmKebutuhan}
                    onChange={(e) => setAsmKebutuhan(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kebutuhan Perlindungan *</label>
                  <textarea
                    required
                    rows={2}
                    value={asmPerlindungan}
                    onChange={(e) => setAsmPerlindungan(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 font-semibold text-slate-800">
                    <input type="checkbox" checked={asmPsi} onChange={(e) => setAsmPsi(e.target.checked)} />
                    <span>Butuh Layanan Psikologis</span>
                  </label>
                  <input
                    type="text"
                    value={asmPsiNote}
                    onChange={(e) => setAsmPsiNote(e.target.value)}
                    placeholder="Keterangan kebutuhan psikologis"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 font-semibold text-slate-800">
                    <input type="checkbox" checked={asmHukum} onChange={(e) => setAsmHukum(e.target.checked)} />
                    <span>Butuh Layanan Hukum</span>
                  </label>
                  <input
                    type="text"
                    value={asmHukumNote}
                    onChange={(e) => setAsmHukumNote(e.target.value)}
                    placeholder="Keterangan kebutuhan hukum"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 font-semibold text-slate-800">
                    <input type="checkbox" checked={asmKes} onChange={(e) => setAsmKes(e.target.checked)} />
                    <span>Butuh Layanan Kesehatan</span>
                  </label>
                  <input
                    type="text"
                    value={asmKesNote}
                    onChange={(e) => setAsmKesNote(e.target.value)}
                    placeholder="Keterangan kebutuhan medis/visum"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rencana Tindak Lanjut *</label>
                <textarea
                  required
                  rows={2}
                  value={asmRencana}
                  onChange={(e) => setAsmRencana(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Asesmen Akses Terbatas (Rahasia)
                </label>
                <textarea
                  rows={2}
                  value={asmTerbatas}
                  onChange={(e) => setAsmTerbatas(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold cursor-pointer"
                >
                  Simpan Asesmen
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: SIAP KOORDINASI */}
      {activeTab === 'koordinasi' && (
        <CaseKoordinasiTab
          pengaduanId={pengaduanId}
          items={detail.koordinasi}
          mitraList={mitraList}
          canManage={hasPerm(user, 'koordinasi.manage') && detail.canEditCase}
          onReload={loadDetail}
          onMessage={setActionMessage}
        />
      )}

      {/* TAB 4: SIAP DAMPING */}
      {activeTab === 'pendampingan' && (
        <CasePendampinganTab
          pengaduanId={pengaduanId}
          items={detail.pendampingan}
          canManage={hasPerm(user, 'pendampingan.manage') && detail.canEditCase}
          onReload={loadDetail}
          onMessage={setActionMessage}
        />
      )}

      {/* TAB 5: SIAP RUJUK */}
      {activeTab === 'rujukan' && (
        <CaseRujukanTab
          pengaduanId={pengaduanId}
          items={detail.rujukan}
          mitraList={mitraList}
          canManage={hasPerm(user, 'rujukan.manage') && detail.canEditCase}
          onReload={loadDetail}
          onMessage={setActionMessage}
        />
      )}

      {/* TAB 6: RIWAYAT KASUS */}
      {activeTab === 'riwayat' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-base font-bold text-navy-900">Jejak Audit & Aktivitas Kasus</h3>
          </div>
          {detail.aktivitasKasus.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">Belum ada log aktivitas untuk kasus ini.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {detail.aktivitasKasus.map((log) => (
                <div key={log.id} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-navy-900">{log.modul}</span> ·{' '}
                    <span className="text-slate-700">{log.ringkasan}</span>
                    <div className="text-slate-500 mt-0.5">Oleh: {log.userNama}</div>
                  </div>
                  <div className="font-mono tabular-nums text-slate-500 shrink-0">
                    {formatWaktuIso(log.waktu)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CaseKoordinasiTab: React.FC<{
  pengaduanId: string;
  items: PengaduanDetailResponse['koordinasi'];
  mitraList: MitraLayananRecord[];
  canManage: boolean;
  onReload: () => Promise<void>;
  onMessage: (msg: string) => void;
}> = ({ pengaduanId, items, mitraList, canManage, onReload, onMessage }) => {
  const [mitraId, setMitraId] = useState(mitraList[0]?.id ?? '');
  const [kebutuhan, setKebutuhan] = useState('');
  const [hasil, setHasil] = useState('');
  const [status, setStatus] = useState<StatusTindakLanjut>(StatusTindakLanjut.DALAM_PROSES);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createKoordinasi({
      pengaduanId,
      mitraId,
      jenisKebutuhan: kebutuhan,
      hasilKoordinasi: hasil,
      statusTindakLanjut: status,
      tanggalKoordinasi: new Date().toISOString().slice(0, 10),
    });
    setKebutuhan('');
    setHasil('');
    onMessage('Riwayat koordinasi lintas sektor berhasil ditambahkan.');
    await onReload();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Belum ada catatan koordinasi lintas sektor.</div>
        ) : (
          items.map((k) => (
            <div key={k.id} className="p-5 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold text-navy-900">{k.instansiDikoordinasikan}</div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColorClass(k.statusTindakLanjut)}`}>
                  {k.statusTindakLanjut}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {formatTanggal(k.tanggalKoordinasi)} · Penanggung jawab: {k.petugasPenanggungJawabNama}
              </div>
              <div className="text-xs font-semibold text-slate-700 pt-1">Kebutuhan: {k.jenisKebutuhan}</div>
              <p className="text-sm text-slate-700">{k.hasilKoordinasi}</p>
            </div>
          ))
        )}
      </div>

      {canManage && (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-bold text-navy-900">Catat Koordinasi Baru</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Instansi / Mitra</label>
              <select
                value={mitraId}
                onChange={(e) => setMitraId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {mitraList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.namaLembaga}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Tindak Lanjut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusTindakLanjut)}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kebutuhan Koordinasi *</label>
            <input
              type="text"
              required
              value={kebutuhan}
              onChange={(e) => setKebutuhan(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hasil Koordinasi *</label>
            <textarea
              required
              rows={2}
              value={hasil}
              onChange={(e) => setHasil(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold cursor-pointer">
              Simpan Koordinasi
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const CasePendampinganTab: React.FC<{
  pengaduanId: string;
  items: PengaduanDetailResponse['pendampingan'];
  canManage: boolean;
  onReload: () => Promise<void>;
  onMessage: (msg: string) => void;
}> = ({ pengaduanId, items, canManage, onReload, onMessage }) => {
  const [jenis, setJenis] = useState<JenisLayananPendampingan>(JenisLayananPendampingan.PSIKOLOGIS);
  const [bentuk, setBentuk] = useState('');
  const [catatan, setCatatan] = useState('');
  const [status, setStatus] = useState<StatusPendampingan>(StatusPendampingan.BERJALAN);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createPendampingan({
      pengaduanId,
      tanggalPendampingan: new Date().toISOString().slice(0, 10),
      jenisLayanan: jenis,
      bentukPendampingan: bentuk,
      catatanPerkembangan: catatan,
      statusPendampingan: status,
    });
    setBentuk('');
    setCatatan('');
    onMessage('Catatan sesi pendampingan berhasil disimpan.');
    await onReload();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Belum ada sesi pendampingan tercatat.</div>
        ) : (
          items.map((d) => (
            <div key={d.id} className="p-5 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold text-navy-900">{d.jenisLayanan}</div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColorClass(d.statusPendampingan)}`}>
                  {d.statusPendampingan}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {formatTanggal(d.tanggalPendampingan)} · Pendamping: {d.petugasPendampingNama}
              </div>
              <div className="text-xs font-semibold text-slate-700 pt-1">{d.bentukPendampingan}</div>
              <p className="text-sm text-slate-700">{d.catatanPerkembangan}</p>
            </div>
          ))
        )}
      </div>

      {canManage && (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-bold text-navy-900">Catat Pendampingan Baru</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Layanan</label>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value as JenisLayananPendampingan)}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Pendampingan</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusPendampingan)}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bentuk / Sesi Pendampingan *</label>
            <input
              type="text"
              required
              value={bentuk}
              onChange={(e) => setBentuk(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Perkembangan *</label>
            <textarea
              required
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold cursor-pointer">
              Simpan Pendampingan
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const CaseRujukanTab: React.FC<{
  pengaduanId: string;
  items: PengaduanDetailResponse['rujukan'];
  mitraList: MitraLayananRecord[];
  canManage: boolean;
  onReload: () => Promise<void>;
  onMessage: (msg: string) => void;
}> = ({ pengaduanId, items, mitraList, canManage, onReload, onMessage }) => {
  const [mitraId, setMitraId] = useState(mitraList[0]?.id ?? '');
  const [layanan, setLayanan] = useState('');
  const [alasan, setAlasan] = useState('');
  const [status, setStatus] = useState<StatusRujukan>(StatusRujukan.SUDAH_DIKIRIM);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createRujukan({
      pengaduanId,
      mitraId,
      jenisLayananDibutuhkan: layanan,
      alasanRujukan: alasan,
      tanggalRujukan: new Date().toISOString().slice(0, 10),
      statusRujukan: status,
    });
    setLayanan('');
    setAlasan('');
    onMessage('Rujukan mitra berhasil dicatat.');
    await onReload();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Belum ada rujukan untuk kasus ini.</div>
        ) : (
          items.map((r) => (
            <div key={r.id} className="p-5 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold text-navy-900">{r.namaLembagaTujuan}</div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColorClass(r.statusRujukan)}`}>
                  {r.statusRujukan}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {formatTanggal(r.tanggalRujukan)} · Pengirim: {r.petugasPengirimNama}
              </div>
              <div className="text-xs font-semibold text-slate-700 pt-1">{r.jenisLayananDibutuhkan}</div>
              <p className="text-sm text-slate-700">Alasan: {r.alasanRujukan}</p>
              <p className="text-xs text-teal-800">Konfirmasi: {r.konfirmasiTindakLanjut}</p>
            </div>
          ))
        )}
      </div>

      {canManage && (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-bold text-navy-900">Buat Rujukan Mitra Baru</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lembaga Tujuan (Direktori Mitra)</label>
              <select
                value={mitraId}
                onChange={(e) => setMitraId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {mitraList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.namaLembaga}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Awal Rujukan</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusRujukan)}
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Layanan yang Dibutuhkan *</label>
            <input
              type="text"
              required
              value={layanan}
              onChange={(e) => setLayanan(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Rujukan *</label>
            <textarea
              required
              rows={2}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold cursor-pointer">
              Kirim & Catat Rujukan
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

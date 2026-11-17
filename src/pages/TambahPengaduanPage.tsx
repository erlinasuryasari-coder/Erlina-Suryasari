import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PageRoute } from '../components/AppShell.tsx';
import { api, KECAMATAN_SIDOARJO } from '../lib/api.ts';
import {
  KanalPengaduan,
  KategoriKasus,
  PrioritasKasus,
  SessionUser,
  StatusPengaduan,
} from '../types/sigap.ts';

interface TambahPengaduanPageProps {
  user: SessionUser;
  onNavigate: (page: PageRoute) => void;
  onCreated: (pengaduanId: string) => void;
}

export const TambahPengaduanPage: React.FC<TambahPengaduanPageProps> = ({
  user,
  onNavigate,
  onCreated,
}) => {
  const [nextNomor, setNextNomor] = useState('REG-PPA-SDA-2026-....');
  const [tanggalPenerimaan, setTanggalPenerimaan] = useState(new Date().toISOString().slice(0, 10));
  const [waktuPenerimaan, setWaktuPenerimaan] = useState('09:30');
  const [kanal, setKanal] = useState<KanalPengaduan>(KanalPengaduan.DATANG_LANGSUNG);
  const [kategori, setKategori] = useState<KategoriKasus>(KategoriKasus.KDRT);
  const [prioritas, setPrioritas] = useState<PrioritasKasus>(PrioritasKasus.STANDAR);
  const [kecamatanKejadian, setKecamatanKejadian] = useState('Sidoarjo');
  const [status, setStatus] = useState<StatusPengaduan>(StatusPengaduan.BARU_DITERIMA);

  const [namaPelapor, setNamaPelapor] = useState('');
  const [statusPelapor, setStatusPelapor] = useState('Korban Langsung');
  const [kontakPelapor, setKontakPelapor] = useState('');
  const [ringkasanPengaduan, setRingkasanPengaduan] = useState('');

  const [korbanInisial, setKorbanInisial] = useState('');
  const [korbanNamaLengkap, setKorbanNamaLengkap] = useState('');
  const [korbanNikSamaran, setKorbanNikSamaran] = useState('3515********** (Simulasi)');
  const [korbanKelompokUsia, setKorbanKelompokUsia] = useState<'Anak (< 18 tahun)' | 'Dewasa (≥ 18 tahun)'>(
    'Dewasa (≥ 18 tahun)'
  );
  const [korbanUsia, setKorbanUsia] = useState(25);
  const [korbanJenisKelamin, setKorbanJenisKelamin] = useState<'Perempuan' | 'Laki-laki'>('Perempuan');
  const [korbanKecamatan, setKorbanKecamatan] = useState('Sidoarjo');
  const [korbanAlamat, setKorbanAlamat] = useState('');
  const [korbanKontakAman, setKorbanKontakAman] = useState('');
  const [hubunganPelapor, setHubunganPelapor] = useState('Korban melapor sendiri');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getNextNomorRegistrasi()
      .then((res) => setNextNomor(res.nextNomorRegistrasi))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.createPengaduan({
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
        korban: {
          inisial: korbanInisial,
          namaLengkap: korbanNamaLengkap || korbanInisial,
          nikSamaran: korbanNikSamaran,
          kelompokUsia: korbanKelompokUsia,
          usia: Number(korbanUsia),
          jenisKelamin: korbanJenisKelamin,
          kecamatanDomisili: korbanKecamatan,
          alamatRingkas: korbanAlamat,
          kontakAman: korbanKontakAman || kontakPelapor,
          hubunganPelapor,
        },
      });
      onCreated(res.pengaduan.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaduan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('pengaduan')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900 mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Data Pengaduan</span>
          </button>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            Formulir Penerimaan Pengaduan — SIAP LAPOR
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Catat data minimum pelapor dan korban secara aman. Nomor registrasi dibuat otomatis oleh sistem.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong>Pengingat Privasi & Simulasi:</strong> Hanya masukkan data simulasi/dummy untuk demonstrasi. Informasi identitas korban otomatis disamarkan pada dashboard dan laporan umum.
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Registrasi & Klasifikasi */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-navy-900">01. Registrasi & Klasifikasi Awal</h2>
              <p className="text-xs text-slate-500">Petugas penerima: {user.nama}</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[11px] text-slate-500">Perkiraan Nomor Registrasi Otomatis</div>
              <div className="font-mono text-sm font-bold text-teal-800 tabular-nums">{nextNomor}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Penerimaan *
              </label>
              <input
                type="date"
                required
                value={tanggalPenerimaan}
                onChange={(e) => setTanggalPenerimaan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Waktu Penerimaan (WIB) *
              </label>
              <input
                type="time"
                required
                value={waktuPenerimaan}
                onChange={(e) => setWaktuPenerimaan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kanal Pengaduan *
              </label>
              <select
                value={kanal}
                onChange={(e) => setKanal(e.target.value as KanalPengaduan)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {Object.values(KanalPengaduan).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kategori Kasus *
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as KategoriKasus)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {Object.values(KategoriKasus).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kecamatan Kejadian *
              </label>
              <select
                value={kecamatanKejadian}
                onChange={(e) => setKecamatanKejadian(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {KECAMATAN_SIDOARJO.map((kec) => (
                  <option key={kec} value={kec}>
                    Kec. {kec}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tingkat Prioritas Awal
              </label>
              <select
                value={prioritas}
                onChange={(e) => setPrioritas(e.target.value as PrioritasKasus)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {Object.values(PrioritasKasus).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status Awal Pengaduan
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusPengaduan)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value={StatusPengaduan.BARU_DITERIMA}>{StatusPengaduan.BARU_DITERIMA}</option>
                <option value={StatusPengaduan.DALAM_VERIFIKASI}>{StatusPengaduan.DALAM_VERIFIKASI}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Data Minimum Pelapor */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-navy-900 pb-3 border-b border-slate-200">
            02. Data Minimum Pelapor & Ringkasan Pengaduan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Pelapor (Simulasi) *
              </label>
              <input
                type="text"
                required
                value={namaPelapor}
                onChange={(e) => setNamaPelapor(e.target.value)}
                placeholder="Misal: Ibu Rini (Simulasi)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status Pelapor
              </label>
              <input
                type="text"
                value={statusPelapor}
                onChange={(e) => setStatusPelapor(e.target.value)}
                placeholder="Korban Langsung / Wali / Mitra"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kontak Pelapor Aman
              </label>
              <input
                type="text"
                value={kontakPelapor}
                onChange={(e) => setKontakPelapor(e.target.value)}
                placeholder="08xx-xxxx-xxxx (Simulasi)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ringkasan Pengaduan (Objektif & Ramah Korban) *
            </label>
            <textarea
              required
              rows={3}
              value={ringkasanPengaduan}
              onChange={(e) => setRingkasanPengaduan(e.target.value)}
              placeholder="Uraikan kronologi singkat, kebutuhan mendesak, dan layanan awal yang dimohonkan..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>

        {/* Section 3: Data Minimum Korban (Terlindungi) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-navy-900">
              03. Data Minimum Korban (Terenkapsulasi & Terbatas)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hanya diisi sebatas kebutuhan pelayanan. Tidak ditampilkan pada dashboard umum atau laporan agregat.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Inisial / Samaran Korban *
              </label>
              <input
                type="text"
                required
                value={korbanInisial}
                onChange={(e) => setKorbanInisial(e.target.value)}
                placeholder="Misal: K.S. (Simulasi)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Lengkap (Simulasi)
              </label>
              <input
                type="text"
                value={korbanNamaLengkap}
                onChange={(e) => setKorbanNamaLengkap(e.target.value)}
                placeholder="Kosongkan atau isi nama samaran"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kelompok Usia *
              </label>
              <select
                value={korbanKelompokUsia}
                onChange={(e) =>
                  setKorbanKelompokUsia(e.target.value as 'Anak (< 18 tahun)' | 'Dewasa (≥ 18 tahun)')
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="Anak (< 18 tahun)">Anak (&lt; 18 tahun)</option>
                <option value="Dewasa (≥ 18 tahun)">Dewasa (≥ 18 tahun)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Perkiraan Usia (Tahun)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={korbanUsia}
                onChange={(e) => setKorbanUsia(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis Kelamin
              </label>
              <select
                value={korbanJenisKelamin}
                onChange={(e) => setKorbanJenisKelamin(e.target.value as 'Perempuan' | 'Laki-laki')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="Perempuan">Perempuan</option>
                <option value="Laki-laki">Laki-laki</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kecamatan Domisili
              </label>
              <select
                value={korbanKecamatan}
                onChange={(e) => setKorbanKecamatan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {KECAMATAN_SIDOARJO.map((kec) => (
                  <option key={kec} value={kec}>
                    Kec. {kec}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                NIK Samaran (Opsional)
              </label>
              <input
                type="text"
                value={korbanNikSamaran}
                onChange={(e) => setKorbanNikSamaran(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Ringkas (Simulasi)
              </label>
              <input
                type="text"
                value={korbanAlamat}
                onChange={(e) => setKorbanAlamat(e.target.value)}
                placeholder="Desa/Kelurahan (Simulasi)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hubungan dengan Pelapor
              </label>
              <input
                type="text"
                value={hubunganPelapor}
                onChange={(e) => setHubunganPelapor(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kontak Aman yang Dapat Dihubungi
              </label>
              <input
                type="text"
                value={korbanKontakAman}
                onChange={(e) => setKorbanKontakAman(e.target.value)}
                placeholder="Nomor telepon aman korban/wali (Simulasi)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onNavigate('pengaduan')}
            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Menyimpan & Membuat Nomor...' : 'Simpan Pengaduan & Terbitkan Nomor'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Building2, PlusCircle, Search } from 'lucide-react';
import { api, hasPerm } from '../lib/api.ts';
import { MitraLayananRecord, SessionUser } from '../types/sigap.ts';

interface MitraPageProps {
  user: SessionUser;
}

const SEKTOR_LIST: MitraLayananRecord['kategoriSektor'][] = [
  'Kepolisian',
  'Kesehatan',
  'Bantuan Hukum',
  'Sosial & Shelter',
  'Pendidikan',
  'Keagamaan / KUA',
  'Lainnya',
];

export const MitraPage: React.FC<MitraPageProps> = ({ user }) => {
  const [mitra, setMitra] = useState<MitraLayananRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [namaLembaga, setNamaLembaga] = useState('');
  const [kategoriSektor, setKategoriSektor] =
    useState<MitraLayananRecord['kategoriSektor']>('Kesehatan');
  const [jenisLayanan, setJenisLayanan] = useState('');
  const [kontakKedinasan, setKontakKedinasan] = useState('');
  const [wilayahLayanan, setWilayahLayanan] = useState('Kabupaten Sidoarjo');
  const [alamatKantor, setAlamatKantor] = useState('');

  const canManage = hasPerm(user, 'mitra.manage');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getMitra();
      setMitra(res.mitra);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat direktori mitra.');
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
      await api.createMitra({
        namaLembaga,
        kategoriSektor,
        jenisLayanan,
        kontakKedinasan,
        wilayahLayanan,
        alamatKantor,
        aktif: true,
      });
      setNamaLembaga('');
      setJenisLayanan('');
      setKontakKedinasan('');
      setAlamatKantor('');
      setShowForm(false);
      setSuccess('Mitra layanan baru berhasil ditambahkan ke direktori.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah mitra.');
    }
  };

  const handleToggleAktif = async (m: MitraLayananRecord) => {
    try {
      await api.updateMitra(m.id, { aktif: !m.aktif });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status mitra.');
    }
  };

  const filtered = mitra.filter(
    (m) =>
      !q.trim() ||
      m.namaLembaga.toLowerCase().includes(q.toLowerCase()) ||
      m.kategoriSektor.toLowerCase().includes(q.toLowerCase()) ||
      m.jenisLayanan.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Direktori Mitra Layanan</h1>
          <p className="text-sm text-slate-600 mt-1">
            Daftar instansi dan lembaga mitra rujukan serta koordinasi lintas sektor Kabupaten Sidoarjo.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showForm ? 'Tutup Formulir' : 'Tambah Mitra Layanan'}</span>
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
            Tambah Instansi Mitra Terverifikasi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lembaga *</label>
              <input
                type="text"
                required
                value={namaLembaga}
                onChange={(e) => setNamaLembaga(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sektor *</label>
              <select
                value={kategoriSektor}
                onChange={(e) => setKategoriSektor(e.target.value as MitraLayananRecord['kategoriSektor'])}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {SEKTOR_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kontak Kedinasan *</label>
              <input
                type="text"
                required
                value={kontakKedinasan}
                onChange={(e) => setKontakKedinasan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Wilayah Layanan *</label>
              <input
                type="text"
                required
                value={wilayahLayanan}
                onChange={(e) => setWilayahLayanan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Layanan *</label>
            <input
              type="text"
              required
              value={jenisLayanan}
              onChange={(e) => setJenisLayanan(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Kantor</label>
            <input
              type="text"
              value={alamatKantor}
              onChange={(e) => setAlamatKantor(e.target.value)}
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
              Simpan Mitra
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama lembaga, sektor, atau jenis layanan..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-sm text-slate-500 text-center">Memuat direktori mitra...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-navy-900">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-teal-800">{m.kategoriSektor}</div>
                    <h3 className="text-sm font-bold text-navy-900 mt-0.5">{m.namaLembaga}</h3>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded border shrink-0 ${
                    m.aktif
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-slate-600 bg-slate-100 border-slate-200'
                  }`}
                >
                  {m.aktif ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{m.jenisLayanan}</p>
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div>
                  <span className="font-semibold text-slate-800">Kontak:</span> {m.kontakKedinasan}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Wilayah:</span> {m.wilayahLayanan}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Alamat:</span> {m.alamatKantor}
                </div>
              </div>
              {canManage && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleAktif(m)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    {m.aktif ? 'Nonaktifkan Mitra' : 'Aktifkan Kembali'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

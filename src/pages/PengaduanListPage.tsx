import React, { useEffect, useState } from 'react';
import { FilePlus2, Lock, Search } from 'lucide-react';
import { PageRoute } from '../components/AppShell.tsx';
import { api, formatTanggal, getStatusColorClass, hasPerm } from '../lib/api.ts';
import {
  KanalPengaduan,
  KategoriKasus,
  PengaduanListItem,
  SessionUser,
  StatusPengaduan,
} from '../types/sigap.ts';

interface PengaduanListPageProps {
  user: SessionUser;
  onNavigate: (page: PageRoute) => void;
  onOpenCase: (id: string) => void;
}

export const PengaduanListPage: React.FC<PengaduanListPageProps> = ({
  user,
  onNavigate,
  onOpenCase,
}) => {
  const [items, setItems] = useState<PengaduanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [kategori, setKategori] = useState('');
  const [kanal, setKanal] = useState('');

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPengaduanList({ q, status, kategori, kanal });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar pengaduan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList();
    }, 150);
    return () => clearTimeout(timer);
  }, [q, status, kategori, kanal]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            Data Pengaduan — SIAP LAPOR
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Register pengaduan pelayanan UPTD PPA Kabupaten Sidoarjo. Pencarian berdasarkan nomor registrasi, kategori, atau kode kasus.
          </p>
        </div>
        {hasPerm(user, 'pengaduan.create') && (
          <button
            type="button"
            onClick={() => onNavigate('pengaduan-baru')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Tambah Pengaduan Baru</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nomor registrasi (REG-PPA-SDA-...), kecamatan, atau ringkasan..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            aria-label="Filter kategori kasus"
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="">Semua Kategori Kasus</option>
            {Object.values(KategoriKasus).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={kanal}
            onChange={(e) => setKanal(e.target.value)}
            aria-label="Filter kanal pengaduan"
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="">Semua Kanal Pengaduan</option>
            {Object.values(KanalPengaduan).map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>

        {/* Status Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setStatus('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              status === ''
                ? 'bg-navy-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Status
          </button>
          {Object.values(StatusPengaduan).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                status === st
                  ? 'bg-navy-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {error ? (
          <div className="p-6 text-sm text-red-700">{error}</div>
        ) : loading ? (
          <div className="p-8 text-sm text-slate-500 text-center">Memuat register pengaduan...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-600">
              Tidak ada data pengaduan yang sesuai dengan filter atau penugasan Anda.
            </p>
            {hasPerm(user, 'pengaduan.create') && (
              <button
                type="button"
                onClick={() => onNavigate('pengaduan-baru')}
                className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold cursor-pointer"
              >
                Catat Pengaduan Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">No. Registrasi & Tanggal</th>
                  <th className="py-3 px-4">Kategori & Kanal</th>
                  <th className="py-3 px-4">Korban (Sesuai Hak Akses)</th>
                  <th className="py-3 px-4">Status Penanganan</th>
                  <th className="py-3 px-4">Layanan Tercatat</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(({ pengaduan, korbanRingkas, assignedPetugasNames, hasAsesmen, jumlahKoordinasi, jumlahPendampingan, jumlahRujukan }) => (
                  <tr key={pengaduan.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-mono text-xs font-semibold text-navy-900 tabular-nums">
                        {pengaduan.nomorRegistrasi}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 tabular-nums">
                        {formatTanggal(pengaduan.tanggalPenerimaan)} · {pengaduan.waktuPenerimaan} WIB
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Kec. {pengaduan.kecamatanKejadian}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <div className="text-xs font-semibold text-slate-900">{pengaduan.kategori}</div>
                      <div className="text-xs text-slate-500 mt-1">{pengaduan.kanal}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{pengaduan.prioritas}</div>
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <div className="text-xs font-medium text-slate-900 flex items-center gap-1.5">
                        {korbanRingkas.namaTampil.startsWith('KBN-') && (
                          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span>{korbanRingkas.namaTampil}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {korbanRingkas.kelompokUsia} · Kec. {korbanRingkas.kecamatanDomisili}
                      </div>
                      {assignedPetugasNames.length > 0 && (
                        <div className="text-[11px] text-teal-800 mt-1">
                          Petugas: {assignedPetugasNames.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded border ${getStatusColorClass(
                          pengaduan.status
                        )}`}
                      >
                        {pengaduan.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-top text-xs text-slate-600 tabular-nums">
                      <div>Asesmen: {hasAsesmen ? 'Sudah' : 'Belum'}</div>
                      <div className="mt-0.5">
                        Koord {jumlahKoordinasi} · Damping {jumlahPendampingan} · Rujuk {jumlahRujukan}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => onOpenCase(pengaduan.id)}
                        className="px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Buka Kasus
                      </button>
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

import React, { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { api } from '../lib/api.ts';
import { DashboardSummary } from '../types/sigap.ts';

export const LaporanPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    api
      .getDashboard()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat laporan agregat.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadCsv = () => {
    if (!summary) return;
    const rows: string[][] = [
      ['Laporan Rekapitulasi Agregat SIGAP PPA SIDOARJO (Tanpa Identitas Korban)'],
      ['Tanggal Cetak', new Date().toISOString().slice(0, 10)],
      [],
      ['Ringkasan Statistik', 'Jumlah'],
      ['Total Pengaduan', String(summary.kpi.totalPengaduan)],
      ['Pengaduan Bulan Ini', String(summary.kpi.pengaduanBulanIni)],
      ['Kasus Dalam Penanganan', String(summary.kpi.kasusDalamPenanganan)],
      ['Kasus Menunggu Asesmen', String(summary.kpi.kasusMenungguAsesmen)],
      ['Kasus Membutuhkan Tindak Lanjut', String(summary.kpi.kasusButuhTindakLanjut)],
      ['Rujukan Sedang Berjalan', String(summary.kpi.rujukanSedangBerjalan)],
      ['Kasus Selesai Administratif', String(summary.kpi.kasusSelesaiAdministratif)],
      [],
      ['Distribusi Kategori Kasus', 'Jumlah'],
      ...summary.grafikKategori.map((k) => [k.kategori, String(k.jumlah)]),
      [],
      ['Distribusi Status Penanganan', 'Jumlah'],
      ...summary.grafikStatus.map((s) => [s.status, String(s.jumlah)]),
      [],
      ['Distribusi Status Rujukan', 'Jumlah'],
      ...summary.grafikRujukan.map((r) => [r.status, String(r.jumlah)]),
    ];

    const csvContent = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-agregat-sigap-ppa-sidoarjo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Menyiapkan laporan agregat pelayanan...</div>;
  }

  if (error || !summary) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 text-sm text-red-800 space-y-3">
        <p>{error || 'Data laporan tidak tersedia untuk peran Anda.'}</p>
        <button
          type="button"
          onClick={loadData}
          className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold cursor-pointer"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            Laporan Pelayanan Agregat
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Rekapitulasi statistik layanan UPTD PPA Kabupaten Sidoarjo. Seluruh identitas korban dipisahkan dari laporan agregat sesuai kebijakan privasi.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-navy-900 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV Agregat</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Printable Official Aggregate Report */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-8">
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-teal-800">UPTD PPA KABUPATEN SIDOARJO</div>
            <h2 className="text-lg font-bold text-navy-900 mt-0.5">
              Laporan Rekapitulasi Pelayanan (Data Simulasi Prototipe)
            </h2>
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            Dicetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500">Total Pengaduan</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-navy-900 mt-1">
              {summary.kpi.totalPengaduan}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500">Dalam Penanganan</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-teal-700 mt-1">
              {summary.kpi.kasusDalamPenanganan}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500">Menunggu Asesmen</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
              {summary.kpi.kasusMenungguAsesmen}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500">Selesai Administratif</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
              {summary.kpi.kasusSelesaiAdministratif}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-bold text-navy-900 mb-3">Rekap Berdasarkan Kategori Kasus</h3>
            <table className="w-full text-left border-collapse text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 px-3 font-semibold text-slate-700">Kategori Kasus</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-slate-700">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.grafikKategori.map((k) => (
                  <tr key={k.kategori}>
                    <td className="py-2.5 px-3 text-slate-800">{k.kategori}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-navy-900">
                      {k.jumlah}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-sm font-bold text-navy-900 mb-3">Rekap Berdasarkan Status Penanganan</h3>
            <table className="w-full text-left border-collapse text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 px-3 font-semibold text-slate-700">Status Penanganan</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-slate-700">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.grafikStatus.map((s) => (
                  <tr key={s.status}>
                    <td className="py-2.5 px-3 text-slate-800">{s.status}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-navy-900">
                      {s.jumlah}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-navy-900 mb-3">Rekap Bulanan (6 Bulan Terakhir)</h3>
          <table className="w-full text-left border-collapse text-xs border border-slate-200">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-2.5 px-3 font-semibold text-slate-700">Bulan</th>
                <th className="py-2.5 px-3 text-right font-semibold text-slate-700">Pengaduan Masuk</th>
                <th className="py-2.5 px-3 text-right font-semibold text-slate-700">Selesai Administratif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.grafikBulanan.map((b) => (
                <tr key={b.bulan}>
                  <td className="py-2.5 px-3 text-slate-800">{b.bulan} 2026</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-navy-900">
                    {b.jumlah}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-teal-700">
                    {b.selesai}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

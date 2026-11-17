import React, { useEffect, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { HorizontalBarChart, MonthlyTrendChart } from '../components/Charts.tsx';
import { PageRoute } from '../components/AppShell.tsx';
import { api, formatTanggal, formatWaktuIso, getStatusColorClass } from '../lib/api.ts';
import { DashboardSummary, SessionUser } from '../types/sigap.ts';

interface DashboardPageProps {
  user: SessionUser;
  onNavigate: (page: PageRoute) => void;
  onOpenCase: (pengaduanId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onNavigate, onOpenCase }) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await api.getDashboard();
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat ringkasan dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 text-sm text-red-800">
        <p>{error || 'Data dashboard tidak tersedia.'}</p>
        <button
          type="button"
          onClick={loadData}
          className="mt-3 px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold cursor-pointer"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Pengaduan', value: data.kpi.totalPengaduan, note: 'Seluruh register simulasi' },
    { label: 'Pengaduan Bulan Ini', value: data.kpi.pengaduanBulanIni, note: 'Periode November 2026' },
    { label: 'Kasus Dalam Penanganan', value: data.kpi.kasusDalamPenanganan, note: 'Pendampingan & koordinasi' },
    { label: 'Kasus Menunggu Asesmen', value: data.kpi.kasusMenungguAsesmen, note: 'Verifikasi & asesmen awal' },
    { label: 'Membutuhkan Tindak Lanjut', value: data.kpi.kasusButuhTindakLanjut, note: 'Perlu aksi petugas' },
    { label: 'Rujukan Sedang Berjalan', value: data.kpi.rujukanSedangBerjalan, note: 'Menunggu konfirmasi mitra' },
    { label: 'Selesai Administratif', value: data.kpi.kasusSelesaiAdministratif, note: 'Penutupan sesuai SOP' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            Dashboard Pelayanan Terpadu
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Ringkasan statistik agregat dan antrean tindak lanjut untuk {user.nama}. Identitas korban disamarkan pada tampilan dashboard umum.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Perbarui Data</span>
        </button>
      </div>

      {/* 7 KPI Cards */}
      <section aria-label="Kartu statistik utama">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
            >
              <div className="text-xs font-medium text-slate-500">{card.label}</div>
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <span className="text-3xl font-bold font-mono tabular-nums text-navy-900">
                  {card.value}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500">{card.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 Charts Grid */}
      <section aria-label="Grafik perkembangan pelayanan" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-navy-900">Grafik Pengaduan Bulanan</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-5">
            Perbandingan laporan masuk dan penyelesaian administratif per bulan.
          </p>
          <MonthlyTrendChart data={data.grafikBulanan} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-navy-900">Grafik Kategori Kasus</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-5">
            Sebaran jenis kasus yang ditangani UPTD PPA Kabupaten Sidoarjo.
          </p>
          <HorizontalBarChart
            data={data.grafikKategori.map((k) => ({ label: k.kategori, value: k.jumlah }))}
            barColorClass="bg-navy-900"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-navy-900">Grafik Status Penanganan</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-5">
            Distribusi tahapan penanganan kasus sesuai alur SOP pelayanan.
          </p>
          <HorizontalBarChart
            data={data.grafikStatus.map((s) => ({ label: s.status, value: s.jumlah }))}
            barColorClass="bg-teal-600"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-navy-900">Grafik Status Rujukan Mitra</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-5">
            Pemantauan tindak lanjut rujukan ke instansi mitra layanan.
          </p>
          <HorizontalBarChart
            data={data.grafikRujukan.map((r) => ({ label: r.status, value: r.jumlah }))}
            barColorClass="bg-blue-700"
          />
        </div>
      </section>

      {/* Follow-up Tasks & Recent Activity */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-navy-900">Daftar Tugas Perlu Ditindaklanjuti</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan kode anonim kasus sesuai kewenangan peran Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('pengaduan')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>Lihat semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {data.tugasTindakLanjut.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Tidak ada tugas kasus aktif yang menunggu tindak lanjut pada antrean Anda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">No. Registrasi</th>
                    <th className="py-3 px-4">Kategori & Kode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Petugas</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.tugasTindakLanjut.map((task) => (
                    <tr key={task.pengaduanId} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 align-top">
                        <div className="font-mono text-xs font-semibold text-navy-900 tabular-nums">
                          {task.nomorRegistrasi}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          {formatTanggal(task.tanggalPenerimaan)} · {task.prioritas}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="text-xs font-medium text-slate-900">{task.kategori}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{task.kodeKorban}</div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getStatusColorClass(
                            task.status
                          )}`}
                        >
                          {task.status}
                        </span>
                        <div className="text-xs text-slate-500 mt-1">{task.keterangan}</div>
                      </td>
                      <td className="py-3 px-4 align-top text-xs text-slate-700">
                        {task.petugasDitugaskan}
                      </td>
                      <td className="py-3 px-4 align-top text-right">
                        <button
                          type="button"
                          onClick={() => onOpenCase(task.pengaduanId)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-navy-900 hover:bg-navy-900 hover:text-white text-xs font-semibold text-navy-900 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-navy-900">Aktivitas Terbaru</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Jejak pencatatan sesuai hak akses pengguna.
            </p>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {data.aktivitasTerbaru.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">Belum ada aktivitas tercatat.</div>
            ) : (
              data.aktivitasTerbaru.map((log) => (
                <div key={log.id} className="px-6 py-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-teal-800">{log.modul}</span>
                    <span className="tabular-nums">{formatWaktuIso(log.waktu)}</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed">{log.ringkasan}</p>
                  <div className="text-[11px] text-slate-500">Oleh: {log.userNama}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

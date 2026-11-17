import React, { useEffect, useState } from 'react';
import { api, formatTanggal, getStatusColorClass } from '../lib/api.ts';
import {
  DashboardSummary,
  PenugasanRecord,
  PetugasProfile,
  RujukanRecord,
  StatusRujukan,
} from '../types/sigap.ts';

interface MonitoringPageProps {
  onOpenCase: (id: string) => void;
}

export const MonitoringPage: React.FC<MonitoringPageProps> = ({ onOpenCase }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tasks, setTasks] = useState<PenugasanRecord[]>([]);
  const [petugas, setPetugas] = useState<PetugasProfile[]>([]);
  const [rujukan, setRujukan] = useState<RujukanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboard(),
      api.getPenugasanList(),
      api.getPetugas(),
      api.getRujukanList(),
    ])
      .then(([dash, tsk, ptg, rjk]) => {
        setSummary(dash);
        setTasks(tsk.items);
        setPetugas(ptg.petugas);
        setRujukan(rjk.items);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !summary) {
    return <div className="p-8 text-sm text-slate-500">Memuat panel monitoring terpadu...</div>;
  }

  const prdMetrics = [
    {
      label: 'Pencatatan Pengaduan',
      value: `${summary.metrikPrd.pencatatanPengaduanPct}%`,
      target: 'Target awal: 100%',
    },
    {
      label: 'Cakupan Asesmen Awal',
      value: `${summary.metrikPrd.asesmenAwalPct}%`,
      target: 'Target awal: 100%',
    },
    {
      label: 'Kasus Memiliki Penanggung Jawab',
      value: `${summary.metrikPrd.penanggungJawabPct}%`,
      target: 'Target awal: 100%',
    },
    {
      label: 'Tindak Lanjut Rujukan Tercatat',
      value: `${summary.metrikPrd.tindakLanjutRujukanPct}%`,
      target: 'Target awal: 100%',
    },
    {
      label: 'Monitoring Kasus Aktif',
      value: `${summary.metrikPrd.monitoringAktifPct}%`,
      target: 'Target awal: 100%',
    },
    {
      label: 'Mitra Layanan Aktif',
      value: `${summary.metrikPrd.mitraAktifCount} Instansi`,
      target: 'Target awal: min. 5 instansi',
    },
  ];

  const caseload = petugas
    .filter((p) => p.role === 'ASESMEN_PENDAMPING')
    .map((p) => {
      const aktif = tasks.filter((t) => t.petugasId === p.id && t.statusTugas === 'Aktif').length;
      const selesai = tasks.filter((t) => t.petugasId === p.id && t.statusTugas === 'Selesai').length;
      return { ...p, aktif, selesai };
    });

  const pendingRujukan = rujukan.filter(
    (r) =>
      r.statusRujukan === StatusRujukan.BELUM_DIKIRIM ||
      r.statusRujukan === StatusRujukan.SUDAH_DIKIRIM ||
      r.statusRujukan === StatusRujukan.DALAM_PROSES
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
          Monitoring Kasus & Indikator Pelayanan — SIAP MONITOR
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Pemantauan agregat beban kerja petugas, progres rujukan, dan indikator kinerja pelayanan tanpa membuka identitas korban.
        </p>
      </div>

      {/* PRD Section 16 Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {prdMetrics.map((m) => (
          <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-500">{m.label}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-navy-900 mt-2">
              {m.value}
            </div>
            <div className="text-xs text-teal-800 mt-1.5">{m.target}</div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Officer Caseload */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-navy-900">Beban Penugasan Petugas</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi kasus aktif dan selesai pada petugas asesmen/pendamping.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Nama Petugas</th>
                  <th className="py-3 px-4 text-right">Tugas Aktif</th>
                  <th className="py-3 px-4 text-right">Tugas Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {caseload.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4">
                      <div className="text-xs font-semibold text-slate-900">{c.nama}</div>
                      <div className="text-[11px] text-slate-500">{c.jabatan}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-sm font-bold text-navy-900">
                      {c.aktif}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-sm font-semibold text-teal-700">
                      {c.selesai}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Referrals Monitor */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-navy-900">Pemantauan Rujukan Berjalan</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rujukan yang masih menunggu tindak lanjut atau konfirmasi akhir dari mitra.
            </p>
          </div>
          {pendingRujukan.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">Seluruh rujukan telah dikonfirmasi selesai.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingRujukan.map((r) => (
                <div key={r.id} className="px-6 py-3.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenCase(r.pengaduanId)}
                      className="font-mono text-xs font-semibold text-navy-900 hover:underline cursor-pointer"
                    >
                      {r.nomorRegistrasi}
                    </button>
                    <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
                      {r.namaLembagaTujuan}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Dikirim: {formatTanggal(r.tanggalRujukan)} · {r.jenisLayananDibutuhkan}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded border shrink-0 ${getStatusColorClass(
                      r.statusRujukan
                    )}`}
                  >
                    {r.statusRujukan}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Anonymized Active Case Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-navy-900">Pemantauan Kasus Aktif (Tersamarkan)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">No. Registrasi</th>
                <th className="py-3 px-4">Kode Korban</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Penanggung Jawab</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.tugasTindakLanjut.map((item) => (
                <tr key={item.pengaduanId} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => onOpenCase(item.pengaduanId)}
                      className="font-mono text-xs font-semibold text-navy-900 hover:underline cursor-pointer"
                    >
                      {item.nomorRegistrasi}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-slate-600">{item.kodeKorban}</td>
                  <td className="py-3 px-4 text-xs text-slate-800">{item.kategori}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getStatusColorClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700">{item.petugasDitugaskan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

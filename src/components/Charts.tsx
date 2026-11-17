import React from 'react';

interface MonthlyItem {
  bulan: string;
  jumlah: number;
  selesai: number;
}

export const MonthlyTrendChart: React.FC<{ data: MonthlyItem[] }> = ({ data }) => {
  const maxVal = Math.max(4, ...data.map((d) => d.jumlah));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Periode 6 bulan terakhir (agregat)</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-navy-900 inline-block" aria-hidden="true" />
            Pengaduan masuk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-teal-600 inline-block" aria-hidden="true" />
            Selesai administratif
          </span>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3 items-end h-44 pt-4 border-b border-slate-200 pb-2">
        {data.map((item) => {
          const masukPct = Math.round((item.jumlah / maxVal) * 100);
          const selesaiPct = Math.round((item.selesai / maxVal) * 100);
          return (
            <div key={item.bulan} className="flex flex-col items-center h-full justify-end gap-1.5">
              <div className="flex items-end gap-1.5 h-32 w-full justify-center">
                <div className="flex flex-col items-center justify-end h-full w-5">
                  <span className="text-[11px] font-mono tabular-nums text-slate-600 mb-1">
                    {item.jumlah}
                  </span>
                  <div
                    className="w-full bg-navy-900 rounded-t-sm transition-all duration-200"
                    style={{ height: `${Math.max(item.jumlah > 0 ? 12 : 3, masukPct)}%` }}
                    title={`${item.bulan}: ${item.jumlah} pengaduan masuk`}
                  />
                </div>
                <div className="flex flex-col items-center justify-end h-full w-5">
                  <span className="text-[11px] font-mono tabular-nums text-teal-700 mb-1">
                    {item.selesai}
                  </span>
                  <div
                    className="w-full bg-teal-600 rounded-t-sm transition-all duration-200"
                    style={{ height: `${Math.max(item.selesai > 0 ? 12 : 3, selesaiPct)}%` }}
                    title={`${item.bulan}: ${item.selesai} selesai`}
                  />
                </div>
              </div>
              <span className="text-xs font-medium text-slate-600">{item.bulan}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const HorizontalBarChart: React.FC<{
  data: Array<{ label: string; value: number }>;
  barColorClass?: string;
  emptyText?: string;
}> = ({ data, barColorClass = 'bg-blue-700', emptyText = 'Belum ada data tercatat.' }) => {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">{emptyText}</p>;
  }
  const maxVal = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const pct = Math.round((item.value / maxVal) * 100);
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-700 font-medium truncate" title={item.label}>
                {item.label}
              </span>
              <span className="font-mono tabular-nums text-slate-900 font-semibold shrink-0">
                {item.value}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden">
              <div
                className={`h-full rounded-sm transition-all duration-200 ${barColorClass}`}
                style={{ width: `${Math.max(item.value > 0 ? 6 : 0, pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

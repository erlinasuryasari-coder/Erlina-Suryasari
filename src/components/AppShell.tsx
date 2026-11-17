import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardCheck,
  FilePlus2,
  FileText,
  FolderKanban,
  Handshake,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Send,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { hasPerm } from '../lib/api.ts';
import { SessionUser } from '../types/sigap.ts';
import { BrandMark } from './BrandMark.tsx';

export type PageRoute =
  | 'dashboard'
  | 'pengaduan'
  | 'pengaduan-baru'
  | 'pengaduan-detail'
  | 'asesmen'
  | 'penugasan'
  | 'koordinasi'
  | 'pendampingan'
  | 'rujukan'
  | 'monitoring'
  | 'laporan'
  | 'mitra'
  | 'pengguna'
  | 'pengaturan';

interface AppShellProps {
  user: SessionUser;
  activePage: PageRoute;
  breadcrumb: string;
  onNavigate: (page: PageRoute) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

interface NavItem {
  id: PageRoute;
  label: string;
  sublabel?: string;
  icon: React.FC<{ className?: string }>;
  visible: (u: SessionUser) => boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const AppShell: React.FC<AppShellProps> = ({
  user,
  activePage,
  breadcrumb,
  onNavigate,
  onLogout,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups: NavGroup[] = [
    {
      title: 'Ringkasan',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          visible: (u) => hasPerm(u, 'dashboard.view'),
        },
      ],
    },
    {
      title: 'Layanan Kasus',
      items: [
        {
          id: 'pengaduan',
          label: 'Data Pengaduan',
          sublabel: 'SIAP LAPOR',
          icon: FolderKanban,
          visible: (u) => hasPerm(u, 'pengaduan.view_all') || hasPerm(u, 'pengaduan.view_assigned'),
        },
        {
          id: 'pengaduan-baru',
          label: 'Tambah Pengaduan',
          sublabel: 'SIAP LAPOR',
          icon: FilePlus2,
          visible: (u) => hasPerm(u, 'pengaduan.create'),
        },
        {
          id: 'asesmen',
          label: 'Asesmen',
          sublabel: 'SIAP ASESMEN',
          icon: ClipboardCheck,
          visible: (u) =>
            hasPerm(u, 'asesmen.manage') ||
            hasPerm(u, 'pengaduan.view_all') ||
            hasPerm(u, 'pengaduan.view_assigned'),
        },
        {
          id: 'penugasan',
          label: 'Penugasan Petugas',
          icon: UserCheck,
          visible: (u) =>
            hasPerm(u, 'penugasan.manage') || hasPerm(u, 'pengaduan.view_assigned'),
        },
        {
          id: 'koordinasi',
          label: 'Koordinasi Lintas Sektor',
          sublabel: 'SIAP KOORDINASI',
          icon: Handshake,
          visible: (u) =>
            hasPerm(u, 'koordinasi.manage') ||
            hasPerm(u, 'pengaduan.view_all') ||
            hasPerm(u, 'pengaduan.view_assigned'),
        },
        {
          id: 'pendampingan',
          label: 'Pendampingan',
          sublabel: 'SIAP DAMPING',
          icon: HeartHandshake,
          visible: (u) =>
            hasPerm(u, 'pendampingan.manage') ||
            hasPerm(u, 'pengaduan.view_all') ||
            hasPerm(u, 'pengaduan.view_assigned'),
        },
        {
          id: 'rujukan',
          label: 'Rujukan',
          sublabel: 'SIAP RUJUK',
          icon: Send,
          visible: (u) =>
            hasPerm(u, 'rujukan.manage') ||
            hasPerm(u, 'pengaduan.view_all') ||
            hasPerm(u, 'pengaduan.view_assigned'),
        },
      ],
    },
    {
      title: 'Pemantauan & Pelaporan',
      items: [
        {
          id: 'monitoring',
          label: 'Monitoring Kasus',
          sublabel: 'SIAP MONITOR',
          icon: Activity,
          visible: (u) => hasPerm(u, 'monitoring.view') || hasPerm(u, 'dashboard.view'),
        },
        {
          id: 'laporan',
          label: 'Laporan Pelayanan',
          icon: BarChart3,
          visible: (u) => hasPerm(u, 'laporan.view') || hasPerm(u, 'pengaduan.view_all'),
        },
      ],
    },
    {
      title: 'Tata Kelola & Mitra',
      items: [
        {
          id: 'mitra',
          label: 'Direktori Mitra',
          icon: Building2,
          visible: () => true,
        },
        {
          id: 'pengguna',
          label: 'Manajemen Pengguna',
          icon: Users,
          visible: (u) => hasPerm(u, 'users.manage'),
        },
        {
          id: 'pengaturan',
          label: 'Pengaturan & Audit',
          icon: Settings,
          visible: (u) => hasPerm(u, 'audit.view') || hasPerm(u, 'users.manage'),
        },
      ],
    },
  ];

  const handleSelectPage = (page: PageRoute) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-navy-900 text-slate-100">
      <div className="px-5 py-5 border-b border-navy-800 flex items-center justify-between">
        <BrandMark inverted compact />
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800"
          aria-label="Tutup menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Navigasi utama">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.visible(user));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.title}>
              <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 tracking-wide">
                {group.title}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    activePage === item.id ||
                    (item.id === 'pengaduan' && activePage === 'pengaduan-detail');
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectPage(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-teal-600 text-white font-semibold'
                          : 'text-slate-300 hover:bg-navy-800 hover:text-white font-medium'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate leading-tight">{item.label}</div>
                        {item.sublabel && (
                          <div
                            className={`text-[10px] leading-tight mt-0.5 ${
                              isActive ? 'text-teal-100' : 'text-slate-400'
                            }`}
                          >
                            {item.sublabel}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-navy-800 space-y-3">
        <div className="px-2">
          <div className="text-xs font-semibold text-white truncate">{user.nama}</div>
          <div className="text-[11px] text-teal-300 truncate mt-0.5">{user.roleNama}</div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-navy-700 bg-navy-800/70 hover:bg-navy-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Sesi</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 sticky top-0 h-screen no-print">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">{SidebarContent}</aside>
        </div>
      )}

      {/* Main workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Buka navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">SIGAP PPA</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-semibold text-navy-900 truncate">{breadcrumb}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {hasPerm(user, 'pengaduan.create') && activePage !== 'pengaduan-baru' ? (
              <button
                type="button"
                onClick={() => onNavigate('pengaduan-baru')}
                className="px-4 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>Catat Pengaduan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('pengaduan')}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Register Kasus</span>
              </button>
            )}
          </div>
        </header>

        {/* Prototype & Privacy Notice Bar */}
        <div className="bg-amber-50/80 border-b border-amber-200 px-4 sm:px-6 lg:px-8 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Lingkungan Prototipe Simulasi:</strong> Menggunakan data contoh (dummy). Belum siap untuk menyimpan data korban sungguhan.
            </span>
          </div>
          <span className="text-amber-800 font-medium">
            Peran aktif: {user.roleNama}
          </span>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 no-print">
          <span>
            SIGAP PPA SIDOARJO — Sistem Gerak Cepat dan Terintegrasi Pelayanan Perlindungan Perempuan dan Anak
          </span>
          <span>UPTD PPA Kabupaten Sidoarjo · Satu Laporan, Satu Koordinasi, Pelayanan Terpadu, Korban Terlindungi.</span>
        </footer>
      </div>
    </div>
  );
};

import { useEffect, useState } from 'react';
import { AppShell, PageRoute } from './components/AppShell.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { api } from './lib/api.ts';
import { AsesmenPage } from './pages/AsesmenPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { DetailPengaduanPage } from './pages/DetailPengaduanPage.tsx';
import { KoordinasiPage } from './pages/KoordinasiPage.tsx';
import { LaporanPage } from './pages/LaporanPage.tsx';
import { MitraPage } from './pages/MitraPage.tsx';
import { MonitoringPage } from './pages/MonitoringPage.tsx';
import { PendampinganPage } from './pages/PendampinganPage.tsx';
import { PengaduanListPage } from './pages/PengaduanListPage.tsx';
import { PengaturanAuditPage } from './pages/PengaturanAuditPage.tsx';
import { PenggunaPage } from './pages/PenggunaPage.tsx';
import { PenugasanPage } from './pages/PenugasanPage.tsx';
import { RujukanPage } from './pages/RujukanPage.tsx';
import { TambahPengaduanPage } from './pages/TambahPengaduanPage.tsx';
import { SessionUser } from './types/sigap.ts';

const PAGE_TITLES: Record<PageRoute, string> = {
  dashboard: 'Dashboard Pelayanan',
  pengaduan: 'Data Pengaduan (SIAP LAPOR)',
  'pengaduan-baru': 'Tambah Pengaduan (SIAP LAPOR)',
  'pengaduan-detail': 'Detail Penanganan Kasus',
  asesmen: 'Asesmen Korban (SIAP ASESMEN)',
  penugasan: 'Penugasan Petugas',
  koordinasi: 'Koordinasi Lintas Sektor (SIAP KOORDINASI)',
  pendampingan: 'Pendampingan Korban (SIAP DAMPING)',
  rujukan: 'Rujukan Layanan (SIAP RUJUK)',
  monitoring: 'Monitoring Kasus (SIAP MONITOR)',
  laporan: 'Laporan Pelayanan Agregat',
  mitra: 'Direktori Mitra Layanan',
  pengguna: 'Manajemen Pengguna',
  pengaturan: 'Pengaturan Hak Akses & Audit',
};

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activePage, setActivePage] = useState<PageRoute>('dashboard');
  const [selectedPengaduanId, setSelectedPengaduanId] = useState<string>('PGD-001');

  const refreshSession = async () => {
    try {
      const res = await api.me();
      setUser(res.user);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshSession().finally(() => setCheckingSession(false));
  }, []);

  const handleLoginSuccess = (loggedInUser: SessionUser) => {
    setUser(loggedInUser);
    setActivePage('dashboard');
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setActivePage('dashboard');
  };

  const handleOpenCase = (pengaduanId: string) => {
    setSelectedPengaduanId(pengaduanId);
    setActivePage('pengaduan-detail');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm text-slate-600 font-medium">Memuat sesi SIGAP PPA SIDOARJO...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AppShell
      user={user}
      activePage={activePage}
      breadcrumb={PAGE_TITLES[activePage]}
      onNavigate={setActivePage}
      onLogout={handleLogout}
    >
      {activePage === 'dashboard' && (
        <DashboardPage user={user} onNavigate={setActivePage} onOpenCase={handleOpenCase} />
      )}
      {activePage === 'pengaduan' && (
        <PengaduanListPage user={user} onNavigate={setActivePage} onOpenCase={handleOpenCase} />
      )}
      {activePage === 'pengaduan-baru' && (
        <TambahPengaduanPage
          user={user}
          onNavigate={setActivePage}
          onCreated={(id) => handleOpenCase(id)}
        />
      )}
      {activePage === 'pengaduan-detail' && (
        <DetailPengaduanPage
          user={user}
          pengaduanId={selectedPengaduanId}
          onNavigate={setActivePage}
        />
      )}
      {activePage === 'asesmen' && <AsesmenPage user={user} onOpenCase={handleOpenCase} />}
      {activePage === 'penugasan' && <PenugasanPage user={user} onOpenCase={handleOpenCase} />}
      {activePage === 'koordinasi' && <KoordinasiPage user={user} onOpenCase={handleOpenCase} />}
      {activePage === 'pendampingan' && <PendampinganPage user={user} onOpenCase={handleOpenCase} />}
      {activePage === 'rujukan' && <RujukanPage user={user} onOpenCase={handleOpenCase} />}
      {activePage === 'monitoring' && <MonitoringPage onOpenCase={handleOpenCase} />}
      {activePage === 'laporan' && <LaporanPage />}
      {activePage === 'mitra' && <MitraPage user={user} />}
      {activePage === 'pengguna' && <PenggunaPage user={user} />}
      {activePage === 'pengaturan' && (
        <PengaturanAuditPage user={user} onRefreshSession={refreshSession} />
      )}
    </AppShell>
  );
}

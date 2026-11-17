import React, { useEffect, useState } from 'react';
import { Lock, Mail, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import { api, DemoAccountInfo } from '../lib/api.ts';
import { SessionUser } from '../types/sigap.ts';
import { BrandMark } from './BrandMark.tsx';

interface LoginPageProps {
  onLoginSuccess: (user: SessionUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('pengaduan.demo@sigap-ppa.sidoarjo.test');
  const [password, setPassword] = useState('DemoSigap2026!');
  const [demoAccounts, setDemoAccounts] = useState<DemoAccountInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDemoAccounts()
      .then((res) => setDemoAccounts(res.accounts))
      .catch(() => {
        /* ignore initial demo list error */
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await api.login(email, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (account: DemoAccountInfo) => {
    setEmail(account.email);
    setPassword('DemoSigap2026!');
    setError(null);
    setLoading(true);
    try {
      const user = await api.login(account.email, 'DemoSigap2026!');
      onLoginSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk dengan akun demo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left institutional panel */}
      <div className="lg:w-5/12 bg-navy-900 text-white p-8 lg:p-12 flex flex-col justify-between">
        <div>
          <BrandMark inverted />
          <div className="mt-12 max-w-md space-y-5">
            <p className="text-xs font-medium tracking-wide text-teal-300">
              Portal Layanan Internal · Kabupaten Sidoarjo
            </p>
            <h1 className="text-2xl lg:text-3xl font-bold leading-snug text-balance">
              Sistem Gerak Cepat dan Terintegrasi Pelayanan Perlindungan Perempuan dan Anak
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              “Satu Laporan, Satu Koordinasi, Pelayanan Terpadu, Korban Terlindungi.”
            </p>
          </div>

          <div className="mt-10 border-t border-navy-800 pt-6 space-y-3 text-xs text-slate-300 max-w-md">
            <div className="flex items-start gap-2.5">
              <UserCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <p>
                Akses berbasis peran (RBAC) dan penugasan kasus untuk menjaga kerahasiaan identitas korban serta catatan asesmen terbatas.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <p>
                <strong className="text-white font-medium">Lingkungan Prototipe Demo:</strong> Sistem ini menggunakan data simulasi dan belum terhubung ke server produksi pemerintah. Jangan memasukkan data korban sungguhan.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-navy-800 text-xs text-slate-400">
          UPTD Perlindungan Perempuan dan Anak Kabupaten Sidoarjo · Versi Prototipe 1.1
        </div>
      </div>

      {/* Right login & demo selector */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-xl space-y-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-navy-900">Masuk ke SIGAP PPA</h2>
            <p className="text-sm text-slate-600 mt-1">
              Gunakan akun petugas atau pilih salah satu peran simulasi di bawah untuk menguji alur hak akses.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Kedinasan / Demo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    placeholder="nama.petugas@sigap-ppa.sidoarjo.test"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Kata sandi standar lingkungan demo: <span className="font-mono text-slate-700">DemoSigap2026!</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? 'Memverifikasi sesi...' : 'Masuk ke Sistem'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* 4 Demo Roles Quick Switcher */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Akses Cepat Peran Simulasi (Demo RBAC)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik peran untuk masuk langsung dan melihat pembatasan akses sesuai kewenangan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demoAccounts
                .filter(
                  (acc, idx, arr) => arr.findIndex((other) => other.role === acc.role) === idx
                )
                .slice(0, 4)
                .map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemoLogin(acc)}
                    className="text-left p-3.5 rounded-lg border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 transition-colors cursor-pointer group"
                  >
                    <div className="text-xs font-semibold text-teal-800 group-hover:text-teal-900">
                      {acc.roleNama}
                    </div>
                    <div className="text-sm font-medium text-slate-900 mt-0.5 truncate">{acc.nama}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">{acc.deskripsi}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

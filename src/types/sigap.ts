export enum UserRoleCode {
  ADMIN = 'ADMIN',
  PENERIMA_PENGADUAN = 'PENERIMA_PENGADUAN',
  ASESMEN_PENDAMPING = 'ASESMEN_PENDAMPING',
  KOORDINATOR = 'KOORDINATOR',
}

export enum StatusPengaduan {
  BARU_DITERIMA = 'Baru diterima',
  DALAM_VERIFIKASI = 'Dalam verifikasi',
  DALAM_ASESMEN = 'Dalam asesmen',
  DALAM_PENANGANAN = 'Dalam penanganan',
  SELESAI_ADMINISTRATIF = 'Selesai secara administratif',
}

export enum KanalPengaduan {
  DATANG_LANGSUNG = 'Datang Langsung',
  HOTLINE = 'Hotline / Telepon',
  WHATSAPP_RESMI = 'WhatsApp Resmi UPTD',
  RUJUKAN_MITRA = 'Rujukan Mitra / Kepolisian',
  SURAT_EMAIL = 'Surat / Email Kedinasan',
}

export enum KategoriKasus {
  KDRT = 'Kekerasan Dalam Rumah Tangga (KDRT)',
  KEKERASAN_ANAK = 'Kekerasan Terhadap Anak',
  KEKERASAN_SEKSUAL = 'Kekerasan Seksual',
  PENELANTARAN = 'Penelantaran & Eksploitasi',
  TPPO = 'Tindak Pidana Perdagangan Orang (TPPO)',
  PERUNDUNGAN = 'Perundungan / Kekerasan di Satuan Pendidikan',
  LAINNYA = 'Lainnya sesuai kewenangan UPTD',
}

export enum StatusRujukan {
  BELUM_DIKIRIM = 'Belum dikirim',
  SUDAH_DIKIRIM = 'Sudah dikirim',
  DALAM_PROSES = 'Dalam proses',
  SUDAH_DITINDAKLANJUTI = 'Sudah ditindaklanjuti',
  SELESAI = 'Selesai',
}

export enum JenisLayananPendampingan {
  PSIKOLOGIS = 'Pendampingan Psikologis',
  HUKUM = 'Pendampingan Hukum',
  SOSIAL = 'Pendampingan Sosial',
  KESEHATAN = 'Pendampingan Kesehatan / Medis',
  LAINNYA = 'Layanan Lain Sesuai Kewenangan UPTD',
}

export enum StatusPendampingan {
  TERJADWAL = 'Terjadwal',
  BERJALAN = 'Sedang berjalan',
  SELESAI = 'Selesai',
  PERLU_LANJUTAN = 'Membutuhkan sesi lanjutan',
}

export enum StatusTindakLanjut {
  MENUNGGU = 'Menunggu tindak lanjut',
  DALAM_PROSES = 'Dalam proses',
  SELESAI = 'Selesai ditindaklanjuti',
}

export enum PrioritasKasus {
  DARURAT = 'Prioritas Segera',
  TINGGI = 'Tinggi',
  STANDAR = 'Standar',
}

export type PermissionKey =
  | 'dashboard.view'
  | 'pengaduan.view_all'
  | 'pengaduan.view_assigned'
  | 'pengaduan.create'
  | 'pengaduan.update_status'
  | 'korban.view_identitas_penuh'
  | 'asesmen.manage'
  | 'asesmen.view_catatan_terbatas'
  | 'penugasan.manage'
  | 'koordinasi.manage'
  | 'pendampingan.manage'
  | 'rujukan.manage'
  | 'monitoring.view'
  | 'laporan.view'
  | 'mitra.manage'
  | 'users.manage'
  | 'audit.view'
  | 'backup.manage';

export interface RoleDefinition {
  code: UserRoleCode;
  nama: string;
  deskripsi: string;
  permissions: PermissionKey[];
}

export interface UserAccount {
  id: string;
  email: string;
  nama: string;
  role: UserRoleCode;
  petugasId: string;
  aktif: boolean;
  dibuatPada: string;
  terakhirLogin?: string;
}

export interface PetugasProfile {
  id: string;
  nipSimulasi: string;
  nama: string;
  jabatan: string;
  bidang: string;
  role: UserRoleCode;
  teleponKedinasan: string;
  aktif: boolean;
}

export interface KorbanRecord {
  id: string;
  pengaduanId: string;
  kodeAnonim: string;
  inisial: string;
  namaLengkap: string;
  nikSamaran: string;
  kelompokUsia: 'Anak (< 18 tahun)' | 'Dewasa (≥ 18 tahun)';
  usia: number;
  jenisKelamin: 'Perempuan' | 'Laki-laki';
  kecamatanDomisili: string;
  alamatRingkas: string;
  kontakAman: string;
  hubunganPelapor: string;
  isMasked?: boolean;
}

export interface PengaduanRecord {
  id: string;
  nomorRegistrasi: string;
  tanggalPenerimaan: string;
  waktuPenerimaan: string;
  kanal: KanalPengaduan;
  kategori: KategoriKasus;
  prioritas: PrioritasKasus;
  kecamatanKejadian: string;
  namaPelapor: string;
  statusPelapor: string;
  kontakPelapor: string;
  ringkasanPengaduan: string;
  petugasPenerimaId: string;
  petugasPenerimaNama: string;
  status: StatusPengaduan;
  korbanId: string;
  butuhTindakLanjut: boolean;
  diperbaruiPada: string;
}

export interface AsesmenRecord {
  id: string;
  pengaduanId: string;
  nomorRegistrasi: string;
  tanggalAsesmen: string;
  petugasAsesmenId: string;
  petugasAsesmenNama: string;
  kebutuhanKorban: string;
  kebutuhanPerlindungan: string;
  butuhLayananPsikologis: boolean;
  rincianPsikologis: string;
  butuhLayananHukum: boolean;
  rincianHukum: string;
  butuhLayananKesehatan: boolean;
  rincianKesehatan: string;
  rencanaTindakLanjut: string;
  catatanTerbatas: string;
  aksesTerbatasMasked?: boolean;
  dibuatPada: string;
}

export interface PenugasanRecord {
  id: string;
  pengaduanId: string;
  nomorRegistrasi: string;
  petugasId: string;
  petugasNama: string;
  peranTugas: 'Petugas Asesmen' | 'Petugas Pendamping' | 'Penanggung Jawab Kasus';
  tanggalPenugasan: string;
  targetTindakLanjut: string;
  catatanPenugasan: string;
  ditugaskanOleh: string;
  statusTugas: 'Aktif' | 'Selesai' | 'Dialihkan';
}

export interface KoordinasiRecord {
  id: string;
  pengaduanId: string;
  nomorRegistrasi: string;
  mitraId: string;
  instansiDikoordinasikan: string;
  jenisKebutuhan: string;
  tanggalKoordinasi: string;
  petugasPenanggungJawabId: string;
  petugasPenanggungJawabNama: string;
  hasilKoordinasi: string;
  statusTindakLanjut: StatusTindakLanjut;
}

export interface PendampinganRecord {
  id: string;
  pengaduanId: string;
  nomorRegistrasi: string;
  tanggalPendampingan: string;
  petugasPendampingId: string;
  petugasPendampingNama: string;
  jenisLayanan: JenisLayananPendampingan;
  bentukPendampingan: string;
  catatanPerkembangan: string;
  statusPendampingan: StatusPendampingan;
}

export interface RujukanRecord {
  id: string;
  pengaduanId: string;
  nomorRegistrasi: string;
  mitraId: string;
  namaLembagaTujuan: string;
  jenisLayananDibutuhkan: string;
  alasanRujukan: string;
  tanggalRujukan: string;
  petugasPengirimId: string;
  petugasPengirimNama: string;
  statusRujukan: StatusRujukan;
  konfirmasiTindakLanjut: string;
  tanggalKonfirmasi?: string;
}

export interface MitraLayananRecord {
  id: string;
  namaLembaga: string;
  kategoriSektor: 'Kepolisian' | 'Kesehatan' | 'Bantuan Hukum' | 'Sosial & Shelter' | 'Pendidikan' | 'Keagamaan / KUA' | 'Lainnya';
  jenisLayanan: string;
  kontakKedinasan: string;
  wilayahLayanan: string;
  alamatKantor: string;
  aktif: boolean;
}

export interface RiwayatAktivitasRecord {
  id: string;
  waktu: string;
  userId: string;
  userNama: string;
  userRole: UserRoleCode;
  modul: string;
  aksi: string;
  entitasId?: string;
  ringkasan: string;
}

export interface DashboardSummary {
  kpi: {
    totalPengaduan: number;
    pengaduanBulanIni: number;
    kasusDalamPenanganan: number;
    kasusMenungguAsesmen: number;
    kasusButuhTindakLanjut: number;
    rujukanSedangBerjalan: number;
    kasusSelesaiAdministratif: number;
  };
  grafikBulanan: Array<{ bulan: string; jumlah: number; selesai: number }>;
  grafikKategori: Array<{ kategori: string; jumlah: number }>;
  grafikStatus: Array<{ status: string; jumlah: number }>;
  grafikRujukan: Array<{ status: string; jumlah: number }>;
  tugasTindakLanjut: Array<{
    pengaduanId: string;
    nomorRegistrasi: string;
    kategori: string;
    status: StatusPengaduan;
    prioritas: PrioritasKasus;
    tanggalPenerimaan: string;
    kodeKorban: string;
    petugasDitugaskan: string;
    keterangan: string;
  }>;
  aktivitasTerbaru: RiwayatAktivitasRecord[];
  metrikPrd: {
    pencatatanPengaduanPct: number;
    asesmenAwalPct: number;
    penanggungJawabPct: number;
    tindakLanjutRujukanPct: number;
    monitoringAktifPct: number;
    mitraAktifCount: number;
  };
}

export interface SessionUser {
  id: string;
  email: string;
  nama: string;
  role: UserRoleCode;
  roleNama: string;
  petugasId: string;
  jabatan: string;
  permissions: PermissionKey[];
}

export interface PengaduanListItem {
  pengaduan: PengaduanRecord;
  korbanRingkas: {
    kodeAnonim: string;
    inisial: string;
    kelompokUsia: string;
    kecamatanDomisili: string;
    namaTampil: string;
  };
  assignedPetugasIds: string[];
  assignedPetugasNames: string[];
  hasAsesmen: boolean;
  jumlahKoordinasi: number;
  jumlahPendampingan: number;
  jumlahRujukan: number;
}

export interface PengaduanDetailResponse {
  pengaduan: PengaduanRecord;
  korban: KorbanRecord;
  asesmen: AsesmenRecord[];
  penugasan: PenugasanRecord[];
  koordinasi: KoordinasiRecord[];
  pendampingan: PendampinganRecord[];
  rujukan: RujukanRecord[];
  aktivitasKasus: RiwayatAktivitasRecord[];
  canAccessFullVictimIdentity: boolean;
  canAccessRestrictedNotes: boolean;
  canEditCase: boolean;
}

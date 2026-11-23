// src/data/labPresets.ts
// Daftar laboratorium Informatika beserta titik koordinatnya.
// Dipakai form "Tambah laboratorium": asisten cukup memilih lab,
// lalu nama, gedung, koordinat, dan radius terisi otomatis.
//
// Cara mengisi koordinat yang masih null:
// buka link Google Maps lab di browser laptop, lalu lihat URL-nya.
// Koordinat ada setelah tanda "@" (contoh: @-7.0482269,110.4408514,19z)
// atau setelah "q=". Angka pertama latitude, angka kedua longitude.

export type LabPreset = {
  nama: string;
  gedung: string;
  deskripsi: string;
  latitude: number | null;
  longitude: number | null;
  radius: number; // meter
  sumber: string; // link Google Maps asal, untuk dicek ulang
};

export const LAB_PRESETS: LabPreset[] = [
  {
    nama: 'Lab B',
    gedung: 'Departemen Informatika',
    deskripsi: '',
    latitude: -7.048303,
    longitude: 110.440741,
    radius: 50,
    sumber: 'https://maps.app.goo.gl/a7kCAPM5dRfR1eRJA',
  },
  {
    nama: 'Lab C',
    gedung: 'Departemen Informatika',
    deskripsi: '',
    latitude: -7.0482269,
    longitude: 110.4408514,
    radius: 50,
    sumber: 'https://maps.google.com?q=-7.0482269,110.4408514',
  },
  {
    nama: 'Lab D',
    gedung: 'Departemen Informatika',
    deskripsi: '',
    latitude: -7.048025,
    longitude: 110.440944,
    radius: 50,
    sumber: 'https://maps.app.goo.gl/opFtUUbnmy67WxoCA',
  },
  {
    nama: 'Lab AP',
    gedung: 'Departemen Informatika',
    deskripsi: '',
    latitude: -7.049046,
    longitude: 110.441702,
    radius: 50,
    sumber: 'https://maps.app.goo.gl/rttt1bzMpT7GVExC6',
  },
];
import {
    createUserWithEmailAndPassword,
    deleteUser,
    signInWithEmailAndPassword,
    signOut,
} from '@react-native-firebase/auth';
import { doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { auth, db } from '../config/firebase';
import { COLLECTIONS, Role, User } from '../types';

export type RegisterInput = {
  nama: string;
  nim: string;
  email: string;
  password: string;
  role: Role | null;
};

// Mengembalikan pesan kesalahan, atau null kalau semua input valid.
export function validateRegister(input: RegisterInput): string | null {
  if (!input.nama.trim()) return 'Nama wajib diisi.';
  if (!/^\d{5,}$/.test(input.nim.trim())) return 'NIM hanya boleh berisi angka (minimal 5 digit).';
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) return 'Format email tidak valid.';
  if (input.password.length < 6) return 'Password minimal 6 karakter.';
  if (!input.role) return 'Pilih peran terlebih dahulu.';
  return null;
}

export function validateLogin(email: string, password: string): string | null {
  if (!email.trim() || !password) return 'Email dan password wajib diisi.';
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Format email tidak valid.';
  return null;
}

// Membuat akun di Firebase Authentication lalu menyimpan profil ke users/{uid}.
export async function registerUser(input: RegisterInput): Promise<User> {
  const email = input.email.trim();
  const credential = await createUserWithEmailAndPassword(auth, email, input.password);
  const profile = {
    nama: input.nama.trim(),
    nim: input.nim.trim(),
    email,
    role: input.role as Role,
  };
  try {
    await setDoc(doc(db, COLLECTIONS.users, credential.user.uid), profile);
  } catch (error) {
    // Profil gagal tersimpan: hapus akunnya supaya tidak ada akun tanpa profil.
    await deleteUser(credential.user).catch(() => {});
    throw error;
  }
  return { id: credential.user.uid, ...profile };
}

export async function loginUser(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.users, uid));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...(snapshot.data() as Omit<User, 'id'>) };
}

// Mengubah kode error Firebase menjadi pesan yang bisa dibaca pengguna.
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email sudah terdaftar. Silakan login.';
    case 'auth/invalid-email':
      return 'Format email tidak valid.';
    case 'auth/weak-password':
      return 'Password terlalu lemah (minimal 6 karakter).';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau password salah.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Coba lagi beberapa saat.';
    case 'auth/network-request-failed':
      return 'Tidak ada koneksi internet.';
    case 'firestore/permission-denied':
      return 'Akses ditolak oleh aturan keamanan.';
    case 'firestore/unavailable':
      return 'Server tidak dapat dihubungi. Periksa koneksi internet.';
    default:
      return 'Terjadi kesalahan. Coba lagi.';
  }
}
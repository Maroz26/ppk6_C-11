// src/screens/SessionFormScreen.tsx
// Form tambah / ubah sesi (redesign, Figma: "Detil Sesi / Add Sesi").
// Tanpa id: tambah sesi baru. Dengan ?id=...: ubah sesi, dan pembuat sesi bisa menghapusnya.
// Logika simpan, validasi, dan pilihan lab sama seperti sprint 3; yang berubah tampilannya.
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackHeader } from '../components/ui/BackHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Hills } from '../components/ui/Hills';
import { useApp } from '../context/AppContext';
import { useLabs } from '../hooks/useLabs';
import { findLabForSession } from '../services/labService';
import {
  createSession,
  deleteSession,
  listenPraktikanList,
  scheduleErrorMessage,
  SessionInput,
  updateSession,
  validateSession,
} from '../services/scheduleService';
import { color, font, radius } from '../theme/tokens';
import { Lab, User } from '../types';
import { calendarWeeks, isSameDay, namaBulanTahun, toIsoDate } from '../utils/dateId';
import { formatTanggal } from '../utils/formatTime';

// Ubah daftar ini sesuai praktikum di kampusmu. Pilihan lain bisa diketik sendiri.
const PRAKTIKUM_OPTIONS = ['Pemrograman Web', 'Basis Data'];
const KELAS_OPTIONS = ['A', 'B', 'C', 'D'];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// Hiasan bukit/awan dimulai di y 75 pada frame Figma 402.
const FIGMA_WIDTH = 402;
const DECOR_TOP = 75;

type Picker = 'praktikum' | 'kelas' | 'ruang' | 'tanggal' | 'mulai' | 'selesai' | null;

function parseDate(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

// ===== Komponen kecil =====

// Kolom berbentuk pil yang dibuka dengan ketukan (dropdown, kalender, jam).
function PillSelect({ label, value, placeholder, icon, onPress, compact }: {
  label: string; // untuk pembaca layar
  value: string;
  placeholder: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || 'belum diisi'}`}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, compact && styles.pillCompact, pressed && styles.pressed]}
    >
      <Text style={[styles.pillText, !value && styles.placeholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      {icon && <Feather name={icon} size={18} color={color.purpleInk} />}
    </Pressable>
  );
}

// Baris "Label  [kolom]" seperti di Figma.
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.flex}>{children}</View>
    </View>
  );
}

// Lembar pilihan yang muncul dari bawah layar.
function Sheet({ visible, title, onClose, children }: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Tutup" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={onClose} style={styles.roundButton}>
              <Feather name="x" size={18} color={color.purpleInk} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function OptionSheet({ visible, title, options, value, onSelect, onClose }: {
  visible: boolean;
  title: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState('');

  function choose(option: string) {
    onSelect(option);
    setCustom('');
    onClose();
  }

  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
        {options.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: option === value }}
            onPress={() => choose(option)}
            style={({ pressed }) => [styles.sheetOption, pressed && styles.pressed]}
          >
            <Text style={styles.optionName}>{option}</Text>
            {option === value && <Feather name="check" size={18} color={color.plum} />}
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.sheetLabel}>Lainnya</Text>
      <View style={styles.inlineRow}>
        <TextInput
          accessibilityLabel="Ketik pilihan lain"
          placeholder="Ketik sendiri"
          placeholderTextColor={color.placeholder}
          selectionColor={color.purpleDeep}
          style={[styles.textInput, styles.flex]}
          value={custom}
          onChangeText={setCustom}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => custom.trim() && choose(custom.trim())}
          style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
        >
          <Text style={styles.smallButtonText}>Pakai</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

// Pilihan ruang dari koleksi labs. Tidak ada isian bebas supaya setiap sesi
// punya titik koordinat dan radius untuk validasi presensi.
function LabSheet({ visible, labs, loading, error, value, onSelect, onClose }: {
  visible: boolean;
  labs: Lab[];
  loading: boolean;
  error: string;
  value: string | null;
  onSelect: (lab: Lab) => void;
  onClose: () => void;
}) {
  function openLabManager() {
    onClose();
    router.push('/asisten/lab');
  }

  return (
    <Sheet visible={visible} title="Pilih ruangan" onClose={onClose}>
      {loading ? (
        <Text style={styles.helper}>Memuat daftar laboratorium...</Text>
      ) : error ? (
        <Text style={styles.error} accessibilityRole="alert">{error}</Text>
      ) : labs.length === 0 ? (
        <Text style={styles.helper}>Belum ada laboratorium. Tambahkan lokasi laboratorium terlebih dahulu.</Text>
      ) : (
        <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
          {labs.map((lab) => (
            <Pressable
              key={lab.id}
              accessibilityRole="button"
              accessibilityState={{ selected: lab.id === value }}
              onPress={() => {
                onSelect(lab);
                onClose();
              }}
              style={({ pressed }) => [styles.sheetOption, pressed && styles.pressed]}
            >
              <View style={styles.flex}>
                <Text style={styles.optionName}>{lab.nama}</Text>
                <Text style={styles.optionSub}>{lab.gedung} · radius {lab.radius} m</Text>
              </View>
              {lab.id === value && <Feather name="check" size={18} color={color.plum} />}
            </Pressable>
          ))}
        </ScrollView>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={openLabManager}
        style={({ pressed }) => [styles.sheetSecondary, pressed && styles.pressed]}
      >
        <Text style={styles.sheetSecondaryText}>Kelola laboratorium</Text>
      </Pressable>
    </Sheet>
  );
}

function CalendarSheet({ visible, value, onSelect, onClose }: {
  visible: boolean;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(() => parseDate(value));

  // Setiap dibuka, kalender menampilkan bulan dari tanggal yang sedang dipilih.
  useEffect(() => {
    if (visible) setMonth(parseDate(value));
  }, [visible, value]);

  const today = new Date();
  const selected = value ? parseDate(value) : null;

  return (
    <Sheet visible={visible} title="Pilih tanggal" onClose={onClose}>
      <View style={styles.calendarHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bulan sebelumnya"
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          style={styles.roundButton}
        >
          <Feather name="chevron-left" size={18} color={color.purpleInk} />
        </Pressable>
        <Text style={styles.calendarTitle}>{namaBulanTahun(month)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bulan berikutnya"
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          style={styles.roundButton}
        >
          <Feather name="chevron-right" size={18} color={color.purpleInk} />
        </Pressable>
      </View>
      <View style={styles.calendarRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.calendarWeekday}>{d}</Text>
        ))}
      </View>
      {calendarWeeks(month).map((week) => (
        <View key={week[0].toISOString()} style={styles.calendarRow}>
          {week.map((date) => {
            const inMonth = date.getMonth() === month.getMonth();
            const isSelected = !!selected && isSameDay(date, selected);
            const isToday = isSameDay(date, today);
            const iso = toIsoDate(date);
            return (
              <View key={iso} style={styles.calendarCell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={formatTanggal(iso)}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onSelect(iso);
                    onClose();
                  }}
                  style={[
                    styles.calendarDay,
                    isToday && styles.calendarToday,
                    isSelected && styles.calendarSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      !inMonth && styles.calendarOther,
                      isSelected && styles.calendarSelectedText,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </Sheet>
  );
}

function TimeSheet({ visible, title, value, onSelect, onClose }: {
  visible: boolean;
  title: string;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');

  useEffect(() => {
    if (!visible) return;
    const [h, m] = (value || '08:00').split(':');
    setHour(h || '08');
    setMinute(m || '00');
  }, [visible, value]);

  const column = (items: string[], current: string, onPick: (item: string) => void, label: string) => (
    <View style={styles.flex}>
      <Text style={styles.timeColumnLabel}>{label}</Text>
      <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const selected = item === current;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label} ${item}`}
              onPress={() => onPick(item)}
              style={[styles.timeItem, selected && styles.timeItemSelected]}
            >
              <Text style={[styles.timeItemText, selected && styles.timeItemTextSelected]}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.inlineRow}>
        {column(HOURS, hour, setHour, 'Jam')}
        {column(MINUTES, minute, setMinute, 'Menit')}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onSelect(`${hour}:${minute}`);
          onClose();
        }}
        style={({ pressed }) => [styles.primaryButton, styles.sheetPrimary, pressed && styles.pressed]}
      >
        <Text style={styles.primaryText}>Pilih {hour}:{minute}</Text>
      </Pressable>
    </Sheet>
  );
}

// ===== Halaman =====

export default function SessionFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { sessions, currentUser, role } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const k = width / FIGMA_WIDTH;
  const isEdit = !!id;
  const editing = isEdit ? sessions.find((s) => s.id === id) : undefined;
  const isOwner = !!editing && editing.dibuatOleh === currentUser?.id;

  const [praktikum, setPraktikum] = useState('');
  const [kelas, setKelas] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jamMulai, setJamMulai] = useState('');
  const [jamSelesai, setJamSelesai] = useState('');
  const [ruang, setRuang] = useState('');
  const [labId, setLabId] = useState<string | null>(null);
  const { labs, loading: labsLoading, error: labsError } = useLabs();
  const [pertemuan, setPertemuan] = useState(1);
  const [materi, setMateri] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const [picker, setPicker] = useState<Picker>(null);
  const [praktikanList, setPraktikanList] = useState<User[]>([]);
  const [listMessage, setListMessage] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleted = useRef(false);

  // Saat mengubah sesi, isi form sekali dengan data yang tersimpan.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!editing || prefilled.current) return;
    prefilled.current = true;
    setPraktikum(editing.praktikum);
    setKelas(editing.kelas);
    setTanggal(editing.tanggal);
    setJamMulai(editing.jamMulai);
    setJamSelesai(editing.jamSelesai);
    setRuang(editing.ruang);
    setLabId(editing.labId ?? null);
    setPertemuan(editing.pertemuan);
    setMateri(editing.materi);
    setSelected(editing.enrolledStudents ?? []);
  }, [editing]);

  // Sesi lama (sprint 2) belum punya labId: cocokkan otomatis lewat nama ruang.
  useEffect(() => {
    if (labId || !ruang) return;
    const match = findLabForSession({ labId: null, ruang }, labs);
    if (match) setLabId(match.id);
  }, [labs, labId, ruang]);

  const selectedLab = labId ? labs.find((lab) => lab.id === labId) : undefined;

  function chooseLab(lab: Lab) {
    setLabId(lab.id);
    setRuang(lab.nama);
  }

  // Daftar praktikan realtime dari koleksi users.
  useEffect(() => {
    return listenPraktikanList(
      (users) => {
        setPraktikanList(users);
        setListMessage('');
      },
      (error) => setListMessage(scheduleErrorMessage(error)),
    );
  }, []);

  function toggle(uid: string) {
    setSelected((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
  }

  async function submit() {
    const input: SessionInput = {
      praktikum,
      kelas,
      tanggal,
      jamMulai,
      jamSelesai,
      ruang,
      pertemuan,
      materi,
      enrolledStudents: selected,
      labId: selectedLab ? selectedLab.id : null,
    };
    const invalid = validateSession(input);
    if (invalid) {
      setMessage(invalid);
      return;
    }
    if (!currentUser) {
      setMessage('Sesi login berakhir. Silakan login ulang.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      if (isEdit && id) await updateSession(id, input);
      else await createSession(input, currentUser.id);
      router.back();
    } catch (error) {
      setMessage(scheduleErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function removeSession() {
    if (!id) return;
    setDeleting(true);
    setDeleteError('');
    try {
      deleted.current = true;
      await deleteSession(id);
      setConfirmDelete(false);
      router.back();
    } catch (error) {
      deleted.current = false;
      setDeleteError(scheduleErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  const keyword = search.trim().toLowerCase();
  const filtered = praktikanList.filter(
    (u) => u.nama.toLowerCase().includes(keyword) || u.nim.includes(keyword),
  );
  const kelasOptions = kelas && !KELAS_OPTIONS.includes(kelas) ? [...KELAS_OPTIONS, kelas] : KELAS_OPTIONS;
  const praktikumOptions = praktikum && !PRAKTIKUM_OPTIONS.includes(praktikum)
    ? [...PRAKTIKUM_OPTIONS, praktikum]
    : PRAKTIKUM_OPTIONS;

  const notAllowed = role !== 'ASISTEN';
  const notFound = isEdit && !editing && !deleted.current;
  const title = isEdit ? 'Ubah Sesi' : 'Tambah Sesi';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Latar: lavender di atas, bukit ungu dan awan putih di belakang kolom pertama. */}
          <View style={[styles.lavenderTop, { height: (DECOR_TOP + 140) * k }]} pointerEvents="none" />
          <View style={[styles.decor, { top: DECOR_TOP * k }]} pointerEvents="none">
            <Hills preset="awan" />
          </View>

          <View style={styles.header}>
            <BackHeader title={title} variant="onLavender" />
          </View>

          {notAllowed || notFound ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>
                {notAllowed ? 'Hanya asisten yang dapat mengelola sesi' : 'Sesi tidak ditemukan'}
              </Text>
              <Text style={styles.noticeText}>
                {notAllowed ? 'Masuk dengan akun asisten untuk menambah atau mengubah sesi.' : 'Sesi ini mungkin sudah dihapus.'}
              </Text>
            </View>
          ) : (
            <View style={styles.form}>
              <PillSelect
                label="Nama praktikum"
                value={praktikum}
                placeholder="Nama Praktikum"
                icon="chevron-down"
                onPress={() => setPicker('praktikum')}
              />
              <PillSelect
                label="Kelas"
                value={kelas ? `Kelas ${kelas}` : ''}
                placeholder="Kelas"
                icon="chevron-down"
                onPress={() => setPicker('kelas')}
              />

              <View style={styles.rows}>
                <Row label="Tanggal">
                  <PillSelect
                    compact
                    label="Tanggal"
                    value={tanggal ? formatTanggal(tanggal) : ''}
                    placeholder="Pilih tanggal"
                    icon="calendar"
                    onPress={() => setPicker('tanggal')}
                  />
                </Row>

                <Row label="Jam">
                  <View style={styles.inlineRow}>
                    <View style={styles.flex}>
                      <PillSelect compact label="Jam mulai" value={jamMulai} placeholder="Mulai" onPress={() => setPicker('mulai')} />
                    </View>
                    <Text style={styles.dash}>-</Text>
                    <View style={styles.flex}>
                      <PillSelect compact label="Jam selesai" value={jamSelesai} placeholder="Selesai" onPress={() => setPicker('selesai')} />
                    </View>
                  </View>
                </Row>

                <Row label="Ruangan">
                  <PillSelect
                    compact
                    label="Ruangan"
                    value={selectedLab ? selectedLab.nama : ruang}
                    placeholder="Pilih lab"
                    icon="chevron-down"
                    onPress={() => setPicker('ruang')}
                  />
                </Row>
                {selectedLab ? (
                  <Text style={styles.hint}>{selectedLab.gedung} · radius presensi {selectedLab.radius} m</Text>
                ) : !!ruang && !labsLoading ? (
                  <Text style={[styles.hint, styles.hintError]}>
                    Ruang &quot;{ruang}&quot; belum terdaftar sebagai laboratorium. Pilih ulang dari daftar.
                  </Text>
                ) : null}

                <Row label="Pertemuan">
                  <View style={[styles.pill, styles.pillCompact, styles.stepper]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Kurangi pertemuan"
                      onPress={() => setPertemuan((value) => Math.max(1, value - 1))}
                      hitSlop={8}
                      style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
                    >
                      <Feather name="minus" size={16} color={color.purpleInk} />
                    </Pressable>
                    <Text style={styles.stepValue} accessibilityLabel={`Pertemuan ke ${pertemuan}`}>{pertemuan}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Tambah pertemuan"
                      onPress={() => setPertemuan((value) => value + 1)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
                    >
                      <Feather name="plus" size={16} color={color.purpleInk} />
                    </Pressable>
                  </View>
                </Row>

                <Row label="Materi">
                  <TextInput
                    accessibilityLabel="Materi"
                    placeholder="Contoh: Join tabel"
                    placeholderTextColor={color.placeholder}
                    selectionColor={color.purpleDeep}
                    style={[styles.pill, styles.pillCompact, styles.materi]}
                    value={materi}
                    onChangeText={setMateri}
                    multiline
                  />
                </Row>
              </View>

              {/* Daftar praktikan (Figma: kotak oranye "Daftar Praktikan"). */}
              <View style={styles.studentBox}>
                <View style={styles.studentHeader}>
                  <Text style={styles.studentTitle}>Daftar Praktikan</Text>
                  <Text style={styles.studentCount}>{selected.length} dipilih</Text>
                </View>
                <View style={styles.studentPanel}>
                  <View style={styles.search}>
                    <Feather name="search" size={16} color={color.muted} />
                    <TextInput
                      accessibilityLabel="Cari praktikan"
                      placeholder="Cari nama atau NIM"
                      placeholderTextColor={color.placeholder}
                      selectionColor={color.purpleDeep}
                      style={styles.searchInput}
                      value={search}
                      onChangeText={setSearch}
                    />
                  </View>
                  {!!listMessage && <Text style={styles.error} accessibilityRole="alert">{listMessage}</Text>}
                  {!listMessage && filtered.length === 0 && (
                    <Text style={styles.helper}>
                      {praktikanList.length === 0
                        ? 'Belum ada akun praktikan yang terdaftar.'
                        : 'Tidak ada praktikan yang cocok dengan pencarian.'}
                    </Text>
                  )}
                  {filtered.map((user) => {
                    const checked = selected.includes(user.id);
                    return (
                      <Pressable
                        key={user.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        accessibilityLabel={`${user.nama}, ${user.nim}`}
                        onPress={() => toggle(user.id)}
                        style={({ pressed }) => [styles.student, pressed && styles.pressed]}
                      >
                        <View style={[styles.check, checked && styles.checkOn]}>
                          {checked && <Feather name="check" size={14} color={color.onDark} />}
                        </View>
                        <View style={styles.flex}>
                          <Text style={styles.optionName}>{user.nama}</Text>
                          <Text style={styles.optionSub}>{user.nim}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {!!message && <Text style={styles.error} accessibilityRole="alert">{message}</Text>}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                onPress={submit}
                disabled={busy}
                style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed]}
              >
                <Text style={styles.primaryText}>{busy ? 'Menyimpan...' : 'Simpan'}</Text>
              </Pressable>

              {isEdit && isOwner && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setDeleteError('');
                    setConfirmDelete(true);
                  }}
                  style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                >
                  <Feather name="trash-2" size={16} color={color.danger} />
                  <Text style={styles.deleteText}>Hapus sesi ini</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={picker === 'praktikum'}
        title="Nama praktikum"
        options={praktikumOptions}
        value={praktikum}
        onSelect={setPraktikum}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === 'kelas'}
        title="Kelas"
        options={kelasOptions}
        value={kelas}
        onSelect={setKelas}
        onClose={() => setPicker(null)}
      />
      <LabSheet
        visible={picker === 'ruang'}
        labs={labs}
        loading={labsLoading}
        error={labsError}
        value={selectedLab ? selectedLab.id : null}
        onSelect={chooseLab}
        onClose={() => setPicker(null)}
      />
      <CalendarSheet
        visible={picker === 'tanggal'}
        value={tanggal}
        onSelect={setTanggal}
        onClose={() => setPicker(null)}
      />
      <TimeSheet
        visible={picker === 'mulai'}
        title="Jam mulai"
        value={jamMulai}
        onSelect={setJamMulai}
        onClose={() => setPicker(null)}
      />
      <TimeSheet
        visible={picker === 'selesai'}
        title="Jam selesai"
        value={jamSelesai || jamMulai}
        onSelect={setJamSelesai}
        onClose={() => setPicker(null)}
      />

      <ConfirmDialog
        visible={confirmDelete}
        title="Hapus sesi?"
        message={editing ? `${editing.praktikum} · Kelas ${editing.kelas} · Pertemuan ${editing.pertemuan}. Sesi yang dihapus tidak dapat dikembalikan.` : ''}
        confirmLabel="Hapus"
        danger
        busy={deleting}
        error={deleteError}
        onConfirm={removeSession}
        onCancel={() => !deleting && setConfirmDelete(false)}
      />
    </SafeAreaView>
  );
}

const LABEL_WIDTH = 104;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.lavender },
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  content: { flexGrow: 1, backgroundColor: color.background },
  lavenderTop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: color.lavender },
  decor: { position: 'absolute', left: 0, right: 0 },
  header: { paddingHorizontal: 17, paddingTop: 12 },
  form: { paddingHorizontal: 34, paddingTop: 34, gap: 14 },

  // Kolom isian berbentuk pil (Figma: putih, garis ungu tua).
  pill: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
    backgroundColor: color.card,
  },
  pillCompact: { minHeight: 44, paddingHorizontal: 16 },
  pillText: { flex: 1, fontFamily: font.regular, fontSize: 15, color: color.ink },
  placeholder: { fontFamily: font.regular, fontStyle: 'italic', color: color.placeholder },

  rows: { gap: 10, marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { width: LABEL_WIDTH, fontFamily: font.medium, fontSize: 15, color: color.ink },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dash: { fontFamily: font.medium, fontSize: 16, color: color.ink },
  hint: { marginLeft: LABEL_WIDTH, marginTop: -4, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: color.muted },
  hintError: { color: color.danger },
  stepper: { justifyContent: 'space-between' },
  stepButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.lavenderSoft,
  },
  stepValue: { fontFamily: font.semibold, fontSize: 16, color: color.ink },
  materi: { borderRadius: 22, paddingVertical: 10, fontFamily: font.regular, fontSize: 15, color: color.ink, textAlignVertical: 'center' },

  // Daftar praktikan
  studentBox: {
    marginTop: 12,
    padding: 16,
    paddingTop: 14,
    borderRadius: 34,
    backgroundColor: color.orange,
  },
  studentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, marginBottom: 12 },
  studentTitle: { fontFamily: font.display, fontSize: 20, color: color.onDark },
  studentCount: {
    fontFamily: font.semibold,
    fontSize: 12,
    color: color.ink,
    backgroundColor: color.card,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  studentPanel: { borderRadius: radius.card, backgroundColor: color.surface, padding: 12, minHeight: 110 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.card,
  },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 14, color: color.ink, paddingVertical: 8 },
  student: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.card,
  },
  checkOn: { backgroundColor: color.plum, borderColor: color.plum },
  optionName: { fontFamily: font.semibold, fontSize: 14, color: color.ink },
  optionSub: { fontFamily: font.regular, fontSize: 12, color: color.muted, marginTop: 1 },
  helper: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted, marginTop: 12 },
  error: {
    fontFamily: font.medium,
    fontSize: 13,
    lineHeight: 19,
    color: color.danger,
    backgroundColor: color.dangerSoft,
    borderRadius: radius.sm,
    padding: 12,
    marginTop: 4,
  },

  // Tombol
  primaryButton: {
    minHeight: 54,
    marginTop: 14,
    borderRadius: radius.pill,
    backgroundColor: color.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: font.display, fontSize: 20, color: color.onDark },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48 },
  deleteText: { fontFamily: font.semibold, fontSize: 14, color: color.danger },

  noticeCard: { margin: 34, padding: 22, gap: 6, borderRadius: radius.card, backgroundColor: color.card },
  noticeTitle: { fontFamily: font.display, fontSize: 18, color: color.ink },
  noticeText: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.inkSoft },

  // Lembar pilihan
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(54,54,54,0.55)' },
  sheet: {
    maxHeight: '82%',
    paddingHorizontal: 22,
    paddingTop: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: color.card,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sheetTitle: { fontFamily: font.display, fontSize: 22, color: color.ink },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.lavenderSoft,
  },
  sheetList: { maxHeight: 260 },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 52,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  sheetLabel: { fontFamily: font.medium, fontSize: 13, color: color.muted, marginTop: 16, marginBottom: 8 },
  textInput: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
    fontFamily: font.regular,
    fontSize: 14,
    color: color.ink,
  },
  smallButton: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    backgroundColor: color.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: { fontFamily: font.semibold, fontSize: 14, color: color.onDark },
  sheetPrimary: { marginTop: 18 },
  sheetSecondary: {
    minHeight: 48,
    marginTop: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSecondaryText: { fontFamily: font.semibold, fontSize: 14, color: color.purpleInk },

  // Kalender di lembar pilihan
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  calendarTitle: { fontFamily: font.display, fontSize: 18, color: color.ink },
  calendarRow: { flexDirection: 'row' },
  calendarWeekday: { flex: 1, textAlign: 'center', fontFamily: font.medium, fontSize: 11, color: color.muted, paddingVertical: 6 },
  calendarCell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  calendarDay: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.dayBg },
  calendarToday: { borderWidth: 2, borderColor: color.plum },
  calendarSelected: { backgroundColor: color.plum, borderColor: color.plum },
  calendarDayText: { fontFamily: font.medium, fontSize: 13, color: color.dayText },
  calendarOther: { color: color.dayOtherText },
  calendarSelectedText: { color: color.onDark },

  // Jam
  timeColumnLabel: { fontFamily: font.medium, fontSize: 12, color: color.muted, textAlign: 'center', marginBottom: 8 },
  timeColumn: { height: 220, borderRadius: radius.card, backgroundColor: color.surface },
  timeItem: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6, marginVertical: 2, borderRadius: radius.button },
  timeItemSelected: { backgroundColor: color.plum },
  timeItemText: { fontFamily: font.medium, fontSize: 16, color: color.ink },
  timeItemTextSelected: { color: color.onDark },
});

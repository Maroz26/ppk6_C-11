import { Ionicons } from '@expo/vector-icons';
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
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
    createSession,
    listenPraktikanList,
    scheduleErrorMessage,
    SessionInput,
    updateSession,
    validateSession,
} from '../services/scheduleService';
import { palette } from '../theme';
import { User } from '../types';
import { formatTanggal } from '../utils/formatTime';

// Ubah daftar ini sesuai praktikum dan ruang di kampusmu.
const PRAKTIKUM_OPTIONS = ['Pemrograman Web', 'Basis Data'];
const RUANG_OPTIONS = ['Lab Komputer 1', 'Lab Komputer 2'];
const KELAS_OPTIONS = ['A', 'B', 'C', 'D'];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

type Picker = 'praktikum' | 'ruang' | 'tanggal' | 'mulai' | 'selesai' | null;

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDate(value: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

// Kolom yang dibuka dengan ketukan (dropdown, kalender, jam).
function SelectField({ label, value, placeholder, icon, onPress }: {
  label: string;
  value: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        onPress={onPress}
        style={({ pressed }) => [styles.select, pressed && styles.pressed]}
      >
        <Text style={[styles.selectText, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name={icon} size={18} color={palette.navy} />
      </Pressable>
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
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Tutup" />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={palette.navy} />
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
            onPress={() => choose(option)}
            style={({ pressed }) => [styles.sheetOption, pressed && styles.pressed]}
          >
            <Text style={styles.optionName}>{option}</Text>
            {option === value && <Ionicons name="checkmark" size={18} color={palette.navy} />}
          </Pressable>
        ))}
      </ScrollView>
      <Text style={[styles.fieldLabel, styles.customLabel]}>Lainnya</Text>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel="Ketik pilihan lain"
          placeholder="Ketik sendiri"
          placeholderTextColor="#7C879B"
          selectionColor={palette.sapphire}
          style={[styles.input, styles.flex]}
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

function CalendarSheet({ visible, value, onSelect, onClose }: {
  visible: boolean;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [year, setYear] = useState(() => parseDate(value).getFullYear());
  const [month, setMonth] = useState(() => parseDate(value).getMonth());

  // Setiap dibuka, kalender menampilkan bulan dari tanggal yang sedang dipilih.
  useEffect(() => {
    if (!visible) return;
    const date = parseDate(value);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
  }, [visible, value]);

  function move(delta: number) {
    const next = month + delta;
    if (next < 0) {
      setMonth(11);
      setYear(year - 1);
    } else if (next > 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(next);
    }
  }

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  const now = new Date();
  const today = toISO(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <Sheet visible={visible} title="Pilih tanggal" onClose={onClose}>
      <View style={styles.calendarHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Bulan sebelumnya" onPress={() => move(-1)} style={styles.closeButton}>
          <Ionicons name="chevron-back" size={18} color={palette.navy} />
        </Pressable>
        <Text style={styles.calendarTitle}>{MONTHS[month]} {year}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Bulan berikutnya" onPress={() => move(1)} style={styles.closeButton}>
          <Ionicons name="chevron-forward" size={18} color={palette.navy} />
        </Pressable>
      </View>
      <View style={styles.calendarGrid}>
        {DAYS.map((day) => (
          <View key={day} style={styles.calendarCell}>
            <Text style={styles.calendarDayName}>{day}</Text>
          </View>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <View key={`kosong-${index}`} style={styles.calendarCell} />;
          const iso = toISO(year, month, day);
          const selected = iso === value;
          const isToday = iso === today;
          return (
            <View key={iso} style={styles.calendarCell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={formatTanggal(iso)}
                accessibilityState={{ selected }}
                onPress={() => {
                  onSelect(iso);
                  onClose();
                }}
                style={[styles.calendarDay, isToday && styles.calendarToday, selected && styles.calendarSelected]}
              >
                <Text style={[styles.calendarDayText, selected && styles.calendarSelectedText]}>{day}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
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
      <View style={styles.row}>
        {column(HOURS, hour, setHour, 'Jam')}
        {column(MINUTES, minute, setMinute, 'Menit')}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onSelect(`${hour}:${minute}`);
          onClose();
        }}
        style={({ pressed }) => [styles.sheetConfirm, pressed && styles.pressed]}
      >
        <Text style={styles.sheetConfirmText}>Pilih {hour}:{minute}</Text>
      </Pressable>
    </Sheet>
  );
}

export default function SessionFormScreen() {
  // Tanpa id: tambah sesi baru. Dengan id: ubah sesi yang sudah ada.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { sessions, currentUser, role } = useApp();
  const isEdit = !!id;
  const editing = isEdit ? sessions.find((s) => s.id === id) : undefined;

  const [praktikum, setPraktikum] = useState('');
  const [kelas, setKelas] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jamMulai, setJamMulai] = useState('');
  const [jamSelesai, setJamSelesai] = useState('');
  const [ruang, setRuang] = useState('');
  const [pertemuan, setPertemuan] = useState(1);
  const [materi, setMateri] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const [picker, setPicker] = useState<Picker>(null);
  const [praktikanList, setPraktikanList] = useState<User[]>([]);
  const [listMessage, setListMessage] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

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
    setPertemuan(editing.pertemuan);
    setMateri(editing.materi);
    setSelected(editing.enrolledStudents ?? []);
  }, [editing]);

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

  const keyword = search.trim().toLowerCase();
  const filtered = praktikanList.filter(
    (u) => u.nama.toLowerCase().includes(keyword) || u.nim.includes(keyword),
  );
  const kelasOptions = kelas && !KELAS_OPTIONS.includes(kelas) ? [...KELAS_OPTIONS, kelas] : KELAS_OPTIONS;

  const notAllowed = role !== 'ASISTEN';
  const notFound = isEdit && !editing;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={palette.ivory} />
          </Pressable>
          <Text style={styles.eyebrow}>JADWAL ASISTEN</Text>
          <Text style={styles.pageTitle}>{isEdit ? 'Ubah sesi' : 'Tambah sesi'}</Text>
          <Text style={styles.pageDescription}>
            Lengkapi data sesi dan pilih praktikan yang terdaftar. Hanya praktikan terpilih yang dapat melihat sesi ini.
          </Text>

          {notAllowed || notFound ? (
            <View style={styles.emptyCard}>
              <Ionicons name="alert-circle-outline" size={26} color={palette.champagne} />
              <Text style={styles.emptyTitle}>
                {notAllowed ? 'Hanya asisten yang dapat mengelola jadwal' : 'Sesi tidak ditemukan'}
              </Text>
              <Text style={styles.emptyDescription}>
                {notAllowed ? 'Masuk dengan akun asisten untuk menambah atau mengubah sesi.' : 'Sesi ini mungkin sudah dihapus.'}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.formCard}>
                <SelectField
                  label="Praktikum"
                  value={praktikum}
                  placeholder="Pilih praktikum"
                  icon="chevron-down"
                  onPress={() => setPicker('praktikum')}
                />

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Kelas</Text>
                  <View style={styles.chipRow}>
                    {kelasOptions.map((option) => {
                      const active = kelas === option;
                      return (
                        <Pressable
                          key={option}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          accessibilityLabel={`Kelas ${option}`}
                          onPress={() => setKelas(option)}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Pertemuan ke</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Kurangi pertemuan"
                      onPress={() => setPertemuan((value) => Math.max(1, value - 1))}
                      style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="remove" size={18} color={palette.navy} />
                    </Pressable>
                    <Text style={styles.stepValue}>{pertemuan}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Tambah pertemuan"
                      onPress={() => setPertemuan((value) => value + 1)}
                      style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="add" size={18} color={palette.navy} />
                    </Pressable>
                  </View>
                </View>

                <SelectField
                  label="Tanggal"
                  value={tanggal ? formatTanggal(tanggal) : ''}
                  placeholder="Pilih tanggal"
                  icon="calendar-outline"
                  onPress={() => setPicker('tanggal')}
                />

                <View style={styles.row}>
                  <View style={styles.flex}>
                    <SelectField
                      label="Jam mulai"
                      value={jamMulai}
                      placeholder="Pilih jam"
                      icon="time-outline"
                      onPress={() => setPicker('mulai')}
                    />
                  </View>
                  <View style={styles.flex}>
                    <SelectField
                      label="Jam selesai"
                      value={jamSelesai}
                      placeholder="Pilih jam"
                      icon="time-outline"
                      onPress={() => setPicker('selesai')}
                    />
                  </View>
                </View>

                <SelectField
                  label="Ruang"
                  value={ruang}
                  placeholder="Pilih ruang"
                  icon="chevron-down"
                  onPress={() => setPicker('ruang')}
                />

                <View>
                  <Text style={styles.fieldLabel}>Materi</Text>
                  <TextInput
                    accessibilityLabel="Materi"
                    placeholder="Contoh: Pengenalan HTML & CSS"
                    placeholderTextColor="#7C879B"
                    selectionColor={palette.sapphire}
                    style={[styles.input, styles.multiline]}
                    value={materi}
                    onChangeText={setMateri}
                    multiline
                  />
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Praktikan terdaftar</Text>
                <Text style={styles.count}>{selected.length}</Text>
              </View>

              <View style={styles.formCard}>
                <TextInput
                  accessibilityLabel="Cari praktikan"
                  placeholder="Cari nama atau NIM"
                  placeholderTextColor="#7C879B"
                  selectionColor={palette.sapphire}
                  style={styles.input}
                  value={search}
                  onChangeText={setSearch}
                />
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
                      onPress={() => toggle(user.id)}
                      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                    >
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={checked ? palette.navy : palette.taupe}
                      />
                      <View style={styles.flex}>
                        <Text style={styles.optionName}>{user.nama}</Text>
                        <Text style={styles.optionNim}>{user.nim}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {!!message && <Text style={[styles.error, styles.errorOnNavy]} accessibilityRole="alert">{message}</Text>}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                onPress={submit}
                disabled={busy}
                style={({ pressed }) => [styles.submitButton, (pressed || busy) && styles.pressed]}
              >
                <Text style={styles.submitText}>
                  {busy ? 'Menyimpan...' : isEdit ? 'Simpan perubahan' : 'Simpan sesi'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={picker === 'praktikum'}
        title="Pilih praktikum"
        options={PRAKTIKUM_OPTIONS}
        value={praktikum}
        onSelect={setPraktikum}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === 'ruang'}
        title="Pilih ruang"
        options={RUANG_OPTIONS}
        value={ruang}
        onSelect={setRuang}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.navy },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
  back: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.sapphire, marginBottom: 16,
  },
  eyebrow: { color: palette.taupe, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  pageTitle: { color: palette.ivory, fontSize: 28, fontWeight: '700', marginTop: 5 },
  pageDescription: { color: palette.champagne, fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 18 },
  formCard: { padding: 18, borderRadius: 20, backgroundColor: palette.ivory },
  row: { flexDirection: 'row', gap: 12 },
  field: { marginBottom: 14 },
  fieldLabel: { color: palette.navy, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  input: {
    minHeight: 50, borderWidth: 1, borderColor: palette.taupe, borderRadius: 13,
    backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 11,
    color: palette.navy, fontSize: 13,
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  select: {
    minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    borderWidth: 1, borderColor: palette.taupe, borderRadius: 13,
    backgroundColor: '#FFFFFF', paddingHorizontal: 13,
  },
  selectText: { flex: 1, color: palette.navy, fontSize: 13, fontWeight: '700' },
  placeholder: { color: '#7C879B', fontWeight: '400' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    minWidth: 52, minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center',
    borderRadius: 13, borderWidth: 1, borderColor: palette.taupe, backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: palette.navy, borderColor: palette.navy },
  chipText: { color: palette.navy, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: palette.ivory },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepButton: {
    width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.champagne, borderWidth: 1, borderColor: palette.taupe,
  },
  stepValue: { minWidth: 32, textAlign: 'center', color: palette.navy, fontSize: 18, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 11 },
  sectionTitle: { color: palette.ivory, fontSize: 17, fontWeight: '700' },
  count: {
    color: palette.navy, backgroundColor: palette.champagne, minWidth: 26, paddingHorizontal: 7, paddingVertical: 4,
    borderRadius: 20, textAlign: 'center', fontSize: 11, fontWeight: '700', overflow: 'hidden',
  },
  helper: { color: palette.sapphire, fontSize: 12, lineHeight: 18, marginTop: 12 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#E4E0D6', marginTop: 12,
  },
  optionName: { flex: 1, color: palette.navy, fontSize: 13, fontWeight: '700' },
  optionNim: { color: palette.sapphire, fontSize: 11, marginTop: 3 },
  pressed: { opacity: 0.75 },
  error: {
    color: '#713D46', backgroundColor: '#F0E7E5', borderRadius: 10, padding: 10,
    fontSize: 12, lineHeight: 18, marginTop: 10,
  },
  errorOnNavy: { marginTop: 16 },
  submitButton: {
    minHeight: 50, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.champagne, borderRadius: 13, marginTop: 16,
  },
  submitText: { color: palette.navy, fontSize: 14, fontWeight: '700' },
  emptyCard: {
    alignItems: 'center', backgroundColor: palette.sapphire, borderWidth: 1, borderColor: '#52658A',
    borderRadius: 18, padding: 22,
  },
  emptyTitle: { color: palette.ivory, fontSize: 14, fontWeight: '700', marginTop: 9, textAlign: 'center' },
  emptyDescription: { color: palette.champagne, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },

  // Lembar pilihan
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(7,17,40,0.7)' },
  sheet: {
    maxHeight: '80%', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30,
    borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: palette.ivory,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { color: palette.navy, fontSize: 21, fontWeight: '700' },
  closeButton: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.champagne,
  },
  sheetList: { maxHeight: 240 },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#E4E0D6',
  },
  customLabel: { marginTop: 14 },
  smallButton: {
    minHeight: 50, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
    borderRadius: 13, backgroundColor: palette.navy,
  },
  smallButtonText: { color: palette.ivory, fontSize: 13, fontWeight: '700' },
  sheetConfirm: {
    minHeight: 50, alignItems: 'center', justifyContent: 'center',
    borderRadius: 13, backgroundColor: palette.navy, marginTop: 16,
  },
  sheetConfirmText: { color: palette.ivory, fontSize: 14, fontWeight: '700' },

  // Kalender
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calendarTitle: { color: palette.navy, fontSize: 15, fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.28%', alignItems: 'center', paddingVertical: 3 },
  calendarDayName: { color: palette.sapphire, fontSize: 11, fontWeight: '700', paddingVertical: 6 },
  calendarDay: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  calendarToday: { borderWidth: 1, borderColor: palette.taupe },
  calendarSelected: { backgroundColor: palette.navy, borderColor: palette.navy },
  calendarDayText: { color: palette.navy, fontSize: 13, fontWeight: '600' },
  calendarSelectedText: { color: palette.ivory, fontWeight: '700' },

  // Jam
  timeColumnLabel: { color: palette.sapphire, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  timeColumn: { height: 220, borderWidth: 1, borderColor: palette.taupe, borderRadius: 13, backgroundColor: '#FFFFFF' },
  timeItem: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6, marginVertical: 2, borderRadius: 10 },
  timeItemSelected: { backgroundColor: palette.navy },
  timeItemText: { color: palette.navy, fontSize: 15, fontWeight: '600' },
  timeItemTextSelected: { color: palette.ivory, fontWeight: '700' },
});
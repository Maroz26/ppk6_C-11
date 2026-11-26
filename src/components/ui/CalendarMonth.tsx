import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font } from '../../theme/tokens';
import { calendarWeeks, isSameDay, namaBulanTahun, namaHari } from '../../utils/dateId';

const WEEKDAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Kalender bulanan (Figma: jadwal-prak "Month heading", "Days of the week", "Calendar dates").
// - Minggu dimulai hari Senin; hari Minggu berwarna mint.
// - Tanggal yang punya praktikum diberi titik di bawah angka.
// - Hari ini diberi lingkaran tepi; tanggal terpilih berwarna ungu tua.
// - Menekan tanggal bulan lain langsung pindah ke bulan itu.
export function CalendarMonth({ month, selected, today, markedDates, onSelect, onChangeMonth }: {
  month: Date; // tanggal berapa pun di bulan yang ditampilkan
  selected: Date;
  today: Date;
  markedDates: Set<string>; // "2026-11-23"
  onSelect: (date: Date) => void;
  onChangeMonth: (delta: -1 | 1) => void;
}) {
  const weeks = calendarWeeks(month);

  return (
    <View>
      <View style={styles.heading}>
        <Text style={styles.monthText} accessibilityRole="header">{namaBulanTahun(month)}</Text>
        <View style={styles.arrows}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bulan sebelumnya"
            onPress={() => onChangeMonth(-1)}
            hitSlop={6}
            style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
          >
            <Feather name="chevron-left" size={22} color={color.onDark} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bulan berikutnya"
            onPress={() => onChangeMonth(1)}
            hitSlop={6}
            style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
          >
            <Feather name="chevron-right" size={22} color={color.onDark} />
          </Pressable>
        </View>
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.weeks}>
        {weeks.map((week) => (
          <View key={week[0].toISOString()} style={styles.row}>
            {week.map((date) => {
              const inMonth = date.getMonth() === month.getMonth();
              const isSunday = date.getDay() === 0;
              const isSelected = isSameDay(date, selected);
              const isToday = isSameDay(date, today);
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const hasEvent = markedDates.has(key);

              const bg = isSelected ? color.daySelected : !inMonth ? color.dayOtherBg : isSunday ? color.sundayBg : color.dayBg;
              const fg = isSelected ? color.onDark : !inMonth ? color.dayOtherText : isSunday ? color.sundayText : color.dayText;

              return (
                <View key={key} style={styles.cell}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${namaHari(date)} ${date.getDate()}${isToday ? ', hari ini' : ''}${hasEvent ? ', ada praktikum' : ''}`}
                    onPress={() => onSelect(date)}
                    style={({ pressed }) => [
                      styles.day,
                      { backgroundColor: bg },
                      isToday && !isSelected && styles.todayRing,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.dayText, { color: fg }]}>{date.getDate()}</Text>
                    {hasEvent && (
                      <View style={[styles.dot, { backgroundColor: isSelected ? color.onDark : color.purpleDeep }]} />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const DAY = 36;

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 50, paddingLeft: 6 },
  monthText: { fontFamily: font.display, fontSize: 25, color: color.onDark },
  arrows: { flexDirection: 'row', gap: 6 },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row' },
  weekdayCell: { flex: 1, height: 20, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  weekdayText: { fontFamily: font.medium, fontSize: 11, color: color.onDark },
  weeks: { gap: 4, marginTop: 9 },
  cell: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' },
  day: { width: DAY, height: DAY, borderRadius: DAY / 2, alignItems: 'center', justifyContent: 'center' },
  todayRing: { borderWidth: 2, borderColor: color.daySelected },
  dayText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  dot: { position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 2.5 },
});

// src/screens/LabMapScreen.tsx
// Halaman Peta laboratorium (Sprint 3, Programmer 2).
// - Marker semua laboratorium + lingkaran radius presensi
// - Titik posisi pengguna yang diperbarui selama halaman dibuka
// - Kartu detail lab: praktikum yang sedang berlangsung dan berikutnya (labSchedule)
// - Pesan jelas untuk izin lokasi ditolak, GPS mati, peta gagal dimuat, offline
// Logika data ada di hooks/ dan utils/, file ini hanya tampilan.
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  ViewAnnotation,
} from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useIsOnline } from '../hooks/useIsOnline';
import { useLabs } from '../hooks/useLabs';
import { useLabSchedule } from '../hooks/useLabSchedule';
import { useNow } from '../hooks/useNow';
import { useUserLocation } from '../hooks/useUserLocation';
import { isLabUsable } from '../services/labService';
import {
  locationErrorMessage,
  resolveActionLabel,
  resolveLocationProblem,
} from '../services/locationService';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  FOCUS_ZOOM,
  MAP_STYLE_URL,
  mapColors,
} from '../theme/mapTheme';
import { color as c, font, radius, sessionStatusColor, shadow } from '../theme/tokens';
import { Lab, LabScheduleEntry } from '../types';
import { formatEntryTime, getLabActivity, LabActivity, STATUS_LABEL } from '../utils/labActivity';
import { circlePolygon, distanceMeters, formatDistance } from '../utils/geo';

const STATUS_STYLE = {
  BELUM_DIBUKA: { background: sessionStatusColor.BELUM_DIBUKA.bg, text: sessionStatusColor.BELUM_DIBUKA.text },
  DIBUKA: { background: sessionStatusColor.DIBUKA.bg, text: sessionStatusColor.DIBUKA.text },
  DITUTUP: { background: sessionStatusColor.DITUTUP.bg, text: sessionStatusColor.DITUTUP.text },
} as const;

export default function LabMapScreen() {
  const { role } = useApp();
  const { labs, loading: labsLoading, error: labsError } = useLabs();
  const { entries, loading: scheduleLoading, error: scheduleError } = useLabSchedule();
  const { location, fail, watching, retry } = useUserLocation();
  const online = useIsOnline();
  const now = useNow();

  const cameraRef = useRef<CameraRef>(null);
  // Ketukan pada penanda lab bisa ikut diteruskan ke peta; abaikan sesaat
  // supaya pilihan lab tidak langsung tertutup lagi.
  const lastMarkerPress = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const usableLabs = useMemo(() => labs.filter(isLabUsable), [labs]);

  const activities = useMemo(() => {
    const result: Record<string, LabActivity> = {};
    usableLabs.forEach((lab) => {
      result[lab.id] = getLabActivity(lab, entries, now);
    });
    return result;
  }, [usableLabs, entries, now]);

  const selectedLab = usableLabs.find((lab) => lab.id === selectedId) ?? null;

  // Lingkaran radius presensi semua lab dalam satu sumber GeoJSON.
  const radiusGeoJson = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: usableLabs.map((lab) => ({
        type: 'Feature',
        id: lab.id,
        properties: { selected: lab.id === selectedId ? 1 : 0 },
        geometry: { type: 'Polygon', coordinates: [circlePolygon(lab, lab.radius)] },
      })),
    }),
    [usableLabs, selectedId],
  );

  function selectLab(lab: Lab) {
    lastMarkerPress.current = Date.now();
    setSelectedId(lab.id);
    cameraRef.current?.easeTo({
      center: [lab.longitude, lab.latitude],
      zoom: FOCUS_ZOOM,
      duration: 500,
      padding: { bottom: 260 },
    });
  }

  function goToMe() {
    if (!location) {
      retry();
      return;
    }
    cameraRef.current?.easeTo({
      center: [location.longitude, location.latitude],
      zoom: FOCUS_ZOOM,
      duration: 500,
    });
  }

  function showAllLabs() {
    setSelectedId(null);
    if (usableLabs.length === 0) return;
    const lngs = usableLabs.map((l) => l.longitude);
    const lats = usableLabs.map((l) => l.latitude);
    cameraRef.current?.fitBounds(
      [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
      { padding: { top: 120, bottom: 280, left: 60, right: 60 }, duration: 500 },
    );
  }

  const distanceToSelected =
    selectedLab && location ? distanceMeters(location, selectedLab) : null;

  return (
    <View style={styles.container}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL}
        logo={false}
        compass={false}
        attribution
        attributionPosition={{ top: 104, right: 12 }}
        onPress={() => {
          if (Date.now() - lastMarkerPress.current > 400) setSelectedId(null);
        }}
        onDidFinishLoadingMap={() => {
          setMapLoaded(true);
          setMapFailed(false);
        }}
        onDidFailLoadingMap={() => setMapFailed(true)}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude],
            zoom: DEFAULT_ZOOM,
          }}
        />

        <GeoJSONSource id="lab-radius" data={radiusGeoJson}>
          <Layer
            type="fill"
            id="lab-radius-fill"
            paint={{
              'fill-color': mapColors.radiusFill,
              'fill-opacity': ['case', ['==', ['get', 'selected'], 1], 0.22, mapColors.radiusFillOpacity],
            }}
          />
          <Layer
            type="line"
            id="lab-radius-line"
            paint={{
              'line-color': mapColors.radiusLine,
              'line-width': ['case', ['==', ['get', 'selected'], 1], 2, 1],
              'line-dasharray': [2, 2],
            }}
          />
        </GeoJSONSource>

        {usableLabs.map((lab) => {
          const activity = activities[lab.id];
          const selected = lab.id === selectedId;
          const color = selected
            ? mapColors.pinSelected
            : activity?.occupied
              ? mapColors.pinBusy
              : mapColors.pinFree;
          return (
            <ViewAnnotation
              key={lab.id}
              id={`lab-${lab.id}`}
              lngLat={[lab.longitude, lab.latitude]}
              anchor="bottom"
              onPress={() => selectLab(lab)}
            >
              <View style={styles.pinWrap} accessibilityLabel={`Laboratorium ${lab.nama}`}>
                <View style={[styles.pinLabel, { backgroundColor: color }]}>
                  <Text style={styles.pinLabelText} numberOfLines={1}>{lab.nama}</Text>
                </View>
                <View style={[styles.pinStem, { backgroundColor: color }]} />
              </View>
            </ViewAnnotation>
          );
        })}

        {location && (
          <ViewAnnotation
            id="user-location"
            lngLat={[location.longitude, location.latitude]}
            anchor="center"
          >
            <View style={styles.userHalo} accessibilityLabel="Posisimu">
              <View style={styles.userDot} />
            </View>
          </ViewAnnotation>
        )}
      </Map>

      {/* Bagian atas: tombol kembali, judul, dan pesan kondisi. */}
      <SafeAreaView edges={['top']} style={styles.topArea} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali dari Peta Lab"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerPill, shadow.float, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="chevron-back" size={22} color={c.purpleDeep} />
            <Text style={styles.titleText}>Peta Lab</Text>
          </Pressable>
        </View>

        {online === false && (
          <Banner icon="cloud-offline-outline" text="Koneksi terputus. Peta dan jadwal mungkin tidak terbaru." />
        )}
        {mapFailed && (
          <Banner icon="map-outline" text="Peta gagal dimuat. Periksa koneksi internet lalu buka ulang halaman ini." />
        )}
        {fail && (
          <Banner
            icon="locate-outline"
            text={locationErrorMessage(fail)}
            action={resolveActionLabel(fail)}
            onAction={async () => {
              await resolveLocationProblem(fail);
              if (fail !== 'IZIN_DITOLAK_PERMANEN') retry();
            }}
          />
        )}
        {!fail && watching && !location && (
          <Banner icon="locate-outline" text="Mencari posisimu..." loading />
        )}
        {(labsError || scheduleError) && (
          <Banner icon="alert-circle-outline" text={labsError || scheduleError} />
        )}
      </SafeAreaView>

      {/* Tombol kamera. */}
      <View style={styles.fabColumn} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Tampilkan semua lab" onPress={showAllLabs} style={styles.fab}>
          <Ionicons name="business-outline" size={20} color={c.purpleInk} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ke posisiku" onPress={goToMe} style={styles.fab}>
          <Ionicons name={location ? 'navigate' : 'navigate-outline'} size={20} color={c.purpleInk} />
        </Pressable>
      </View>

      {/* Kartu bawah: detail lab terpilih, atau daftar lab. */}
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        {selectedLab ? (
          <LabDetail
            lab={selectedLab}
            activity={activities[selectedLab.id]}
            distance={distanceToSelected}
            now={now}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <LabList
            labs={usableLabs}
            activities={activities}
            loading={labsLoading || scheduleLoading || !mapLoaded}
            isAsisten={role === 'ASISTEN'}
            onSelect={selectLab}
          />
        )}
        <Text style={styles.credit}>Data peta © OpenStreetMap · OpenFreeMap</Text>
      </SafeAreaView>
    </View>
  );
}

function Banner({ icon, text, action, onAction, loading }: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  action?: string | null;
  onAction?: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      {loading ? (
        <ActivityIndicator size="small" color={c.purpleInk} />
      ) : (
        <Ionicons name={icon} size={18} color={c.purpleInk} />
      )}
      <Text style={styles.bannerText}>{text}</Text>
      {!!action && onAction && (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={styles.bannerAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function LabList({ labs, activities, loading, isAsisten, onSelect }: {
  labs: Lab[];
  activities: Record<string, LabActivity>;
  loading: boolean;
  isAsisten: boolean;
  onSelect: (lab: Lab) => void;
}) {
  if (!loading && labs.length === 0) {
    return (
      <View style={styles.sheetBody}>
        <Text style={styles.sheetTitle}>Belum ada data laboratorium</Text>
        <Text style={styles.muted}>
          {isAsisten
            ? 'Tambahkan lokasi laboratorium lewat menu Kelola Lab.'
            : 'Lokasi laboratorium belum diatur oleh asisten.'}
        </Text>
        {isAsisten && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/asisten/lab')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Kelola Lab</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.sheetBody}>
      <Text style={styles.sheetTitle}>Laboratorium Informatika</Text>
      <Text style={styles.muted}>Ketuk penanda atau nama lab untuk melihat praktikumnya.</Text>
      {loading && labs.length === 0 ? (
        <ActivityIndicator color={c.purpleInk} style={{ marginTop: 12 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {labs.map((lab) => {
            const occupied = activities[lab.id]?.occupied;
            return (
              <Pressable
                key={lab.id}
                accessibilityRole="button"
                onPress={() => onSelect(lab)}
                style={styles.labChip}
              >
                <View style={[styles.dot, { backgroundColor: occupied ? mapColors.pinBusy : mapColors.pinFree }]} />
                <Text style={styles.labChipText}>{lab.nama}</Text>
                <Text style={styles.labChipMeta}>{occupied ? 'Dipakai' : 'Kosong'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function LabDetail({ lab, activity, distance, now, onClose }: {
  lab: Lab;
  activity: LabActivity | undefined;
  distance: number | null;
  now: Date;
  onClose: () => void;
}) {
  const insideRadius = distance !== null && distance <= lab.radius;
  return (
    <View style={styles.sheetBody}>
      <View style={styles.detailHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{lab.gedung.toUpperCase()}</Text>
          <Text style={styles.sheetTitle}>{lab.nama}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup detail" onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={18} color={c.purpleInk} />
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: activity?.occupied ? c.warningSoft : c.successSoft }]}>
          <Text style={[styles.badgeText, { color: activity?.occupied ? c.warning : c.success }]}>
            {activity?.occupied ? 'Sedang dipakai' : 'Kosong'}
          </Text>
        </View>
        <Text style={styles.muted}>
          {distance === null
            ? `Radius presensi ${lab.radius} m`
            : `${formatDistance(distance)} darimu · ${insideRadius ? 'di dalam' : 'di luar'} radius ${lab.radius} m`}
        </Text>
      </View>

      <EntryBlock title="Sedang berlangsung" entry={activity?.current ?? null} now={now} empty="Tidak ada praktikum saat ini." />
      <EntryBlock title="Berikutnya" entry={activity?.next ?? null} now={now} empty="Belum ada jadwal berikutnya." />
    </View>
  );
}

function EntryBlock({ title, entry, now, empty }: {
  title: string;
  entry: LabScheduleEntry | null;
  now: Date;
  empty: string;
}) {
  return (
    <View style={styles.entry}>
      <Text style={styles.entryTitle}>{title}</Text>
      {entry ? (
        <>
          <View style={styles.entryTop}>
            <Text style={styles.entryName} numberOfLines={1}>
              {entry.praktikum} · Kelas {entry.kelas}
            </Text>
            <View style={[styles.badge, { backgroundColor: STATUS_STYLE[entry.status].background }]}>
              <Text style={[styles.badgeText, { color: STATUS_STYLE[entry.status].text }]}>
                {STATUS_LABEL[entry.status]}
              </Text>
            </View>
          </View>
          <Text style={styles.muted}>
            Pertemuan {entry.pertemuan} · {formatEntryTime(entry, now)}
          </Text>
        </>
      ) : (
        <Text style={styles.muted}>{empty}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  topArea: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 17, gap: 8 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  headerPill: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    borderRadius: 35,
    backgroundColor: c.card,
  },
  titleText: { fontFamily: font.display, fontSize: 20, color: c.purpleDeep },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.input,
    backgroundColor: c.card, borderWidth: 2, borderColor: c.lavender,
  },
  bannerText: { flex: 1, fontFamily: font.regular, color: c.ink, fontSize: 12, lineHeight: 17 },
  bannerAction: { fontFamily: font.semibold, color: c.purpleDeep, fontSize: 12, textDecorationLine: 'underline' },
  fabColumn: { position: 'absolute', right: 16, bottom: 260, gap: 10 },
  fab: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.card, borderWidth: 2, borderColor: c.lavender,
  },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 3, borderLeftWidth: 3, borderRightWidth: 3, borderColor: c.lavender,
  },
  sheetBody: { padding: 20, gap: 8 },
  sheetTitle: { fontFamily: font.display, color: c.ink, fontSize: 24, lineHeight: 30 },
  eyebrow: { fontFamily: font.regular, color: c.inkSoft, fontSize: 13 },
  muted: { fontFamily: font.regular, color: c.muted, fontSize: 13, lineHeight: 19, flexShrink: 1 },
  chipRow: { gap: 8, paddingTop: 6 },
  labChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 42,
    borderRadius: radius.pill, borderWidth: 1.5, borderColor: c.lavender, backgroundColor: c.surface,
  },
  labChipText: { fontFamily: font.semibold, color: c.ink, fontSize: 13 },
  labChipMeta: { fontFamily: font.regular, color: c.muted, fontSize: 12 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  closeButton: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.lavenderSoft,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontFamily: font.semibold, fontSize: 11 },
  entry: { padding: 14, borderRadius: radius.input, backgroundColor: c.surface, gap: 4 },
  entryTitle: { fontFamily: font.medium, color: c.muted, fontSize: 12 },
  entryTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryName: { flex: 1, fontFamily: font.display, color: c.ink, fontSize: 18 },
  primaryButton: {
    minHeight: 50, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.plum, marginTop: 6,
  },
  primaryText: { fontFamily: font.display, color: c.onDark, fontSize: 18 },
  credit: { fontFamily: font.regular, color: c.muted, fontSize: 10, textAlign: 'center', paddingBottom: 6 },
  pinWrap: { alignItems: 'center' },
  pinLabel: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, maxWidth: 130 },
  pinLabelText: { fontFamily: font.semibold, color: mapColors.pinDot, fontSize: 12 },
  pinStem: { width: 3, height: 10, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  userHalo: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: mapColors.userHalo,
  },
  userDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: mapColors.user,
    borderWidth: 2, borderColor: mapColors.userBorder,
  },
});

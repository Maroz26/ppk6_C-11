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
import { palette } from '../theme';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  FOCUS_ZOOM,
  MAP_STYLE_URL,
  mapColors,
} from '../theme/mapTheme';
import { Lab, LabScheduleEntry } from '../types';
import { formatEntryTime, getLabActivity, LabActivity, STATUS_LABEL } from '../utils/labActivity';
import { circlePolygon, distanceMeters, formatDistance } from '../utils/geo';

const STATUS_STYLE = {
  BELUM_DIBUKA: { background: palette.champagne, text: palette.navy },
  DIBUKA: { background: '#DDE9E0', text: '#355C49' },
  DITUTUP: { background: '#F0E7E5', text: '#713D46' },
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
            accessibilityLabel="Kembali"
            onPress={() => router.back()}
            style={styles.roundButton}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color={palette.ivory} />
          </Pressable>
          <View style={styles.titlePill}>
            <Text style={styles.titleText}>Peta laboratorium</Text>
          </View>
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
          <Ionicons name="business-outline" size={20} color={palette.navy} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ke posisiku" onPress={goToMe} style={styles.fab}>
          <Ionicons name={location ? 'navigate' : 'navigate-outline'} size={20} color={palette.navy} />
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
        <ActivityIndicator size="small" color={palette.navy} />
      ) : (
        <Ionicons name={icon} size={18} color={palette.navy} />
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
            ? 'Tambahkan lokasi laboratorium lewat Jadwal → Kelola laboratorium.'
            : 'Lokasi laboratorium belum diatur oleh asisten.'}
        </Text>
        {isAsisten && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/asisten/lab')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Kelola laboratorium</Text>
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
        <ActivityIndicator color={palette.navy} style={{ marginTop: 12 }} />
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
                <View style={[styles.dot, { backgroundColor: occupied ? mapColors.pinBusy : '#4E8A6A' }]} />
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
          <Ionicons name="close" size={18} color={palette.navy} />
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: activity?.occupied ? '#F0E7E5' : '#DDE9E0' }]}>
          <Text style={[styles.badgeText, { color: activity?.occupied ? '#713D46' : '#355C49' }]}>
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
  container: { flex: 1, backgroundColor: palette.ivory },
  topArea: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, gap: 8 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  roundButton: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.navy,
  },
  titlePill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: palette.navy },
  titleText: { color: palette.ivory, fontSize: 13, fontWeight: '700' },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12,
    backgroundColor: palette.ivory, borderWidth: 1, borderColor: palette.taupe,
  },
  bannerText: { flex: 1, color: palette.navy, fontSize: 12, lineHeight: 17 },
  bannerAction: { color: palette.navy, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  fabColumn: { position: 'absolute', right: 16, bottom: 250, gap: 10 },
  fab: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.ivory, borderWidth: 1, borderColor: palette.taupe,
  },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: palette.ivory, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderTopWidth: 1, borderColor: palette.taupe,
  },
  sheetBody: { padding: 18, gap: 8 },
  sheetTitle: { color: palette.navy, fontSize: 18, fontWeight: '700' },
  eyebrow: { color: palette.sapphire, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  muted: { color: palette.sapphire, fontSize: 12, lineHeight: 18, flexShrink: 1 },
  chipRow: { gap: 8, paddingTop: 6 },
  labChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 18, borderWidth: 1, borderColor: palette.taupe, backgroundColor: '#FFFFFF',
  },
  labChipText: { color: palette.navy, fontSize: 13, fontWeight: '700' },
  labChipMeta: { color: palette.sapphire, fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  closeButton: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.champagne,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  entry: { padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: palette.champagne, gap: 4 },
  entryTitle: { color: palette.sapphire, fontSize: 11, fontWeight: '700' },
  entryTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryName: { flex: 1, color: palette.navy, fontSize: 14, fontWeight: '700' },
  primaryButton: {
    minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.navy, marginTop: 6,
  },
  primaryText: { color: palette.ivory, fontSize: 13, fontWeight: '700' },
  credit: { color: palette.taupe, fontSize: 10, textAlign: 'center', paddingBottom: 6 },
  pinWrap: { alignItems: 'center' },
  pinLabel: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, maxWidth: 120 },
  pinLabelText: { color: mapColors.pinDot, fontSize: 11, fontWeight: '700' },
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

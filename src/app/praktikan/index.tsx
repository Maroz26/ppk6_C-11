import { View } from 'react-native';
import { MapShortcut } from '../../components/MapShortcut';
import { ScheduleShortcut } from '../../components/ScheduleShortcut';
import AttendanceScreen from '../../screens/AttendanceScreen';

export default function PraktikanHomeRoute() {
  return (
    <View style={{ flex: 1 }}>
      <AttendanceScreen />
      <MapShortcut />
      <ScheduleShortcut href="/praktikan/jadwal" />
    </View>
  );
}

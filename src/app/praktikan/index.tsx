import { View } from 'react-native';
import { ScheduleShortcut } from '../../components/ScheduleShortcut';
import AttendanceScreen from '../../screens/AttendanceScreen';

export default function PraktikanHomeRoute() {
  return (
    <View style={{ flex: 1 }}>
      <AttendanceScreen />
      <ScheduleShortcut href="/praktikan/jadwal" />
    </View>
  );
}
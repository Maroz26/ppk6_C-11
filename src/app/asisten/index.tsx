import { View } from 'react-native';
import { ScheduleShortcut } from '../../components/ScheduleShortcut';
import AssistantHomeScreen from '../../screens/AssistantHomeScreen';

export default function AsistenHomeRoute() {
  return (
    <View style={{ flex: 1 }}>
      <AssistantHomeScreen />
      <ScheduleShortcut href="/asisten/jadwal" />
    </View>
  );
}
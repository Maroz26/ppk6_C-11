import { useLocalSearchParams, useRouter } from 'expo-router';
import SessionManagementScreen from '../../../screens/SessionManagementScreen';

export default function SessionManagementRoute() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const navigation = {
    goBack: () => router.back(),
    navigate: (name: string, params: { sessionId: string }) => {
      if (name === 'AssistantRecap') {
        router.push({
          pathname: '/assistant/[sessionId]/recap',
          params: { sessionId: params.sessionId },
        });
      }
    },
  };

  return (
    <SessionManagementScreen
      route={{ params: { sessionId: String(sessionId) } }}
      navigation={navigation}
    />
  );
}

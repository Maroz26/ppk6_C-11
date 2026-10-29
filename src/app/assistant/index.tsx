import { useRouter } from 'expo-router';
import AssistantHomeScreen from '../../screens/AssistantHomeScreen';

export default function AssistantHomeRoute() {
  const router = useRouter();

  const navigation = {
    navigate: (name: string, params: { sessionId: string }) => {
      if (name === 'SessionManagement') {
        router.push({
          pathname: '/assistant/[sessionId]',
          params: { sessionId: params.sessionId },
        });
      }
    },
  };

  return (
    <AssistantHomeScreen navigation={navigation} />
  );
}
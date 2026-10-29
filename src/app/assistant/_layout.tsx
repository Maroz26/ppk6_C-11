import { Stack } from 'expo-router';

export default function AssistantLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[sessionId]" options={{ headerShown: false }} />
    </Stack>
  );
}

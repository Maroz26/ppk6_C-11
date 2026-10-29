import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function CyberpunkSignal({ color = '#2F9E70', size = 7 }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      return;
    }

    pulse.value = withRepeat(withTiming(0.35, { duration: 850 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.85 + pulse.value * 0.15 }],
  }));

  return (
    <View
      accessibilityLabel="Sinyal aktif"
      style={[
        styles.halo,
        { width: size * 2.4, height: size * 2.4, borderRadius: size * 1.2 },
      ]}>
      <Animated.View
        style={[
          styles.dot,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          pulseStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47, 158, 112, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(47, 158, 112, 0.2)',
  },
  dot: {
    shadowColor: '#2F9E70',
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});

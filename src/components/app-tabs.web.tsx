import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="assistant" href="/assistant" asChild>
            <TabButton>Beranda</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ref: _ref, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.tabButton,
        isFocused && styles.tabButtonSelected,
        pressed && styles.pressed,
      ]}>
      <View>
        <Text style={[styles.tabButtonText, isFocused && styles.tabButtonTextSelected]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>A</Text>
        </View>
        <Text style={styles.brandText}>ASSIST</Text>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 14,
    width: '100%',
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    width: '100%',
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: MaxContentWidth,
    backgroundColor: '#FFFEFC',
    borderWidth: 1,
    borderColor: '#D5E4DB',
    shadowColor: '#17382D',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F2EB',
    borderWidth: 1,
    borderColor: '#C8DFD1',
  },
  brandMarkText: { color: '#087F5B', fontSize: 17, fontWeight: '800' },
  brandText: { color: '#17382D', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginRight: 'auto' },
  tabButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14 },
  tabButtonSelected: { backgroundColor: '#E5F2EB' },
  tabButtonText: { color: '#68786F', fontSize: 11, fontWeight: '600' },
  tabButtonTextSelected: { color: '#075B43' },
  pressed: { opacity: 0.72 },
});

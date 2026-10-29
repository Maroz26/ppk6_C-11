import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function AttendanceHistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Halaman Riwayat Presensi (Sedang dikerjakan oleh Rozan)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16, color: '#666' }
});
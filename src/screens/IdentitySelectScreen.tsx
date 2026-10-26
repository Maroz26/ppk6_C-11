import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { User } from '@/types';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function IdentitySelectScreen() {
  const { role, praktikanList, asistenList, setCurrentUser } = useApp();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const users = role === 'ASISTEN' ? asistenList : praktikanList;
  const filtered = users.filter(u => u.nama.toLowerCase().includes(search.toLowerCase()) || u.nim.includes(search));

  const handleMasuk = () => {
    if (selectedUser) {
      setCurrentUser(selectedUser);
      setModalVisible(false);
      router.replace(role === 'ASISTEN' ? '/asisten' : '/praktikan');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pilih Identitas ({role})</Text>
      <TextInput style={styles.input} placeholder="Cari Nama / NIM..." value={search} onChangeText={setSearch} />
      
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.userCard, selectedUser?.id === item.id && styles.userCardSelected]}
            onPress={() => setSelectedUser(item)}
          >
            <Text style={styles.userName}>{item.nama}</Text>
            <Text style={styles.userNim}>{item.nim}</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity 
        style={[styles.btnMasuk, !selectedUser && styles.btnDisabled]} 
        disabled={!selectedUser}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.btnMasukText}>Masuk</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.bottomSheet}>
            <Text style={styles.modalTitle}>Konfirmasi</Text>
            <Text style={styles.modalDesc}>Masuk sebagai {selectedUser?.nama} (NIM: {selectedUser?.nim})?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={{color: colors.primary}}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleMasuk}>
                <Text style={{color: 'white'}}>Ya, Masuk</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, marginTop: 40 },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  userCard: { padding: 16, backgroundColor: 'white', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  userCardSelected: { borderColor: colors.primary, backgroundColor: '#E3F2FD' },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userNim: { color: colors.textSecondary, marginTop: 4 },
  btnMasuk: { backgroundColor: colors.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnDisabled: { backgroundColor: colors.border },
  btnMasukText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: { backgroundColor: 'white', padding: 24, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalDesc: { fontSize: 16, marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  btnCancel: { padding: 12, marginRight: 16 },
  btnConfirm: { padding: 12, backgroundColor: colors.primary, borderRadius: 8 }
});
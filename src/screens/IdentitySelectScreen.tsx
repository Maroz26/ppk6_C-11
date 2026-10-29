import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { User } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function IdentitySelectScreen() {
  const { role, praktikanList, asistenList, setCurrentUser } = useApp();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const users = role === 'ASISTEN' ? asistenList : praktikanList;
  const filtered = users.filter(
    u => u.nama.toLowerCase().includes(search.toLowerCase()) || u.nim.includes(search)
  );

  const handleMasuk = () => {
    if (selectedUser) {
      setCurrentUser(selectedUser);
      setModalVisible(false);
      router.replace(role === 'ASISTEN' ? '/asisten' : '/praktikan');
    }
  };

  const roleLabel = role === 'ASISTEN' ? 'Asisten' : 'Praktikan';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerWrap}>
        <Pressable onPress={() => router.back()} style={styles.btnBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.header}>Pilih Identitas</Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>{roleLabel}</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Cari nama atau NIM..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const selected = selectedUser?.id === item.id;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.userCard,
                selected && styles.userCardSelected,
                pressed && !selected && styles.userCardPressed,
              ]}
              onPress={() => setSelectedUser(item)}
            >
              <View style={[styles.avatar, selected && styles.avatarSelected]}>
                <Text style={[styles.avatarText, selected && styles.avatarTextSelected]}>
                  {item.nama.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.nama}
                </Text>
                <Text style={styles.userNim}>{item.nim}</Text>
              </View>
              {selected ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              ) : (
                <View style={styles.radio} />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="person-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Tidak ada hasil untuk "{search}"</Text>
          </View>
        }
      />

      {/* Tombol masuk */}
      <Pressable
        style={({ pressed }) => [
          styles.btnMasuk,
          !selectedUser && styles.btnDisabled,
          pressed && selectedUser && styles.btnMasukPressed,
        ]}
        disabled={!selectedUser}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.btnMasukText, !selectedUser && styles.btnDisabledText]}>Masuk</Text>
        <Ionicons
          name="arrow-forward"
          size={18}
          color={selectedUser ? colors.textOnPrimary : colors.textSecondary}
        />
      </Pressable>

      {/* Modal konfirmasi */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.bottomSheet}>
            <View style={styles.handle} />
            <View style={styles.modalAvatar}>
              <Text style={styles.modalAvatarText}>
                {selectedUser?.nama?.trim()?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.modalTitle}>Konfirmasi Masuk</Text>
            <Text style={styles.modalDesc}>
              Masuk sebagai <Text style={styles.modalBold}>{selectedUser?.nama}</Text>
            </Text>
            <Text style={styles.modalNim}>NIM: {selectedUser?.nim}</Text>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.btnCancel, pressed && styles.btnCancelPressed]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnConfirm, pressed && styles.btnMasukPressed]}
                onPress={handleMasuk}
              >
                <Text style={styles.btnConfirmText}>Ya, Masuk</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },

  // Header
  headerWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  btnBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  header: { fontSize: 22, fontWeight: '800', color: colors.text },
  roleChip: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  roleChipText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },

  // List
  listContent: { paddingBottom: 8 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  userCardPressed: { backgroundColor: colors.primarySoft },
  userCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarSelected: { backgroundColor: colors.primary },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.textSecondary },
  avatarTextSelected: { color: colors.textOnPrimary },
  userInfo: { flex: 1, marginRight: 8 },
  userName: { fontSize: 16, fontWeight: '700', color: colors.text },
  userNim: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary },

  // Tombol masuk
  btnMasuk: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  btnMasukPressed: { backgroundColor: colors.primaryDark },
  btnDisabled: { backgroundColor: colors.border },
  btnMasukText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  btnDisabledText: { color: colors.textSecondary },

  // Modal
  modalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.55)' },
  bottomSheet: {
    backgroundColor: colors.card,
    padding: 24,
    paddingBottom: 32,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 20,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalAvatarText: { fontSize: 26, fontWeight: '800', color: colors.primaryDark },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  modalDesc: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  modalBold: { fontWeight: '700', color: colors.text },
  modalNim: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  btnCancelPressed: { backgroundColor: colors.primaryLight },
  btnCancelText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  btnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  btnConfirmText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
});
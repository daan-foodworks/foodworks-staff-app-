import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/auth-store';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';

export default function ProfielScreen() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top }}
    >
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mijn account</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/profiel/uren' as any)}
        >
          <Text style={styles.menuItemText}>Mijn uren</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/profiel/contracten' as any)}
        >
          <Text style={styles.menuItemText}>Mijn contracten</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Uitloggen</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 24,
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.white, fontFamily: 'Archivo_700Bold' },
  name: { fontSize: 22, fontWeight: '700', color: Colors.dark, fontFamily: 'Archivo_700Bold' },
  email: { fontSize: 14, color: Colors.gray600, marginTop: 4 },
  section: { backgroundColor: Colors.white, marginBottom: 16, paddingVertical: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: Colors.gray400,
    textTransform: 'uppercase', paddingHorizontal: 16, paddingVertical: 8,
    fontFamily: 'Archivo_600SemiBold',
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuItemText: { fontSize: 16, color: Colors.dark },
  chevron: { fontSize: 20, color: Colors.gray400 },
  divider: { height: 1, backgroundColor: Colors.gray100, marginHorizontal: 16 },
  logoutButton: {
    marginHorizontal: 16, marginVertical: 8, padding: 16,
    backgroundColor: '#FEE2E2', borderRadius: 12, alignItems: 'center',
  },
  logoutText: { color: '#991B1B', fontSize: 16, fontWeight: '600' },
});

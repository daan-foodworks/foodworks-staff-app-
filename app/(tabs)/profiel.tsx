import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '@/lib/auth-store';
import { useQuery } from '@tanstack/react-query';
import { hrApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';

export default function ProfielScreen() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const { data: contract } = useQuery({
    queryKey: ['my-contract'],
    queryFn: () => hrApi.getMyContract().then(r => r.data),
    enabled: !!user,
  });

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.container}>
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
      </View>

      {contract && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mijn contract</Text>
          <View style={styles.contractCard}>
            <Text style={styles.contractItem}>Type: {contract.type}</Text>
            {contract.hoursPerWeek && (
              <Text style={styles.contractItem}>{contract.hoursPerWeek} uur per week</Text>
            )}
            {contract.endDate && (
              <Text style={styles.contractItem}>
                Loopt af: {new Date(contract.endDate).toLocaleDateString('nl-NL')}
              </Text>
            )}
          </View>
        </View>
      )}

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
  profileHeader: { alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: Colors.white, marginBottom: 16 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.white },
  name: { fontSize: 22, fontWeight: '700', color: Colors.dark },
  email: { fontSize: 14, color: Colors.gray600, marginTop: 4 },
  section: { backgroundColor: Colors.white, marginBottom: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: Colors.gray400, textTransform: 'uppercase', paddingHorizontal: 16, paddingVertical: 8 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  menuItemText: { fontSize: 16, color: Colors.dark },
  chevron: { fontSize: 20, color: Colors.gray400 },
  contractCard: { paddingHorizontal: 16, paddingBottom: 12 },
  contractItem: { fontSize: 14, color: Colors.gray800, paddingVertical: 4 },
  logoutButton: { marginHorizontal: 16, marginVertical: 8, padding: 16, backgroundColor: '#FEE2E2', borderRadius: 12, alignItems: 'center' },
  logoutText: { color: '#991B1B', fontSize: 16, fontWeight: '600' },
});

import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { timeEntriesApi } from '@/lib/api';

function initials(name: string | undefined) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function ProfielScreen() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: myEntries } = useQuery({
    queryKey: ['my-time-entries'],
    queryFn: () => timeEntriesApi.getMyEntries().then(r => r.data),
  });

  const completedEntries = (myEntries ?? []).filter((e: any) =>
    e.status === 'APPROVED' || e.status === 'PAID'
  );
  const totalShifts = completedEntries.length;
  const totalHours = Math.round(
    completedEntries.reduce((sum: number, e: any) => sum + (e.declaredHours ?? 0), 0)
  );

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}
    >
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.name)}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>Medewerker</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCell}>
          <Text style={styles.statNum}>{totalShifts}</Text>
          <Text style={styles.statLabel}>Diensten</Text>
        </View>
        <View style={[styles.statCell, styles.statCellBorder]}>
          <Text style={styles.statNum}>{totalHours}</Text>
          <Text style={styles.statLabel}>Uren</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statNum}>—</Text>
          <Text style={styles.statLabel}>Score</Text>
        </View>
      </View>

      {/* Account menu */}
      <Text style={styles.sectionEyebrow}>Account</Text>
      <View style={styles.menuList}>
        <MenuRow
          icon="time-outline"
          label="Mijn uren"
          onPress={() => router.push('/profiel/uren' as any)}
        />
        <View style={styles.menuDivider} />
        <MenuRow
          icon="document-text-outline"
          label="Mijn contracten"
          onPress={() => router.push('/profiel/contracten' as any)}
        />
      </View>

      {/* App menu */}
      <Text style={styles.sectionEyebrow}>App</Text>
      <View style={styles.menuList}>
        <MenuRow icon="notifications-outline" label="Notificaties" onPress={() => {}} disabled />
        <View style={styles.menuDivider} />
        <MenuRow icon="settings-outline" label="Instellingen" onPress={() => {}} disabled />
        <View style={styles.menuDivider} />
        <MenuRow icon="help-circle-outline" label="Help & support" onPress={() => {}} disabled />
      </View>

      {/* Logout ghost button */}
      <View style={styles.logoutWrap}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={Colors.coral} />
          <Text style={styles.logoutText}>Uitloggen</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MenuRow({ icon, label, onPress, disabled }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={18} color={Colors.coral} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  avatar: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: Colors.coral,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 6,
  },
  avatarText: { fontSize: 34, fontWeight: '700', color: Colors.white, fontFamily: 'Archivo_700Bold', letterSpacing: -1 },
  name: { fontSize: 22, fontWeight: '700', color: Colors.dark, fontFamily: 'Archivo_700Bold', letterSpacing: -0.5 },
  role: { fontSize: 14, color: Colors.muted, marginTop: 2 },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#140E0A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  statCell: { flex: 1, paddingVertical: 18, paddingHorizontal: 8, alignItems: 'center' },
  statCellBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.line },
  statNum: { fontSize: 22, fontWeight: '700', color: Colors.coral, fontFamily: 'Archivo_700Bold', letterSpacing: -0.5 },
  statLabel: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Section eyebrow
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
  },

  // Menu list
  menuList: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#140E0A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.coralSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.dark },
  menuDivider: { height: 1, backgroundColor: Colors.line, marginLeft: 66 },

  // Logout
  logoutWrap: { paddingHorizontal: 16, paddingTop: 8 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.coral,
    borderRadius: 14,
    paddingVertical: 14,
  },
  logoutText: { color: Colors.coral, fontSize: 15, fontWeight: '600' },
});

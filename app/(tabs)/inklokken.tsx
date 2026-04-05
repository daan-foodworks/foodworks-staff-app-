import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { timeEntriesApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';
import { differenceInMinutes } from 'date-fns';
import { format } from 'date-fns';

export default function InklokkenScreen() {
  const router = useRouter();
  const { data: myEntries, isLoading } = useQuery({
    queryKey: ['my-time-entries'],
    queryFn: () => timeEntriesApi.getMyEntries().then(r => r.data),
    refetchInterval: 30000,
  });

  const activeEntry = myEntries?.find((e: any) => e.clockInAt && !e.clockOutAt);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (!activeEntry) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.clockIcon}>⏱</Text>
          <Text style={styles.emptyTitle}>Niet ingeklokt</Text>
          <Text style={styles.emptyText}>Je bent momenteel niet ingeklokt</Text>
        </View>
        <TouchableOpacity
          style={styles.goToRoosterButton}
          onPress={() => router.push('/(tabs)/rooster')}
        >
          <Text style={styles.goToRoosterText}>Bekijk mijn rooster</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const clockInTime = new Date(activeEntry.clockInAt);
  const minutesWorked = differenceInMinutes(new Date(), clockInTime);
  const hoursWorked = Math.floor(minutesWorked / 60);
  const minsWorked = minutesWorked % 60;

  return (
    <View style={styles.container}>
      <View style={styles.activeCard}>
        <View style={styles.statusDot} />
        <Text style={styles.activeTitle}>Ingeklokt</Text>
        <Text style={styles.clockTime}>{format(clockInTime, 'HH:mm')}</Text>
        <Text style={styles.elapsed}>{hoursWorked}u {minsWorked}m geleden</Text>
        {activeEntry.shift && (
          <Text style={styles.shiftName}>{activeEntry.shift.title}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.clockOutButton}
        onPress={() => router.push(`/shift/${activeEntry.shiftId}/uitklokken` as any)}
      >
        <Text style={styles.clockOutText}>Uitklokken</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  clockIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: Colors.dark },
  emptyText: { fontSize: 16, color: Colors.gray600, marginTop: 8, textAlign: 'center' },
  goToRoosterButton: { padding: 16, alignItems: 'center' },
  goToRoosterText: { color: Colors.accent, fontSize: 16, fontWeight: '600' },
  activeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statusDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.teal,
    marginBottom: 12,
  },
  activeTitle: { fontSize: 16, color: Colors.gray600, marginBottom: 4 },
  clockTime: { fontSize: 48, fontWeight: '700', color: Colors.dark },
  elapsed: { fontSize: 16, color: Colors.gray600, marginTop: 8 },
  shiftName: { fontSize: 16, fontWeight: '600', color: Colors.dark, marginTop: 12 },
  clockOutButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  clockOutText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});

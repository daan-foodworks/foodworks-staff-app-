import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { shiftsApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

function ShiftStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    ACCEPTED: { label: 'Bevestigd', bg: Colors.teal, text: Colors.dark },
    PENDING: { label: 'Uitgenodigd', bg: '#FEF3C7', text: '#92400E' },
    DRAFT: { label: 'Concept', bg: Colors.gray100, text: Colors.gray600 },
    OPEN: { label: 'Open', bg: '#DBEAFE', text: '#1E40AF' },
  };
  const conf = config[status] || { label: status, bg: Colors.gray100, text: Colors.gray600 };
  return (
    <View style={[styles.badge, { backgroundColor: conf.bg }]}>
      <Text style={[styles.badgeText, { color: conf.text }]}>{conf.label}</Text>
    </View>
  );
}

function TimeEntryStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const config: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Niet ingediend', color: Colors.accent },
    SUBMITTED: { label: 'Wacht op goedkeuring', color: '#3B82F6' },
    APPROVED: { label: 'Goedgekeurd', color: Colors.teal },
    REJECTED: { label: 'Afgekeurd', color: '#EF4444' },
    PAID: { label: 'Uitbetaald', color: Colors.gray600 },
    MORE_INFO_NEEDED: { label: 'Meer info nodig', color: '#F59E0B' },
  };
  const conf = config[status] || { label: status, color: Colors.gray600 };
  return <Text style={[styles.timeStatus, { color: conf.color }]}>{conf.label}</Text>;
}

function ShiftCard({ shift, onPress }: { shift: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.shiftTitle}>{shift.title}</Text>
        <ShiftStatusBadge status={shift.status || shift.invitationStatus} />
      </View>
      {shift.locationAddress && (
        <Text style={styles.location}>{shift.locationAddress}</Text>
      )}
      <Text style={styles.time}>
        {format(new Date(shift.startTime), 'dd MMM · HH:mm', { locale: nl })} – {format(new Date(shift.endTime), 'HH:mm', { locale: nl })}
      </Text>
      {shift.shiftRole && (
        <Text style={styles.role}>{shift.shiftRole.name}</Text>
      )}
      {shift.timeEntry && <TimeEntryStatusBadge status={shift.timeEntry.status} />}
    </TouchableOpacity>
  );
}

export default function RoosterScreen() {
  const router = useRouter();

  const { data: myShifts, isLoading: loadingMine, refetch: refetchMine } = useQuery({
    queryKey: ['my-shifts'],
    queryFn: () => shiftsApi.getMyShifts().then(r => r.data),
  });

  const { data: openShifts, isLoading: loadingOpen, refetch: refetchOpen } = useQuery({
    queryKey: ['open-shifts'],
    queryFn: () => shiftsApi.getOpenShifts().then(r => r.data),
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMine(), refetchOpen()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mijn Diensten</Text>
        {loadingMine ? (
          <Text style={styles.emptyText}>Laden...</Text>
        ) : !myShifts?.length ? (
          <Text style={styles.emptyText}>Geen diensten gepland — je ontvangt een melding zodra er een dienst voor je klaarstaat</Text>
        ) : (
          myShifts.map((shift: any) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onPress={() => router.push(`/shift/${shift.id}` as any)}
            />
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Open Diensten</Text>
        {loadingOpen ? (
          <Text style={styles.emptyText}>Laden...</Text>
        ) : !openShifts?.length ? (
          <Text style={styles.emptyText}>Geen open diensten op dit moment</Text>
        ) : (
          openShifts.map((shift: any) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onPress={() => router.push(`/shift/${shift.id}` as any)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark, marginBottom: 12 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  shiftTitle: { fontSize: 16, fontWeight: '600', color: Colors.dark, flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  location: { fontSize: 14, color: Colors.gray600, marginBottom: 4 },
  time: { fontSize: 14, color: Colors.gray800, marginBottom: 4 },
  role: { fontSize: 14, color: Colors.gray600 },
  timeStatus: { fontSize: 13, fontWeight: '500', marginTop: 8 },
  emptyText: { color: Colors.gray600, textAlign: 'center', padding: 24, lineHeight: 22 },
});

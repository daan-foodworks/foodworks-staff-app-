import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { shiftsApi, timeEntriesApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';
import { ShiftListItem, shiftListStyles } from '@/components/ShiftListItem';
import { format, differenceInMinutes } from 'date-fns';

export default function RoosterScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: myShifts, isLoading, refetch } = useQuery({
    queryKey: ['my-shifts'],
    queryFn: () => shiftsApi.getMyShifts().then(r => r.data),
  });

  const { data: myEntries, refetch: refetchEntries } = useQuery({
    queryKey: ['my-time-entries'],
    queryFn: () => timeEntriesApi.getMyEntries().then(r => r.data),
    refetchInterval: 30000,
  });

  const activeEntry = myEntries?.find((e: any) => e.clockInAt && !e.clockOutAt);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchEntries()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Actieve dienst banner */}
      {activeEntry && (
        <TouchableOpacity
          style={styles.activeBanner}
          onPress={() => router.push(`/shift/${activeEntry.shiftId}/uitklokken` as any)}
        >
          <View style={styles.activeBannerDot} />
          <View style={styles.activeBannerText}>
            <Text style={styles.activeBannerTitle}>Ingeklokt om {format(new Date(activeEntry.clockInAt), 'HH:mm')}</Text>
            <Text style={styles.activeBannerSub}>
              {(() => {
                const mins = differenceInMinutes(new Date(), new Date(activeEntry.clockInAt));
                return `${Math.floor(mins / 60)}u ${mins % 60}m geleden`;
              })()}
            </Text>
          </View>
          <Text style={styles.activeBannerAction}>Uitklokken →</Text>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mijn Diensten</Text>
        <View style={shiftListStyles.listContainer}>
          {isLoading ? (
            <Text style={shiftListStyles.emptyText}>Laden...</Text>
          ) : !myShifts?.length ? (
            <Text style={shiftListStyles.emptyText}>
              Geen diensten gepland — je ontvangt een melding zodra er een dienst voor je klaarstaat
            </Text>
          ) : (
            myShifts.map((shift: any, index: number) => (
              <View key={shift.id}>
                <ShiftListItem
                  shift={shift}
                  onPress={() => router.push(`/shift/${shift.id}` as any)}
                />
                {index < myShifts.length - 1 && <View style={shiftListStyles.divider} />}
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  section: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 12,
    fontFamily: 'Archivo_700Bold',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.teal,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  activeBannerDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.white,
    opacity: 0.9,
  },
  activeBannerText: { flex: 1 },
  activeBannerTitle: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  activeBannerSub: { color: Colors.white, opacity: 0.85, fontSize: 13, marginTop: 2 },
  activeBannerAction: { color: Colors.white, fontWeight: '600', fontSize: 14 },
});

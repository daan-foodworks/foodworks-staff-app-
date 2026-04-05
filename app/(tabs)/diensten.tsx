import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { shiftsApi, invitationsApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';
import { ShiftListItem, shiftListStyles } from '@/components/ShiftListItem';

export default function DienstenScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: openShifts, isLoading, refetch: refetchShifts } = useQuery({
    queryKey: ['open-shifts'],
    queryFn: () => shiftsApi.getOpenShifts().then(r => r.data),
  });

  const { data: myInvitations, refetch: refetchInvitations } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: () => invitationsApi.getMyInvitations().then(r => r.data),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchShifts(), refetchInvitations()]);
    setRefreshing(false);
  };

  const requestedShiftIds = new Set(
    (myInvitations ?? [])
      .filter((inv: any) => inv.status === 'REQUESTED')
      .map((inv: any) => inv.shiftId)
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Open Diensten</Text>
        <View style={shiftListStyles.listContainer}>
          {isLoading ? (
            <Text style={shiftListStyles.emptyText}>Laden...</Text>
          ) : !openShifts?.length ? (
            <Text style={shiftListStyles.emptyText}>Geen open diensten op dit moment</Text>
          ) : (
            openShifts.map((shift: any, index: number) => (
              <View key={shift.id}>
                <ShiftListItem
                  shift={shift}
                  onPress={() => router.push(`/shift/${shift.id}` as any)}
                  isPendingRequest={requestedShiftIds.has(shift.id)}
                />
                {index < openShifts.length - 1 && <View style={shiftListStyles.divider} />}
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
});

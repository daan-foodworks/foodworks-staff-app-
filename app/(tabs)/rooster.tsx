import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi, timeEntriesApi, invitationsApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';
import { ShiftListItem, shiftListStyles } from '@/components/ShiftListItem';
import { format, differenceInMinutes } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function RoosterScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const { data: myInvitations, refetch: refetchInvitations } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: () => invitationsApi.getMyInvitations().then((r: any) => r.data),
  });

  const pendingInvitations = myInvitations?.filter((inv: any) => inv.status === 'PENDING') || [];

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACCEPTED' | 'DECLINED' }) =>
      invitationsApi.respond(id, status),
    onSuccess: (_data, variables) => {
      if (variables.status === 'ACCEPTED') {
        queryClient.invalidateQueries({ queryKey: ['my-shifts'] });
      }
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
    },
    onError: (error) => {
      console.error('Fout bij beantwoorden uitnodiging:', error);
    },
  });

  const activeEntry = myEntries?.find((e: any) => e.clockInAt && !e.clockOutAt);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchEntries(), refetchInvitations()]);
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

      {pendingInvitations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.invitationHeader}>
            <Text style={styles.sectionTitle}>Uitnodigingen</Text>
            <View style={styles.invitationBadge}>
              <Text style={styles.invitationBadgeText}>
                {pendingInvitations.length} nieuwe uitnodiging{pendingInvitations.length !== 1 ? 'en' : ''}
              </Text>
            </View>
          </View>
          <View style={shiftListStyles.listContainer}>
            {pendingInvitations.map((inv: any, index: number) => (
              <View key={inv.id}>
                <TouchableOpacity activeOpacity={0.85} style={styles.invitationCard}>
                  <View style={styles.invitationInfo}>
                    <Text style={styles.invitationTitle}>{inv.shift?.title || 'Dienst'}</Text>
                    <Text style={styles.invitationDate}>
                      {inv.shift?.startTime
                        ? format(new Date(inv.shift.startTime), 'd MMM yyyy - HH:mm', { locale: nl })
                        : '—'}
                    </Text>
                    {inv.shift?.location?.name ? (
                      <Text style={styles.invitationLocation}>{inv.shift.location.name}</Text>
                    ) : null}
                  </View>
                  <View style={styles.invitationActions}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => respondMutation.mutate({ id: inv.id, status: 'ACCEPTED' })}
                      disabled={respondMutation.isPending}
                    >
                      <Text style={styles.acceptButtonText}>Accepteren</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineButton}
                      onPress={() => respondMutation.mutate({ id: inv.id, status: 'DECLINED' })}
                      disabled={respondMutation.isPending}
                    >
                      <Text style={styles.declineButtonText}>Weigeren</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                {index < pendingInvitations.length - 1 && <View style={shiftListStyles.divider} />}
              </View>
            ))}
          </View>
        </View>
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

  // Uitnodigingen
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  invitationBadge: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  invitationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  invitationCard: {
    backgroundColor: '#FFFBF0',
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  invitationInfo: {
    gap: 3,
  },
  invitationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    fontFamily: 'Archivo_700Bold',
  },
  invitationDate: {
    fontSize: 13,
    color: Colors.muted,
  },
  invitationLocation: {
    fontSize: 13,
    color: Colors.muted,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  declineButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  declineButtonText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
});

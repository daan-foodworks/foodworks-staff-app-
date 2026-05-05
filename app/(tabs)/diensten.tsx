import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi, invitationsApi, hrApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function DienstenScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: openShifts, isLoading, refetch: refetchShifts } = useQuery({
    queryKey: ['open-shifts'],
    queryFn: () => shiftsApi.getOpenShifts().then(r => r.data),
  });

  const { data: myInvitations, refetch: refetchInvitations } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: () => invitationsApi.getMyInvitations().then(r => r.data),
  });

  const { data: myContract } = useQuery({
    queryKey: ['my-contract'],
    queryFn: () => hrApi.getMyContract().then(r => r.data).catch(() => null),
  });

  const isFreelancer = myContract?.type === 'FREELANCE';
  const hourlyRate = myContract?.hourlyRate;

  const requestMutation = useMutation({
    mutationFn: (shiftId: string) => shiftsApi.requestShift(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] });
    },
    onError: () => Alert.alert('Aanmelden mislukt', 'Probeer het opnieuw.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (invitationId: string) => invitationsApi.respond(invitationId, 'DECLINED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] });
    },
    onError: () => Alert.alert('Afmelden mislukt', 'Probeer het opnieuw.'),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchShifts(), refetchInvitations()]);
    setRefreshing(false);
  };

  const requestedInvByShift = new Map<string, string>(
    (myInvitations ?? [])
      .filter((inv: any) => inv.status === 'REQUESTED')
      .map((inv: any) => [inv.shiftId, inv.id])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.coral} />}
    >
      <Text style={styles.title}>Open Diensten</Text>
      <Text style={styles.subtitle}>
        Diensten die nog ingevuld moeten worden. Tik om je in te schrijven.
      </Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.coral} style={{ marginVertical: 32 }} />
      ) : !openShifts?.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Geen open diensten op dit moment</Text>
        </View>
      ) : (
        openShifts.map((shift: any) => {
          const invitationId = requestedInvByShift.get(shift.id);
          const isRequested = !!invitationId;
          return (
            <JobCard
              key={shift.id}
              shift={shift}
              isRequested={isRequested}
              showRate={isFreelancer}
              hourlyRate={hourlyRate}
              onApply={() => requestMutation.mutate(shift.id)}
              onCancel={() => {
                if (!invitationId) return;
                Alert.alert(
                  'Afmelden',
                  'Weet je zeker dat je je wilt afmelden voor deze dienst?',
                  [
                    { text: 'Nee', style: 'cancel' },
                    { text: 'Ja, afmelden', style: 'destructive', onPress: () => cancelMutation.mutate(invitationId) },
                  ]
                );
              }}
              busy={requestMutation.isPending || cancelMutation.isPending}
            />
          );
        })
      )}
    </ScrollView>
  );
}

function JobCard({ shift, isRequested, showRate, hourlyRate, onApply, onCancel, busy }: {
  shift: any;
  isRequested: boolean;
  showRate: boolean;
  hourlyRate: number | null | undefined;
  onApply: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const startDate = new Date(shift.startTime);
  const role = shift.shiftRole?.name ?? shift.title ?? 'Dienst';
  const projectName = shift.project?.title ?? role;
  const location = shift.locationAddress || shift.project?.eventLocation || shift.project?.location?.address;
  const dateStr = format(startDate, 'EEE d MMM', { locale: nl });
  const timeStr = format(startDate, 'HH:mm');
  const showRateChip = showRate && hourlyRate != null;
  const formattedRate = hourlyRate != null
    ? `€ ${hourlyRate.toFixed(2).replace('.', ',')} / uur`
    : null;

  return (
    <View style={styles.jobCard}>
      <View style={styles.jobTag}>
        <Text style={styles.jobTagText}>FESTIVAL</Text>
      </View>

      <Text style={styles.jobTitle}>{projectName}</Text>

      {location ? (
        <View style={styles.jobRow}>
          <Ionicons name="location-outline" size={15} color={Colors.muted} />
          <Text style={styles.jobRowText} numberOfLines={2}>{location}</Text>
        </View>
      ) : null}

      <View style={styles.jobRow}>
        <Ionicons name="calendar-outline" size={15} color={Colors.muted} />
        <Text style={styles.jobRowText}>{dateStr} – {timeStr}</Text>
      </View>

      <View style={styles.jobRow}>
        <Ionicons name="briefcase-outline" size={15} color={Colors.muted} />
        <Text style={styles.jobRowText}>
          {role}
          {shift.maxEmployees ? ` · ${shift.maxEmployees}  plek${shift.maxEmployees > 1 ? 'ken' : ''}` : ''}
        </Text>
      </View>

      <View style={styles.jobFooter}>
        {showRateChip ? (
          <View style={styles.jobPay}>
            <Text style={styles.jobPayText}>{formattedRate}</Text>
          </View>
        ) : (
          <View />
        )}
        {isRequested ? (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelBtnText}>Afmelden</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={onApply}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={styles.applyBtnText}>Inschrijven</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark,
    fontFamily: 'Archivo_700Bold',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.muted,
    paddingHorizontal: 24,
    paddingBottom: 16,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#140E0A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  emptyText: { color: Colors.muted, fontSize: 14 },
  jobCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#140E0A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  jobTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
    backgroundColor: Colors.pendingSoft,
  },
  jobTagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#B47028',
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark,
    fontFamily: 'Archivo_700Bold',
    letterSpacing: -0.5,
    lineHeight: 26,
    marginBottom: 8,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  jobRowText: {
    fontSize: 15,
    color: Colors.ink2,
    flex: 1,
    fontWeight: '400',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    minHeight: 44,
  },
  jobPay: {
    backgroundColor: '#F4F1EE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  jobPayText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.coral,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 999,
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.coral,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
  },
  cancelBtnText: {
    color: Colors.coral,
    fontSize: 14,
    fontWeight: '600',
  },
});

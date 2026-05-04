import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi, invitationsApi } from '@/lib/api';
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

  const requestMutation = useMutation({
    mutationFn: (shiftId: string) => shiftsApi.requestShift(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] });
    },
    onError: () => Alert.alert('Aanmelden mislukt', 'Probeer het opnieuw.'),
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
          const isRequested = requestedShiftIds.has(shift.id);
          const startDate = new Date(shift.startTime);
          const isUrgent = (startDate.getTime() - Date.now()) < 1000 * 60 * 60 * 48;
          return (
            <JobCard
              key={shift.id}
              shift={shift}
              isUrgent={isUrgent}
              isRequested={isRequested}
              onApply={() => requestMutation.mutate(shift.id)}
              applying={requestMutation.isPending}
            />
          );
        })
      )}
    </ScrollView>
  );
}

function JobCard({ shift, isUrgent, isRequested, onApply, applying }: {
  shift: any;
  isUrgent: boolean;
  isRequested: boolean;
  onApply: () => void;
  applying: boolean;
}) {
  const startDate = new Date(shift.startTime);
  const endDate = new Date(shift.endTime);
  const role = shift.shiftRole?.name ?? shift.title ?? 'Dienst';
  const projectName = shift.project?.title;
  const location = shift.locationAddress || shift.project?.eventLocation || shift.project?.location?.address;
  const dateStr = format(startDate, 'EEE d MMM', { locale: nl });
  const timeStr = `${format(startDate, 'HH:mm')} – ${format(endDate, 'HH:mm')}`;
  const tag = isUrgent ? 'Spoed' : (projectName ? 'Festival' : 'Dienst');

  return (
    <View style={styles.jobCard}>
      <View style={[styles.jobTag, isUrgent && styles.jobTagUrgent]}>
        <Text style={[styles.jobTagText, isUrgent && styles.jobTagTextUrgent]}>{tag}</Text>
      </View>

      <Text style={styles.jobTitle}>{projectName ?? role}</Text>
      {projectName && <Text style={styles.jobRole}>{role}</Text>}

      {location ? (
        <View style={styles.jobRow}>
          <Ionicons name="location-outline" size={14} color={Colors.muted} />
          <Text style={styles.jobRowText} numberOfLines={1}>{location}</Text>
        </View>
      ) : null}

      <View style={styles.jobRow}>
        <Ionicons name="calendar-outline" size={14} color={Colors.muted} />
        <Text style={styles.jobRowText}>{dateStr} · {timeStr}</Text>
      </View>

      {shift.maxEmployees ? (
        <View style={styles.jobRow}>
          <Ionicons name="briefcase-outline" size={14} color={Colors.muted} />
          <Text style={styles.jobRowText}>
            {shift.maxEmployees} plek{shift.maxEmployees > 1 ? 'ken' : ''}
          </Text>
        </View>
      ) : null}

      <View style={styles.jobFooter}>
        <View style={styles.jobPay}>
          <Text style={styles.jobPayText}>{role}</Text>
        </View>
        <TouchableOpacity
          style={[styles.applyBtn, isRequested && styles.applyBtnApplied]}
          onPress={onApply}
          disabled={isRequested || applying}
          activeOpacity={0.85}
        >
          {isRequested ? (
            <>
              <Ionicons name="checkmark" size={14} color={Colors.success} />
              <Text style={[styles.applyBtnText, styles.applyBtnAppliedText]}>Aangemeld</Text>
            </>
          ) : (
            <Text style={styles.applyBtnText}>Inschrijven</Text>
          )}
        </TouchableOpacity>
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
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#140E0A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  jobTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.coralSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  jobTagUrgent: { backgroundColor: Colors.pendingSoft },
  jobTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.coralDeep,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  jobTagTextUrgent: { color: '#B47028' },
  jobTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
    fontFamily: 'Archivo_700Bold',
    letterSpacing: -0.3,
  },
  jobRole: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 2,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  jobRowText: {
    fontSize: 13,
    color: Colors.ink2,
    flex: 1,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  jobPay: {
    backgroundColor: '#F4F1EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  jobPayText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.coral,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  applyBtnApplied: { backgroundColor: Colors.successSoft },
  applyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtnAppliedText: { color: Colors.success },
});

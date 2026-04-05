import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi, invitationsApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { data: shift, isLoading } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => shiftsApi.getShift(id).then(r => r.data),
  });

  const { data: myInvitations } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: () => invitationsApi.getMyInvitations().then(r => r.data),
  });

  const requestMutation = useMutation({
    mutationFn: () => shiftsApi.requestShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['my-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['shift', id] });
      setShowSuccessModal(true);
    },
    onError: () => {
      Alert.alert(
        'Aanmelding mislukt',
        'Er is iets misgegaan bij het versturen van je aanmelding. Probeer het opnieuw.',
        [{ text: 'Sluiten' }]
      );
    },
  });

  const respondMutation = useMutation({
    mutationFn: (status: 'ACCEPTED' | 'DECLINED') =>
      invitationsApi.respond(shift?.invitation?.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift', id] });
      queryClient.invalidateQueries({ queryKey: ['my-shifts'] });
    },
  });

  if (isLoading || !shift) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.accent} /></View>;
  }

  const today = new Date();
  const shiftDate = new Date(shift.startTime);
  const isToday = today.toDateString() === shiftDate.toDateString();
  const canClockIn = isToday && shift.invitation?.status === 'ACCEPTED';

  // Check of er een REQUESTED invitation bestaat voor deze shift via de my-invitations lijst
  const pendingInvitation = myInvitations?.find(
    (inv: any) => inv.shiftId === shift.id && inv.status === 'REQUESTED'
  );
  // Fallback: de shift zelf kan ook een invitation object bevatten
  const hasRequestedStatus =
    pendingInvitation != null || shift.invitation?.status === 'REQUESTED';

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Terug</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.date}>
          {format(shiftDate, 'EEEE d MMMM', { locale: nl })}
        </Text>
        <Text style={styles.time}>
          {format(new Date(shift.startTime), 'HH:mm')} – {format(new Date(shift.endTime), 'HH:mm')}
        </Text>
        <Text style={styles.title}>{shift.title}</Text>
        {shift.locationAddress && <Text style={styles.location}>{shift.locationAddress}</Text>}
        {shift.shiftRole && <Text style={styles.role}>{shift.shiftRole.name}</Text>}
      </View>

      {shift.project?.briefing?.customSections?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROJECTBRIEFING</Text>
          {shift.project.briefing.customSections.map((section: any, i: number) => (
            <View key={i} style={styles.briefingItem}>
              <Text style={styles.briefingLabel}>{section.title}</Text>
              <Text style={styles.briefingText}>{section.content}</Text>
            </View>
          ))}
        </View>
      )}

      {shift.workflows?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DIENST-INSTRUCTIES</Text>
          {shift.workflows.map((wf: any, i: number) => (
            <View key={wf.id} style={styles.workflowItem}>
              <Text style={styles.workflowTitle}>{i + 1}. {wf.title}</Text>
              <Text style={styles.workflowContent}>{wf.content}</Text>
            </View>
          ))}
        </View>
      )}

      {shift.vehicleDayAssignment && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RIT DETAILS</Text>
          <Text style={styles.vehicleText}>
            Voertuig: {shift.vehicleDayAssignment.vehicle?.licensePlate || 'onbekend'}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {shift.invitation?.status === 'PENDING' && (
          <View style={styles.inviteButtons}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={() => respondMutation.mutate('ACCEPTED')}
              disabled={respondMutation.isPending}
            >
              <Text style={styles.buttonText}>Accepteren</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={() => respondMutation.mutate('DECLINED')}
              disabled={respondMutation.isPending}
            >
              <Text style={[styles.buttonText, { color: Colors.dark }]}>Weigeren</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasRequestedStatus && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerIcon}>Aanmelding in behandeling</Text>
            <Text style={styles.pendingBannerText}>
              Je aanmelding wordt beoordeeld door de planner
            </Text>
          </View>
        )}

        {canClockIn && (
          <TouchableOpacity
            style={[styles.button, styles.clockInButton]}
            onPress={() => router.push(`/shift/${id}/inklokken` as any)}
          >
            <Text style={styles.buttonText}>Inklokken</Text>
          </TouchableOpacity>
        )}

        {!shift.invitation && !hasRequestedStatus && shift.status === 'OPEN' && (
          <TouchableOpacity
            style={[styles.button, styles.requestButton]}
            onPress={() => requestMutation.mutate()}
            disabled={requestMutation.isPending}
          >
            {requestMutation.isPending ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.buttonText}>Ik wil deze dienst!</Text>
            )}
          </TouchableOpacity>
        )}

        {shift.timeEntry?.clockOutAt && (
          <TouchableOpacity
            style={[styles.button, styles.declareButton]}
            onPress={() => router.push(`/shift/${id}/declareren` as any)}
          >
            <Text style={styles.buttonText}>Uren declareren</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>Aanmelding verzonden!</Text>
            <Text style={styles.modalText}>
              Je aanmelding is doorgestuurd naar de planner. Je ontvangt een bericht zodra je aanmelding bevestigd of geweigerd is.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.modalButton]}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/(tabs)/diensten' as any);
              }}
            >
              <Text style={styles.buttonText}>Terug naar diensten</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { padding: 16, paddingTop: 60 },
  backText: { color: Colors.accent, fontSize: 16 },
  header: { padding: 16, backgroundColor: Colors.white, marginBottom: 8 },
  date: { fontSize: 14, color: Colors.gray600, marginBottom: 4 },
  time: { fontSize: 22, fontWeight: '700', color: Colors.dark },
  title: { fontSize: 18, fontWeight: '600', color: Colors.dark, marginTop: 4 },
  location: { fontSize: 14, color: Colors.gray600, marginTop: 8 },
  role: { fontSize: 14, color: Colors.gray600, marginTop: 4 },
  section: { backgroundColor: Colors.white, margin: 8, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.gray400, textTransform: 'uppercase', marginBottom: 12 },
  briefingItem: { marginBottom: 8 },
  briefingLabel: { fontSize: 14, fontWeight: '600', color: Colors.dark },
  briefingText: { fontSize: 14, color: Colors.gray600, marginTop: 2 },
  workflowItem: { marginBottom: 12 },
  workflowTitle: { fontSize: 14, fontWeight: '600', color: Colors.dark },
  workflowContent: { fontSize: 14, color: Colors.gray600, marginTop: 4 },
  vehicleText: { fontSize: 14, color: Colors.gray800 },
  actions: { padding: 16, gap: 12 },
  inviteButtons: { flexDirection: 'row', gap: 12 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center', flex: 1 },
  acceptButton: { backgroundColor: Colors.teal },
  declineButton: { backgroundColor: Colors.gray100 },
  clockInButton: { backgroundColor: Colors.accent },
  requestButton: { backgroundColor: Colors.accent },
  declareButton: { backgroundColor: Colors.primary },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  pendingBanner: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    gap: 4,
  },
  pendingBannerIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  pendingBannerText: {
    fontSize: 13,
    color: '#92400E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalIcon: {
    fontSize: 32,
    color: Colors.white,
    fontWeight: '700',
    lineHeight: 36,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  modalButton: {
    backgroundColor: Colors.accent,
    width: '100%',
    flex: 0,
  },
});

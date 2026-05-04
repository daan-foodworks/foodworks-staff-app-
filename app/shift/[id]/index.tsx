import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, Linking, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi, invitationsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Colors } from '@/lib/colors';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

type Tab = 'workflow' | 'details' | 'team';

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { user: me } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { data: shift, isLoading } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => shiftsApi.getShift(id).then(r => r.data),
  });

  const { data: myInvitations } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: () => invitationsApi.getMyInvitations().then(r => r.data),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['shift-team', id],
    queryFn: () => shiftsApi.getShiftTeam(id).then(r => r.data),
    enabled: !!shift,
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
      Alert.alert('Aanmelding mislukt', 'Er is iets misgegaan. Probeer het opnieuw.', [{ text: 'Sluiten' }]);
    },
  });

  const respondMutation = useMutation({
    mutationFn: (status: 'ACCEPTED' | 'DECLINED') =>
      invitationsApi.respond(shift?.invitation?.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift', id] });
      queryClient.invalidateQueries({ queryKey: ['my-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
    },
  });

  if (isLoading || !shift) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.accent} /></View>;
  }

  const shiftDate = new Date(shift.startTime);
  const today = new Date();
  const isToday = today.toDateString() === shiftDate.toDateString();
  const canClockIn = isToday && shift.invitation?.status === 'ACCEPTED';

  const pendingInvitation = myInvitations?.find(
    (inv: any) => inv.shiftId === shift.id && inv.status === 'REQUESTED'
  );
  const hasRequestedStatus = pendingInvitation != null || shift.invitation?.status === 'REQUESTED';

  const locationAddr =
    shift.locationAddress ||
    shift.project?.eventLocation ||
    shift.project?.location?.address;

  const opdrachtgever =
    shift.project?.customer?.companyName ||
    shift.project?.customer?.name ||
    shift.project?.clientName ||
    'Street Nacho';

  const projectManager = shift.project?.projectManager?.name ?? 'Volgt';


  const headerTop = insets.top + (Platform.OS === 'ios' ? 8 : 16);

  // ── TAB CONTENT ───────────────────────────────────────────────────────────

  const renderDetails = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
      <DetailRow icon="business-outline" label="Opdrachtgever" value={opdrachtgever} />
      <View style={styles.divider} />

      <DetailRow
        icon="briefcase-outline"
        label="Project"
        value={shift.project?.title ?? '—'}
        sub={shift.shiftRole?.name}
      />
      <View style={styles.divider} />

      <DetailRow icon="pricetag-outline" label="Projectnummer" value={shift.project?.projectNumber ?? '—'} />
      <View style={styles.divider} />

      <DetailRow icon="person-outline" label="Projectmanager" value={projectManager} />
      <View style={styles.divider} />

      {/* Locatie — clickable row */}
      <TouchableOpacity
        style={styles.detailSection}
        onPress={() => locationAddr && Linking.openURL(`maps:?q=${encodeURIComponent(locationAddr)}`)}
        disabled={!locationAddr}
        activeOpacity={locationAddr ? 0.6 : 1}
      >
        <View style={styles.detailLabelRow}>
          <Ionicons name="location-outline" size={16} color={Colors.gray600} />
          <Text style={styles.detailLabel}>Locatie</Text>
          {locationAddr && (
            <View style={styles.detailRowAction}>
              <Text style={styles.detailRowActionText}>Open in Maps</Text>
              <Ionicons name="chevron-forward" size={16} color={ACCENT} />
            </View>
          )}
        </View>
        <Text style={styles.detailValue}>{locationAddr ?? '—'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const DetailRow = ({ icon, label, value, sub }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    sub?: string;
  }) => (
    <View style={styles.detailSection}>
      <View style={styles.detailLabelRow}>
        <Ionicons name={icon} size={16} color={Colors.gray600} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
      {sub ? <Text style={styles.detailSub}>{sub}</Text> : null}
    </View>
  );

  const renderWorkflow = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
      {shift.project?.briefing?.customSections?.length > 0 ? (
        <View style={styles.workflowSection}>
          <Text style={styles.workflowSectionTitle}>Projectbriefing</Text>
          {shift.project.briefing.customSections.map((section: any, i: number) => (
            <View key={i} style={styles.workflowItem}>
              <Text style={styles.workflowItemTitle}>{section.title}</Text>
              <Text style={styles.workflowItemText}>{section.content}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {shift.workflows?.length > 0 ? (
        <View style={styles.workflowSection}>
          <Text style={styles.workflowSectionTitle}>Dienst-instructies</Text>
          {shift.workflows.map((wf: any, i: number) => (
            <View key={wf.id} style={styles.workflowItem}>
              <Text style={styles.workflowItemTitle}>{i + 1}. {wf.title}</Text>
              <Text style={styles.workflowItemText}>{wf.content}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {!shift.project?.briefing?.customSections?.length && !shift.workflows?.length && (
        <View style={styles.emptyTab}>
          <Text style={styles.emptyTabText}>Geen instructies beschikbaar</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderTeam = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
      {teamMembers.length === 0 ? (
        <View style={styles.emptyTab}>
          <Text style={styles.emptyTabText}>Nog geen collega's bevestigd</Text>
        </View>
      ) : (
        <View style={styles.teamList}>
          <Text style={styles.teamIntro}>Je staat deze dag ingepland met:</Text>
          {teamMembers.map((member: any) => (
            <View key={member.id} style={styles.teamItem}>
              <View style={styles.teamAvatar}>
                <Text style={styles.teamAvatarText}>{initials(member.name ?? '?')}</Text>
              </View>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{member.name ?? 'Onbekend'}</Text>
                <Text style={styles.teamRole}>{member.shiftTitle ?? member.shiftRole}</Text>
                <Text style={styles.teamMeta}>
                  {format(new Date(member.startTime), 'HH:mm')} - {format(new Date(member.endTime), 'HH:mm')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  // ── BOTTOM ACTIONS ────────────────────────────────────────────────────────

  const renderBottomActions = () => {
    if (shift.invitation?.status === 'PENDING') {
      return (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => respondMutation.mutate('ACCEPTED')}
            disabled={respondMutation.isPending}
          >
            <Text style={styles.actionBtnText}>Accepteren</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn]}
            onPress={() => respondMutation.mutate('DECLINED')}
            disabled={respondMutation.isPending}
          >
            <Text style={[styles.actionBtnText, { color: Colors.dark }]}>Weigeren</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (hasRequestedStatus) {
      return (
        <View style={styles.bottomActions}>
          <View style={[styles.actionBtn, styles.pendingBtn]}>
            <Text style={[styles.actionBtnText, { color: '#92400E' }]}>Aanmelding in behandeling</Text>
          </View>
        </View>
      );
    }

    if (canClockIn) {
      return (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.clockInBtn]}
            onPress={() => router.push(`/shift/${id}/inklokken` as any)}
          >
            <Text style={styles.actionBtnText}>Inklokken</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!shift.invitation && !hasRequestedStatus && shift.status === 'OPEN') {
      return (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.requestBtn]}
            onPress={() => requestMutation.mutate()}
            disabled={requestMutation.isPending}
          >
            {requestMutation.isPending
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.actionBtnText}>Ik wil deze dienst!</Text>
            }
          </TouchableOpacity>
        </View>
      );
    }

    if (shift.timeEntry?.clockOutAt) {
      return (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.declareBtn]}
            onPress={() => router.push(`/shift/${id}/declareren` as any)}
          >
            <Text style={styles.actionBtnText}>Uren declareren</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (shift.invitation?.status === 'ACCEPTED') {
      return (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.uitschrijvenBtn]}
            onPress={() => {
              Alert.alert(
                'Uitschrijven',
                'Weet je zeker dat je je wilt uitschrijven voor deze dienst?',
                [
                  { text: 'Annuleren', style: 'cancel' },
                  {
                    text: 'Uitschrijven',
                    style: 'destructive',
                    onPress: () => respondMutation.mutate('DECLINED', {
                      onSuccess: () => router.replace('/(tabs)/rooster' as any),
                    }),
                  },
                ]
              );
            }}
          >
            <Text style={styles.actionBtnText}>Uitschrijven</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.screen}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: headerTop }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹  Mijn jobs</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{shift.title}</Text>

        <View style={styles.headerMetaRow}>
          <View style={styles.headerChip}>
            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.headerChipText}>
              {format(shiftDate, 'EEE d MMM', { locale: nl })}
            </Text>
          </View>
          <View style={styles.headerChip}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.headerChipText}>
              {format(new Date(shift.startTime), 'HH:mm')} – {format(new Date(shift.endTime), 'HH:mm')}
            </Text>
          </View>
        </View>

        {/* ── TABS ── */}
        <View style={styles.tabs}>
          {(['workflow', 'details', 'team'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── TAB CONTENT ── */}
      <View style={styles.content}>
        {activeTab === 'details' && renderDetails()}
        {activeTab === 'workflow' && renderWorkflow()}
        {activeTab === 'team' && renderTeam()}
      </View>

      {/* ── BOTTOM ACTIONS ── */}
      {renderBottomActions()}

      {/* ── SUCCESS MODAL ── */}
      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Text style={styles.modalIconText}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>Aanmelding verzonden!</Text>
            <Text style={styles.modalBody}>
              Je aanmelding is doorgestuurd naar de planner. Je ontvangt een bericht zodra je aanmelding bevestigd of geweigerd is.
            </Text>
            <TouchableOpacity
              style={[styles.actionBtn, styles.requestBtn, { flex: 0, width: '100%' }]}
              onPress={() => { setShowSuccessModal(false); router.replace('/(tabs)/diensten' as any); }}
            >
              <Text style={styles.actionBtnText}>Terug naar diensten</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const HEADER_BG = '#1A1A2E';
const ACCENT = '#6C63FF'; // purple accent matching screenshot

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  // Header
  header: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  backBtn: { paddingVertical: 8, marginBottom: 4 },
  backText: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 32,
    marginBottom: 10,
    fontFamily: 'Archivo_700Bold',
  },
  headerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
  },
  tabActive: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  tabTextActive: { color: '#fff' },

  // Content area
  content: { flex: 1, backgroundColor: Colors.background },

  // Details tab
  detailSection: { paddingHorizontal: 20, paddingVertical: 14 },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  detailLabel: { fontSize: 13, color: Colors.gray600, fontWeight: '600', flex: 1 },
  detailValue: { fontSize: 16, fontWeight: '700', color: Colors.dark, marginLeft: 24 },
  detailSub: { fontSize: 14, color: Colors.gray600, marginTop: 2, marginLeft: 24 },
  detailRowAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailRowActionText: { fontSize: 13, fontWeight: '600', color: ACCENT },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.gray200, marginHorizontal: 20 },

  // Workflow tab
  workflowSection: { padding: 20 },
  workflowSectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.gray400,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  workflowItem: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  workflowItemTitle: { fontSize: 14, fontWeight: '700', color: Colors.dark, marginBottom: 4 },
  workflowItemText: { fontSize: 14, color: Colors.gray600, lineHeight: 20 },

  // Team tab
  teamList: { padding: 20 },
  teamIntro: {
    fontSize: 14, color: Colors.gray400, marginBottom: 20,
  },
  teamItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray200,
  },
  teamAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.gray200, alignItems: 'center', justifyContent: 'center',
  },
  teamAvatarText: { color: Colors.gray600, fontWeight: '700', fontSize: 16 },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 16, fontWeight: '700', color: Colors.dark, marginBottom: 3 },
  teamRole: { fontSize: 14, color: Colors.gray600, marginBottom: 2 },
  teamMeta: { fontSize: 14, color: Colors.gray600 },

  // Empty state
  emptyTab: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyTabText: { fontSize: 15, color: Colors.gray400 },

  // Bottom actions
  bottomActions: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray200,
  },
  actionBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  acceptBtn: { backgroundColor: Colors.teal },
  declineBtn: { backgroundColor: Colors.gray100 },
  clockInBtn: { backgroundColor: Colors.accent },
  requestBtn: { backgroundColor: ACCENT },
  declareBtn: { backgroundColor: Colors.primary },
  uitschrijvenBtn: { backgroundColor: ACCENT },
  pendingBtn: { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#F59E0B' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 28,
    width: '100%', alignItems: 'center', gap: 12,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.teal, justifyContent: 'center', alignItems: 'center',
  },
  modalIconText: { fontSize: 32, color: Colors.white, fontWeight: '700', lineHeight: 36 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.dark, textAlign: 'center' },
  modalBody: { fontSize: 14, color: Colors.gray600, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
});

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/lib/colors';

const THUMB_GRADIENTS = [
  Colors.coral,
  '#6B7280',
  '#9B7BA0',
  '#5BA68F',
  '#E8A05D',
];

function thumbColor(seed?: string) {
  if (!seed) return THUMB_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return THUMB_GRADIENTS[Math.abs(hash) % THUMB_GRADIENTS.length];
}

export function ShiftThumbnail({ shift }: { shift: any }) {
  const seed = shift.project?.id ?? shift.id;
  const letter = (shift.project?.title ?? shift.title ?? '?').charAt(0).toUpperCase();
  return (
    <View style={[styles.thumbnail, { backgroundColor: thumbColor(seed) }]}>
      <Text style={styles.thumbnailInitial}>{letter}</Text>
    </View>
  );
}

const TIME_ENTRY_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT: { label: 'Declareren', bg: Colors.pendingSoft, color: '#B47028' },
  SUBMITTED: { label: 'In behandeling', bg: '#E3F2FD', color: '#1565C0' },
  MORE_INFO_NEEDED: { label: 'Info nodig', bg: Colors.pendingSoft, color: '#B47028' },
  APPROVED: { label: 'Goedgekeurd', bg: Colors.successSoft, color: Colors.success },
  REJECTED: { label: 'Afgekeurd', bg: '#FFEBEE', color: '#C62828' },
  PAID: { label: 'Uitbetaald', bg: '#F3E5F5', color: '#6A1B9A' },
};

export function ShiftListItem({
  shift,
  onPress,
  isPendingRequest = false,
  archived = false,
}: {
  shift: any;
  onPress: () => void;
  isPendingRequest?: boolean;
  archived?: boolean;
}) {
  const startDate = shift.startTime ? new Date(shift.startTime) : null;
  const dateMeta = startDate
    ? `${format(startDate, 'EEE d MMM', { locale: nl })} · ${format(startDate, 'HH:mm')}`
    : '';

  const role = shift.shiftRole?.name ?? shift.title ?? 'Dienst';
  const projectName = shift.project?.title;

  const timeEntryBadge = shift.timeEntry?.clockOutAt
    ? TIME_ENTRY_BADGES[shift.timeEntry.status]
    : null;

  return (
    <TouchableOpacity
      style={[styles.listItem, archived && styles.listItemArchived]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <ShiftThumbnail shift={shift} />
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle} numberOfLines={1}>{role}</Text>
        <Text style={styles.listItemMeta} numberOfLines={1}>{dateMeta}</Text>
        {projectName && (
          <Text style={styles.listItemSub} numberOfLines={1}>{projectName}</Text>
        )}
        {isPendingRequest && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Aanmelding in behandeling</Text>
          </View>
        )}
        {timeEntryBadge && (
          <View style={[styles.statusBadge, { backgroundColor: timeEntryBadge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: timeEntryBadge.color }]}>{timeEntryBadge.label}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
    </TouchableOpacity>
  );
}

export const shiftListStyles = StyleSheet.create({
  listContainer: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  divider: { height: 0 },
  emptyText: {
    color: Colors.muted,
    textAlign: 'center',
    padding: 24,
    lineHeight: 22,
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 0,
  },
});

const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#140E0A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  listItemArchived: { opacity: 0.55 },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  thumbnailInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.5,
    fontFamily: 'Archivo_700Bold',
  },
  listItemContent: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    fontFamily: 'Archivo_700Bold',
    letterSpacing: -0.3,
  },
  listItemMeta: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 2,
  },
  listItemSub: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 2,
  },
  pendingBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.pendingSoft,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B47028',
  },
  statusBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

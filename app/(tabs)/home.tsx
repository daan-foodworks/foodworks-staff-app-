import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ImageBackground, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { format, isToday, isTomorrow, differenceInHours } from 'date-fns';
import { nl } from 'date-fns/locale';
import { shiftsApi, invitationsApi, timeEntriesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Colors } from '@/lib/colors';

const FALLBACK_BANNER = 'https://cdn.regiobode.nl/sallandcentraal/uploads/2019/04/0141512_Dauwpop.jpg';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Goedemorgen,';
  if (hour < 18) return 'Goedemiddag,';
  return 'Goedenavond,';
}

function getShiftTimeLabel(startTime: string) {
  const date = new Date(startTime);
  if (isToday(date)) return `Vandaag · ${format(date, 'HH:mm')}`;
  if (isTomorrow(date)) return `Morgen · ${format(date, 'HH:mm')}`;
  return format(date, 'EEEE d MMM · HH:mm', { locale: nl });
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: myShifts, refetch: refetchShifts } = useQuery({
    queryKey: ['my-shifts'],
    queryFn: () => shiftsApi.getMyShifts().then(r => r.data),
  });

  const { data: myInvitations, refetch: refetchInvitations } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: () => invitationsApi.getMyInvitations().then((r: any) => r.data),
  });

  const { data: myEntries, refetch: refetchEntries } = useQuery({
    queryKey: ['my-time-entries'],
    queryFn: () => timeEntriesApi.getMyEntries().then(r => r.data),
    refetchInterval: 30000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchShifts(), refetchInvitations(), refetchEntries()]);
    setRefreshing(false);
  };

  const now = new Date();

  const upcomingShift = myShifts
    ?.filter((s: any) => new Date(s.startTime) >= now)
    ?.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  const activeEntry = myEntries?.find((e: any) => e.clockInAt && !e.clockOutAt);

  const actionItems: { id: string; label: string; sub: string; color: string; onPress: () => void }[] = [];

  if (activeEntry) {
    actionItems.push({
      id: 'active',
      label: 'Vergeet niet uit te klokken',
      sub: `Ingeklokt om ${format(new Date(activeEntry.clockInAt), 'HH:mm')}`,
      color: Colors.teal,
      onPress: () => router.push(`/shift/${activeEntry.shiftId}/uitklokken` as any),
    });
  }

  const pendingInvitations = myInvitations?.filter((inv: any) => inv.status === 'PENDING') ?? [];
  pendingInvitations.forEach((inv: any) => {
    actionItems.push({
      id: `inv-${inv.id}`,
      label: 'Dienst accepteren',
      sub: inv.shift?.title ?? 'Onbekende dienst',
      color: Colors.accent,
      onPress: () => router.push(`/shift/${inv.shiftId}` as any),
    });
  });

  const unclaimedShifts = myShifts?.filter((s: any) => {
    const ended = new Date(s.endTime) < now;
    const hasEntry = myEntries?.find((e: any) => e.shiftId === s.id && e.clockOutAt);
    const hoursAgo = differenceInHours(now, new Date(s.endTime));
    return ended && hasEntry && hoursAgo < 72;
  }) ?? [];
  unclaimedShifts.forEach((s: any) => {
    actionItems.push({
      id: `decl-${s.id}`,
      label: 'Uren declareren',
      sub: s.title,
      color: Colors.primary,
      onPress: () => router.push(`/shift/${s.id}/declareren` as any),
    });
  });

  const bannerUri = upcomingShift?.project?.imageUrl ?? FALLBACK_BANNER;
  const topPadding = insets.top + (Platform.OS === 'ios' ? 8 : 16);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      {/* Hero banner */}
      <ImageBackground source={{ uri: bannerUri }} style={styles.hero}>
        <View style={styles.heroOverlay} />

        {/* Greeting */}
        <View style={[styles.greetingBlock, { paddingTop: topPadding }]}>
          <Text style={styles.greetingTop}>{getGreeting()}</Text>
          <Text style={styles.greetingName}>{user?.name ?? 'daar'}</Text>
        </View>

        {/* Dienst info onderin banner */}
        <TouchableOpacity
          style={styles.shiftBlock}
          onPress={() => upcomingShift && router.push(`/shift/${upcomingShift.id}` as any)}
          activeOpacity={upcomingShift ? 0.85 : 1}
        >
          <Text style={styles.shiftLabel}>Eerstvolgende dienst</Text>
          <Text style={styles.shiftTitle}>
            {upcomingShift?.title ?? 'Geen geplande diensten'}
          </Text>
          {upcomingShift && (
            <View style={styles.shiftMeta}>
              <View style={styles.shiftBadge}>
                <Text style={styles.shiftBadgeText}>
                  {getShiftTimeLabel(upcomingShift.startTime)}
                </Text>
              </View>
              {upcomingShift.locationAddress ? (
                <Text style={styles.shiftLocation} numberOfLines={1}>
                  📍 {upcomingShift.locationAddress}
                </Text>
              ) : null}
            </View>
          )}
        </TouchableOpacity>
      </ImageBackground>

      {/* Actielijst */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Actielijst</Text>
        <View style={styles.actionList}>
          {actionItems.length > 0 ? actionItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.actionItem, index < actionItems.length - 1 && styles.actionItemBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.actionBar, { backgroundColor: item.color }]} />
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>{item.label}</Text>
                <Text style={styles.actionSub}>{item.sub}</Text>
              </View>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>
          )) : (
            <View style={styles.emptyAction}>
              <Text style={styles.emptyActionIcon}>✓</Text>
              <Text style={styles.emptyActionText}>Geen openstaande acties</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  hero: {
    height: 420,
    justifyContent: 'space-between',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },

  greetingBlock: {
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  greetingTop: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '400',
  },
  greetingName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Archivo_700Bold',
    marginTop: 2,
  },

  shiftBlock: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    gap: 6,
  },
  shiftLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  shiftTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Archivo_700Bold',
    lineHeight: 28,
  },
  shiftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  shiftBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  shiftBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  shiftLocation: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    flex: 1,
  },

  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  actionList: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    gap: 14,
  },
  actionItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray200,
  },
  actionBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginLeft: 16,
  },
  actionText: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  actionSub: { fontSize: 12, color: Colors.gray600, marginTop: 2 },
  actionChevron: { fontSize: 22, color: Colors.gray400, lineHeight: 26 },

  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
  },
  emptyActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.teal,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 14,
    fontWeight: '700',
    overflow: 'hidden',
  },
  emptyActionText: {
    fontSize: 14,
    color: Colors.gray600,
    fontWeight: '500',
  },
});

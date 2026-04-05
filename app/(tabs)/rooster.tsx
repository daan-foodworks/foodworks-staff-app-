import { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { shiftsApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

function ShiftThumbnail({ shift }: { shift: any }) {
  const imageUrl = shift.project?.imageUrl || shift.project?.image;
  const initial = (shift.title || '?').charAt(0).toUpperCase();

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
      <Text style={styles.thumbnailInitial}>{initial}</Text>
    </View>
  );
}

function ShiftListItem({ shift, onPress }: { shift: any; onPress: () => void }) {
  const formattedDate = shift.startTime
    ? format(new Date(shift.startTime), 'd MMMM yyyy - HH:mm', { locale: nl })
    : '';

  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.7}>
      <ShiftThumbnail shift={shift} />
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle} numberOfLines={1}>{shift.title}</Text>
        <Text style={styles.listItemDate} numberOfLines={1}>{formattedDate}</Text>
        {shift.shiftRole && (
          <Text style={styles.listItemRole} numberOfLines={1}>{shift.shiftRole.name}</Text>
        )}
      </View>
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
        <View style={styles.listContainer}>
          {loadingMine ? (
            <Text style={styles.emptyText}>Laden...</Text>
          ) : !myShifts?.length ? (
            <Text style={styles.emptyText}>Geen diensten gepland — je ontvangt een melding zodra er een dienst voor je klaarstaat</Text>
          ) : (
            myShifts.map((shift: any, index: number) => (
              <View key={shift.id}>
                <ShiftListItem
                  shift={shift}
                  onPress={() => router.push(`/shift/${shift.id}` as any)}
                />
                {index < myShifts.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Open Diensten</Text>
        <View style={styles.listContainer}>
          {loadingOpen ? (
            <Text style={styles.emptyText}>Laden...</Text>
          ) : !openShifts?.length ? (
            <Text style={styles.emptyText}>Geen open diensten op dit moment</Text>
          ) : (
            openShifts.map((shift: any, index: number) => (
              <View key={shift.id}>
                <ShiftListItem
                  shift={shift}
                  onPress={() => router.push(`/shift/${shift.id}` as any)}
                />
                {index < openShifts.length - 1 && <View style={styles.divider} />}
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
  listContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 14,
    flexShrink: 0,
  },
  thumbnailPlaceholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  listItemContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    fontFamily: 'Archivo_700Bold',
    marginBottom: 2,
  },
  listItemDate: {
    fontSize: 13,
    color: Colors.gray800,
    marginBottom: 2,
  },
  listItemRole: {
    fontSize: 13,
    color: Colors.gray600,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray200,
    marginLeft: 94,
  },
  emptyText: {
    color: Colors.gray600,
    textAlign: 'center',
    padding: 24,
    lineHeight: 22,
  },
});

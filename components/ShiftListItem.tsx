import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Colors } from '@/lib/colors';

export function ShiftThumbnail({ shift }: { shift: any }) {
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

export function ShiftListItem({ shift, onPress }: { shift: any; onPress: () => void }) {
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

export const shiftListStyles = StyleSheet.create({
  listContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
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

const styles = StyleSheet.create({
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
});

import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timeEntriesApi } from '@/lib/api';
import { getCurrentPosition, haversineDistance } from '@/lib/location';
import { Colors } from '@/lib/colors';

const CLOCK_OUT_WARNING_RADIUS = 500; // meters

export default function UitklokkenschermScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  const { data: myEntries } = useQuery({
    queryKey: ['my-time-entries'],
    queryFn: () => timeEntriesApi.getMyEntries().then(r => r.data),
  });

  const activeEntry = myEntries?.find((e: any) => e.shiftId === id && !e.clockOutAt);

  const clockOutMutation = useMutation({
    mutationFn: () => timeEntriesApi.clockOut(activeEntry?.id, position?.lat, position?.lng),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-time-entries'] });
      router.replace(`/shift/${id}/declareren` as any);
    },
  });

  const handleClockOut = async () => {
    setLoading(true);
    const pos = await getCurrentPosition();
    setPosition(pos);

    if (pos && activeEntry?.shift?.locationLat && activeEntry?.shift?.locationLng) {
      const dist = haversineDistance(pos.lat, pos.lng, activeEntry.shift.locationLat, activeEntry.shift.locationLng);
      setDistance(Math.round(dist));
      if (dist > CLOCK_OUT_WARNING_RADIUS) {
        setShowWarning(true);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    clockOutMutation.mutate();
  };

  if (showWarning) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Terug</Text>
        </TouchableOpacity>
        <View style={styles.content}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>Ver van locatie</Text>
          <Text style={styles.warningText}>
            Je klokt uit op {distance ? `${(distance / 1000).toFixed(1)}km` : 'onbekende afstand'} van de locatie. Dit wordt geregistreerd.
          </Text>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => clockOutMutation.mutate()}
            disabled={clockOutMutation.isPending}
          >
            <Text style={styles.confirmButtonText}>Uitklokken bevestigen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowWarning(false)}>
            <Text style={styles.cancelButtonText}>Annuleren</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Terug</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.title}>Uitklokken</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleClockOut}
          disabled={loading || clockOutMutation.isPending}
        >
          {loading || clockOutMutation.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Uitklokken</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backButton: { padding: 16, paddingTop: 60 },
  backText: { color: Colors.accent, fontSize: 16 },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.dark },
  primaryButton: { backgroundColor: Colors.accent, borderRadius: 12, padding: 16, minWidth: 200, alignItems: 'center' },
  primaryButtonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  warningIcon: { fontSize: 64 },
  warningTitle: { fontSize: 22, fontWeight: '700', color: Colors.dark },
  warningText: { color: Colors.gray600, textAlign: 'center', lineHeight: 22 },
  confirmButton: { backgroundColor: Colors.accent, borderRadius: 12, padding: 16, minWidth: 200, alignItems: 'center' },
  confirmButtonText: { color: Colors.white, fontWeight: '600' },
  cancelButton: { padding: 12 },
  cancelButtonText: { color: Colors.gray600, fontSize: 16 },
});

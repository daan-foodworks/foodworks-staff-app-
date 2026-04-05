import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi, timeEntriesApi } from '@/lib/api';
import { getCurrentPosition, haversineDistance } from '@/lib/location';
import { Colors } from '@/lib/colors';

const CLOCK_IN_RADIUS = 300; // meters

export default function InklokkenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'tooFar' | 'gpsFailed' | 'ready'>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  const { data: shift } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => shiftsApi.getShift(id).then(r => r.data),
  });

  const clockInMutation = useMutation({
    mutationFn: () => timeEntriesApi.clockIn(id, position?.lat, position?.lng),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-time-entries'] });
      router.replace('/(tabs)/inklokken');
    },
  });

  const checkGPS = async () => {
    setGpsStatus('loading');
    const pos = await getCurrentPosition();
    if (!pos) {
      setGpsStatus('gpsFailed');
      return;
    }
    setPosition(pos);

    if (shift?.locationLat && shift?.locationLng) {
      const dist = haversineDistance(pos.lat, pos.lng, shift.locationLat, shift.locationLng);
      setDistance(Math.round(dist));
      if (dist <= CLOCK_IN_RADIUS) {
        setGpsStatus('ready');
      } else {
        setGpsStatus('tooFar');
      }
    } else {
      // Geen locatie bekend — direct toestaan
      setGpsStatus('ready');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Terug</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Inklokken</Text>
        {shift && <Text style={styles.shiftName}>{shift.title}</Text>}

        {gpsStatus === 'idle' && (
          <>
            <Text style={styles.instruction}>We controleren je locatie voor je inklokt</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={checkGPS}>
              <Text style={styles.primaryButtonText}>Locatie bepalen</Text>
            </TouchableOpacity>
          </>
        )}

        {gpsStatus === 'loading' && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.accent} size="large" />
            <Text style={styles.loadingText}>GPS bepalen...</Text>
          </View>
        )}

        {gpsStatus === 'ready' && (
          <View style={styles.readyState}>
            <Text style={styles.readyIcon}>✅</Text>
            {distance !== null && (
              <Text style={styles.distanceText}>Je bent {distance}m van de locatie</Text>
            )}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => clockInMutation.mutate()}
              disabled={clockInMutation.isPending}
            >
              <Text style={styles.primaryButtonText}>
                {clockInMutation.isPending ? 'Bezig...' : 'Inklokken bevestigen'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {gpsStatus === 'tooFar' && (
          <View style={styles.errorState}>
            <Text style={styles.errorIcon}>❌</Text>
            {distance !== null && (
              <Text style={styles.errorText}>Je bent {distance}m van de locatie</Text>
            )}
            <Text style={styles.errorSub}>Inklokken pas mogelijk wanneer je ter plaatse bent</Text>
            <TouchableOpacity style={styles.retryButton} onPress={checkGPS}>
              <Text style={styles.retryText}>Herprobeer</Text>
            </TouchableOpacity>
          </View>
        )}

        {gpsStatus === 'gpsFailed' && (
          <View style={styles.errorState}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>Locatie kon niet worden bepaald</Text>
            <Text style={styles.errorSub}>Vraag je manager om je handmatig in te klokken</Text>
            <TouchableOpacity style={styles.retryButton} onPress={checkGPS}>
              <Text style={styles.retryText}>Opnieuw proberen</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backButton: { padding: 16, paddingTop: 60 },
  backText: { color: Colors.accent, fontSize: 16 },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.dark, marginBottom: 8 },
  shiftName: { fontSize: 16, color: Colors.gray600, marginBottom: 32 },
  instruction: { fontSize: 16, color: Colors.gray600, textAlign: 'center', marginBottom: 32 },
  primaryButton: { backgroundColor: Colors.accent, borderRadius: 12, padding: 16, minWidth: 200, alignItems: 'center' },
  primaryButtonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  loadingState: { alignItems: 'center', gap: 16 },
  loadingText: { color: Colors.gray600, fontSize: 16 },
  readyState: { alignItems: 'center', gap: 16 },
  readyIcon: { fontSize: 64 },
  distanceText: { color: Colors.gray600, fontSize: 16 },
  errorState: { alignItems: 'center', gap: 16 },
  errorIcon: { fontSize: 64 },
  errorText: { color: Colors.dark, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  errorSub: { color: Colors.gray600, fontSize: 14, textAlign: 'center' },
  retryButton: { backgroundColor: Colors.gray100, borderRadius: 12, padding: 12, paddingHorizontal: 24 },
  retryText: { color: Colors.dark, fontWeight: '600' },
});

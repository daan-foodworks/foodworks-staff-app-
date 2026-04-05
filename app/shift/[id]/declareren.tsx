import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeEntriesApi, travelTimeApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { differenceInMinutes, format } from 'date-fns';

export default function VerklarenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: myEntries } = useQuery({
    queryKey: ['my-time-entries'],
    queryFn: () => timeEntriesApi.getMyEntries().then(r => r.data),
  });

  const timeEntry = myEntries?.find((e: any) => e.shiftId === id && e.clockOutAt);

  const clockedMinutes = timeEntry
    ? differenceInMinutes(new Date(timeEntry.clockOutAt), new Date(timeEntry.clockInAt))
    : 0;
  const clockedHours = (clockedMinutes / 60).toFixed(2);

  const [declaredHours, setDeclaredHours] = useState(clockedHours);
  const [note, setNote] = useState('');
  const [travelMins, setTravelMins] = useState('');
  const [step, setStep] = useState<'hours' | 'travel' | 'done'>('hours');

  const declareMutation = useMutation({
    mutationFn: () =>
      timeEntriesApi.declare(timeEntry?.id, parseFloat(declaredHours), note || undefined),
    onSuccess: () => setStep('travel'),
  });

  const travelMutation = useMutation({
    mutationFn: () =>
      travelTimeApi.submit({
        timeEntryId: timeEntry?.id,
        travelMinutes: parseInt(travelMins) || 0,
        note: undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-time-entries'] });
      setStep('done');
    },
  });

  if (!timeEntry) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Geen uitgeklokte dienst gevonden</Text>
      </View>
    );
  }

  if (step === 'done') {
    return (
      <View style={styles.container}>
        <View style={styles.successState}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Uren ingediend!</Text>
          <Text style={styles.successText}>Je projectmanager ontvangt een melding.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(tabs)/rooster')}>
            <Text style={styles.primaryButtonText}>Terug naar rooster</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'travel') {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Terug</Text>
        </TouchableOpacity>
        <View style={styles.content}>
          <Text style={styles.title}>Reistijd opgeven</Text>
          <Text style={styles.subtitle}>Optioneel — vul je reistijd in voor vergoeding</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Totale reistijd (minuten, heen + terug)</Text>
            <TextInput
              style={styles.input}
              value={travelMins}
              onChangeText={setTravelMins}
              keyboardType="numeric"
              placeholder="bijv. 60"
              placeholderTextColor={Colors.gray400}
            />
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Eerste 30 minuten zijn eigen tijd. De rest wordt vergoed op basis van jouw uurloon.</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => travelMins ? travelMutation.mutate() : setStep('done')}
            disabled={travelMutation.isPending}
          >
            <Text style={styles.primaryButtonText}>
              {travelMins ? 'Reistijd indienen' : 'Overslaan'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Terug</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.title}>Uren declareren</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Ingeklokt</Text>
          <Text style={styles.summaryValue}>{format(new Date(timeEntry.clockInAt), 'HH:mm')}</Text>
          <Text style={styles.summaryLabel}>Uitgeklokt</Text>
          <Text style={styles.summaryValue}>{format(new Date(timeEntry.clockOutAt), 'HH:mm')}</Text>
          <Text style={styles.summaryLabel}>Berekende uren</Text>
          <Text style={styles.summaryValue}>{clockedHours}u</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gedeclareerde uren</Text>
          <TextInput
            style={styles.input}
            value={declaredHours}
            onChangeText={setDeclaredHours}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Toelichting (optioneel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            placeholder="bijv. pauze niet meegeteld..."
            placeholderTextColor={Colors.gray400}
          />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => declareMutation.mutate()}
          disabled={declareMutation.isPending}
        >
          <Text style={styles.primaryButtonText}>
            {declareMutation.isPending ? 'Bezig...' : 'Uren indienen'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backButton: { padding: 16, paddingTop: 60 },
  backText: { color: Colors.accent, fontSize: 16 },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.dark },
  subtitle: { fontSize: 16, color: Colors.gray600 },
  summaryCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, gap: 4 },
  summaryLabel: { fontSize: 12, color: Colors.gray400, textTransform: 'uppercase' },
  summaryValue: { fontSize: 18, fontWeight: '600', color: Colors.dark, marginBottom: 8 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.dark },
  input: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
    borderRadius: 12, padding: 16, fontSize: 16, color: Colors.dark,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  infoCard: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12 },
  infoText: { fontSize: 14, color: '#92400E', lineHeight: 20 },
  primaryButton: { backgroundColor: Colors.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryButtonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  emptyText: { flex: 1, textAlign: 'center', padding: 40, color: Colors.gray600 },
  successState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  successIcon: { fontSize: 64 },
  successTitle: { fontSize: 24, fontWeight: '700', color: Colors.dark },
  successText: { color: Colors.gray600, textAlign: 'center' },
});

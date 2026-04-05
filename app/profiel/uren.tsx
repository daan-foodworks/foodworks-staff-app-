import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { timeEntriesApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';
import { format, addMonths, subMonths } from 'date-fns';
import { nl } from 'date-fns/locale';

const MONTH_NAMES = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Niet ingediend',
    SUBMITTED: 'Ingediend',
    APPROVED: 'Goedgekeurd',
    REJECTED: 'Afgekeurd',
    PAID: 'Uitbetaald',
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: Colors.accent,
    SUBMITTED: '#3B82F6',
    APPROVED: Colors.teal,
    REJECTED: '#EF4444',
    PAID: Colors.gray600,
  };
  return colors[status] || Colors.gray600;
}

export default function MijnUrenScreen() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data, isLoading } = useQuery({
    queryKey: ['monthly-hours', year, month],
    queryFn: () => timeEntriesApi.getMyMonthly(year, month).then(r => r.data),
  });

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Terug</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Mijn uren</Text>
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => setCurrentDate(subMonths(currentDate, 1))}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {MONTH_NAMES[month - 1]} {year}
        </Text>
        <TouchableOpacity onPress={() => setCurrentDate(addMonths(currentDate, 1))}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ padding: 40 }} />
      ) : (
        <>
          {data?.summary && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Totale uren</Text>
                <Text style={styles.summaryValue}>{data.summary.totalHours?.toFixed(1) || '0'}u</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Goedgekeurd</Text>
                <Text style={[styles.summaryValue, { color: Colors.teal }]}>{data.summary.approvedHours?.toFixed(1) || '0'}u</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>In behandeling</Text>
                <Text style={[styles.summaryValue, { color: Colors.accent }]}>{data.summary.pendingHours?.toFixed(1) || '0'}u</Text>
              </View>
              {data.summary.travelReimbursement > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Reistijdvergoeding</Text>
                  <Text style={styles.summaryValue}>€{data.summary.travelReimbursement?.toFixed(2)}</Text>
                </View>
              )}
            </View>
          )}

          {data?.entries?.length > 0 ? (
            <View style={styles.entriesList}>
              {data.entries.map((entry: any) => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>
                      {format(new Date(entry.shift.startTime), 'd MMM', { locale: nl })}
                    </Text>
                    <Text style={styles.entryHours}>{entry.declaredHours || entry.clockedHours}u</Text>
                  </View>
                  <Text style={styles.entryShift}>{entry.shift.title}</Text>
                  <Text style={styles.entryRole}>{entry.shift.shiftRole?.name}</Text>
                  <Text style={[styles.entryStatus, { color: getStatusColor(entry.status) }]}>
                    {getStatusLabel(entry.status)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Geen diensten in {MONTH_NAMES[month - 1]} {year}</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backButton: { padding: 16, paddingTop: 60 },
  backText: { color: Colors.accent, fontSize: 16 },
  header: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.dark },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  navArrow: { fontSize: 32, color: Colors.accent, paddingHorizontal: 16 },
  monthTitle: { fontSize: 20, fontWeight: '700', color: Colors.dark },
  summaryCard: { backgroundColor: Colors.white, margin: 16, borderRadius: 12, padding: 16, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, color: Colors.gray600 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  entriesList: { padding: 16, gap: 8 },
  entryCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  entryDate: { fontSize: 14, color: Colors.gray600 },
  entryHours: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  entryShift: { fontSize: 16, fontWeight: '600', color: Colors.dark },
  entryRole: { fontSize: 13, color: Colors.gray600, marginTop: 2 },
  entryStatus: { fontSize: 13, fontWeight: '500', marginTop: 8 },
  emptyText: { textAlign: 'center', color: Colors.gray600, padding: 40 },
});

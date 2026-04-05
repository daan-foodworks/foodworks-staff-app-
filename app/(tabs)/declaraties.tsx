import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { expensesApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

function ExpenseStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    DRAFT: { label: 'Concept', bg: Colors.gray100, text: Colors.gray600 },
    SUBMITTED: { label: 'Ingediend', bg: '#DBEAFE', text: '#1E40AF' },
    APPROVED: { label: 'Goedgekeurd', bg: '#D1FAE5', text: '#065F46' },
    REJECTED: { label: 'Afgekeurd', bg: '#FEE2E2', text: '#991B1B' },
    PAID: { label: 'Uitbetaald', bg: Colors.gray100, text: Colors.gray600 },
  };
  const conf = config[status] || { label: status, bg: Colors.gray100, text: Colors.gray600 };
  return (
    <View style={[styles.badge, { backgroundColor: conf.bg }]}>
      <Text style={[styles.badgeText, { color: conf.text }]}>{conf.label}</Text>
    </View>
  );
}

export default function DeclaratiesScreen() {
  const router = useRouter();
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['my-expenses'],
    queryFn: () => expensesApi.getMyExpenses().then(r => r.data),
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Declaraties</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/declaraties/nieuw' as any)}
        >
          <Text style={styles.addButtonText}>+ Nieuw</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.list}>
        {isLoading ? (
          <Text style={styles.emptyText}>Laden...</Text>
        ) : !expenses?.length ? (
          <Text style={styles.emptyText}>Geen declaraties — tap + Nieuw om een declaratie in te dienen</Text>
        ) : (
          expenses.map((expense: any) => (
            <View key={expense.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.expenseDesc}>{expense.description}</Text>
                <ExpenseStatusBadge status={expense.status} />
              </View>
              <Text style={styles.amount}>€{expense.amount.toFixed(2)}</Text>
              <Text style={styles.date}>{format(new Date(expense.date), 'dd MMM yyyy', { locale: nl })}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.dark },
  addButton: { backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addButtonText: { color: Colors.white, fontWeight: '600' },
  list: { flex: 1, padding: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  expenseDesc: { fontSize: 16, fontWeight: '600', color: Colors.dark, flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  amount: { fontSize: 18, fontWeight: '700', color: Colors.dark },
  date: { fontSize: 14, color: Colors.gray600, marginTop: 4 },
  emptyText: { color: Colors.gray600, textAlign: 'center', padding: 24, lineHeight: 22 },
});

import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { hrApi } from '@/lib/api';
import { Colors } from '@/lib/colors';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://foodworks-backend-production.up.railway.app/api';
const SERVER_BASE = BASE_URL.replace('/api', '');

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  PERMANENT: 'Vast',
  TEMPORARY: 'Tijdelijk',
  INTERNSHIP: 'Stage',
  FREELANCE: 'ZZP',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isExpired(contract: any) {
  return contract.endDate && new Date(contract.endDate) < new Date();
}

export default function ContractenScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['my-contracts'],
    queryFn: () => hrApi.getMyContracts().then(r => r.data),
  });

  const openPdf = async (contract: any) => {
    if (!contract.fileUrl) return;
    setDownloadingId(contract.id);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const url = `${SERVER_BASE}${contract.fileUrl}`;
      const localUri = FileSystem.cacheDirectory + `contract-${contract.id}.pdf`;
      const result = await FileSystem.downloadAsync(url, localUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Fout', 'Delen is niet beschikbaar op dit apparaat.');
      }
    } catch {
      Alert.alert('Fout', 'Kon het contract niet openen. Probeer het opnieuw.');
    } finally {
      setDownloadingId(null);
    }
  };

  const currentContracts = contracts.filter((c: any) => !isExpired(c));
  const pastContracts = contracts.filter((c: any) => isExpired(c));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mijn contracten</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.teal} />
        </View>
      ) : contracts.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Geen contracten gevonden.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {currentContracts.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Huidig contract</Text>
              {currentContracts.map((contract: any) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  onOpenPdf={openPdf}
                  downloading={downloadingId === contract.id}
                />
              ))}
            </>
          )}

          {pastContracts.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Eerdere contracten</Text>
              {pastContracts.map((contract: any) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  onOpenPdf={openPdf}
                  downloading={downloadingId === contract.id}
                  past
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function ContractCard({ contract, onOpenPdf, downloading, past }: {
  contract: any;
  onOpenPdf: (c: any) => void;
  downloading: boolean;
  past?: boolean;
}) {
  return (
    <View style={[styles.card, past && styles.cardPast]}>
      <View style={styles.cardHeader}>
        <Text style={styles.contractType}>{CONTRACT_TYPE_LABELS[contract.type] ?? contract.type}</Text>
        {past && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Verlopen</Text>
          </View>
        )}
      </View>

      <View style={styles.rows}>
        <Row label="Ingangsdatum" value={formatDate(contract.startDate)} />
        <Row label="Einddatum" value={contract.endDate ? formatDate(contract.endDate) : 'Onbepaalde tijd'} />
        {contract.hoursPerWeek != null && (
          <Row label="Uren per week" value={`${contract.hoursPerWeek} uur`} />
        )}
        {contract.hourlyRate != null && (
          <Row label="Uurloon" value={`€ ${Number(contract.hourlyRate).toFixed(2)}`} />
        )}
      </View>

      {contract.fileUrl ? (
        <TouchableOpacity
          style={styles.pdfButton}
          onPress={() => onOpenPdf(contract)}
          disabled={downloading}
        >
          {downloading
            ? <ActivityIndicator size="small" color={Colors.teal} />
            : <Text style={styles.pdfButtonText}>Bekijk contract PDF</Text>
          }
        </TouchableOpacity>
      ) : (
        <View style={styles.noPdfNote}>
          <Text style={styles.noPdfText}>Nog geen PDF beschikbaar</Text>
        </View>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backButton: { width: 44, alignItems: 'center' },
  backArrow: { fontSize: 32, color: Colors.dark, lineHeight: 36 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.dark, fontFamily: 'Archivo_700Bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: Colors.gray400 },
  scrollContent: { padding: 16, gap: 12 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.gray400,
    textTransform: 'uppercase', marginBottom: 4, marginTop: 8,
    fontFamily: 'Archivo_600SemiBold',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPast: { opacity: 0.75 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  contractType: { fontSize: 17, fontWeight: '700', color: Colors.dark, fontFamily: 'Archivo_700Bold' },
  badge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  rows: { gap: 8, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 14, color: Colors.gray600 },
  rowValue: { fontSize: 14, color: Colors.dark, fontWeight: '500' },
  pdfButton: {
    backgroundColor: Colors.teal + '15',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.teal + '40',
  },
  pdfButtonText: { fontSize: 14, fontWeight: '600', color: Colors.teal, fontFamily: 'Archivo_600SemiBold' },
  noPdfNote: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  noPdfText: { fontSize: 13, color: Colors.gray400 },
});

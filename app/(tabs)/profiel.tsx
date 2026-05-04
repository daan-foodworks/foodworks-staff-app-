import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/auth-store';
import { useQuery } from '@tanstack/react-query';
import { hrApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';

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

export default function ProfielScreen() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['my-contracts'],
    queryFn: () => hrApi.getMyContracts().then(r => r.data),
    enabled: !!user,
  });

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/(auth)/login');
  };

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top }}
    >
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mijn account</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/profiel/uren' as any)}
        >
          <Text style={styles.menuItemText}>Mijn uren</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contracten</Text>
          <ActivityIndicator size="small" color={Colors.teal} style={{ margin: 16 }} />
        </View>
      ) : contracts.length === 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contracten</Text>
          <Text style={styles.emptyText}>Geen contracten gevonden.</Text>
        </View>
      ) : (
        <>
          {currentContracts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Huidig contract</Text>
              {currentContracts.map((contract: any) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  onOpenPdf={openPdf}
                  downloading={downloadingId === contract.id}
                />
              ))}
            </View>
          )}

          {pastContracts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Eerdere contracten</Text>
              {pastContracts.map((contract: any, index: number) => (
                <View key={contract.id}>
                  <ContractCard
                    contract={contract}
                    onOpenPdf={openPdf}
                    downloading={downloadingId === contract.id}
                    past
                  />
                  {index < pastContracts.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Uitloggen</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ContractCard({ contract, onOpenPdf, downloading, past }: {
  contract: any;
  onOpenPdf: (c: any) => void;
  downloading: boolean;
  past?: boolean;
}) {
  return (
    <View style={[styles.contractCard, past && styles.contractCardPast]}>
      <View style={styles.contractRow}>
        <Text style={styles.contractType}>{CONTRACT_TYPE_LABELS[contract.type] ?? contract.type}</Text>
        {past && <View style={styles.badgePast}><Text style={styles.badgePastText}>Verlopen</Text></View>}
      </View>

      <View style={styles.contractDetails}>
        <View style={styles.contractDetailRow}>
          <Text style={styles.contractLabel}>Ingangsdatum</Text>
          <Text style={styles.contractValue}>{formatDate(contract.startDate)}</Text>
        </View>
        <View style={styles.contractDetailRow}>
          <Text style={styles.contractLabel}>Einddatum</Text>
          <Text style={styles.contractValue}>
            {contract.endDate ? formatDate(contract.endDate) : 'Onbepaalde tijd'}
          </Text>
        </View>
        {contract.hoursPerWeek != null && (
          <View style={styles.contractDetailRow}>
            <Text style={styles.contractLabel}>Uren per week</Text>
            <Text style={styles.contractValue}>{contract.hoursPerWeek} uur</Text>
          </View>
        )}
        {contract.hourlyRate != null && (
          <View style={styles.contractDetailRow}>
            <Text style={styles.contractLabel}>Uurloon</Text>
            <Text style={styles.contractValue}>€ {Number(contract.hourlyRate).toFixed(2)}</Text>
          </View>
        )}
      </View>

      {contract.fileUrl && (
        <TouchableOpacity
          style={styles.pdfButton}
          onPress={() => onOpenPdf(contract)}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={Colors.teal} />
          ) : (
            <Text style={styles.pdfButtonText}>Bekijk contract PDF</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 24,
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.white, fontFamily: 'Archivo_700Bold' },
  name: { fontSize: 22, fontWeight: '700', color: Colors.dark, fontFamily: 'Archivo_700Bold' },
  email: { fontSize: 14, color: Colors.gray600, marginTop: 4 },
  section: { backgroundColor: Colors.white, marginBottom: 16, paddingVertical: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: Colors.gray400,
    textTransform: 'uppercase', paddingHorizontal: 16, paddingVertical: 8,
    fontFamily: 'Archivo_600SemiBold',
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuItemText: { fontSize: 16, color: Colors.dark },
  chevron: { fontSize: 20, color: Colors.gray400 },
  emptyText: { fontSize: 14, color: Colors.gray400, paddingHorizontal: 16, paddingBottom: 12 },
  divider: { height: 1, backgroundColor: Colors.gray100, marginHorizontal: 16 },
  contractCard: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  contractCardPast: { opacity: 0.75 },
  contractRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  contractType: { fontSize: 16, fontWeight: '700', color: Colors.dark, fontFamily: 'Archivo_700Bold' },
  badgePast: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  badgePastText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  contractDetails: { gap: 6 },
  contractDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  contractLabel: { fontSize: 14, color: Colors.gray600 },
  contractValue: { fontSize: 14, color: Colors.dark, fontWeight: '500' },
  pdfButton: {
    marginTop: 14,
    backgroundColor: Colors.teal + '15',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.teal + '40',
  },
  pdfButtonText: { fontSize: 14, fontWeight: '600', color: Colors.teal, fontFamily: 'Archivo_600SemiBold' },
  logoutButton: {
    marginHorizontal: 16, marginVertical: 8, padding: 16,
    backgroundColor: '#FEE2E2', borderRadius: 12, alignItems: 'center',
  },
  logoutText: { color: '#991B1B', fontSize: 16, fontWeight: '600' },
});

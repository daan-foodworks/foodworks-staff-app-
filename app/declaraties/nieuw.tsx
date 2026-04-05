import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { expensesApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';

const EXPENSE_TYPES = [
  { value: 'RECEIPT', label: 'Bonnetje' },
  { value: 'CAR_TRAVEL', label: 'Reiskosten (auto)' },
  { value: 'PUBLIC_TRANSPORT', label: 'OV' },
  { value: 'PARKING', label: 'Parkeren' },
  { value: 'TOLL', label: 'Tol' },
  { value: 'OTHER', label: 'Overig' },
];

export default function NieuweDeclaratieScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [type, setType] = useState('RECEIPT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('amount', amount);
      formData.append('description', description);
      formData.append('date', new Date().toISOString());
      if (receiptUri) {
        formData.append('receipt', {
          uri: receiptUri,
          type: 'image/jpeg',
          name: 'receipt.jpg',
        } as any);
      }
      return expensesApi.submit(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-expenses'] });
      Alert.alert('Declaratie ingediend!', 'Je ontvangt bericht zodra deze goedgekeurd is.');
      router.back();
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Terug</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Nieuwe declaratie</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {EXPENSE_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeButton, type === t.value && styles.typeButtonActive]}
                onPress={() => setType(t.value)}
              >
                <Text style={[styles.typeButtonText, type === t.value && styles.typeButtonTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bedrag (€)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={Colors.gray400}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Omschrijving</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="bijv. Lunch materiaalkoop"
            placeholderTextColor={Colors.gray400}
          />
        </View>

        {type === 'RECEIPT' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bonnetje</Text>
            {receiptUri ? (
              <View>
                <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
                <TouchableOpacity onPress={pickImage}>
                  <Text style={styles.changePhoto}>Foto wijzigen</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Text style={styles.photoButtonText}>Maak foto</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, (!amount || !description) && styles.submitButtonDisabled]}
          onPress={() => submitMutation.mutate()}
          disabled={!amount || !description || submitMutation.isPending}
        >
          <Text style={styles.submitButtonText}>
            {submitMutation.isPending ? 'Bezig...' : 'Indienen'}
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
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.dark },
  typeScroll: { marginHorizontal: -4 },
  typeButton: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.gray200, marginHorizontal: 4,
    backgroundColor: Colors.white,
  },
  typeButtonActive: { borderColor: Colors.accent, backgroundColor: '#FFF0EF' },
  typeButtonText: { fontSize: 14, color: Colors.gray600 },
  typeButtonTextActive: { color: Colors.accent, fontWeight: '600' },
  input: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
    borderRadius: 12, padding: 16, fontSize: 16, color: Colors.dark,
  },
  photoButton: { backgroundColor: Colors.gray100, borderRadius: 12, padding: 16, alignItems: 'center' },
  photoButtonText: { fontSize: 16, color: Colors.gray600 },
  receiptPreview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 8 },
  changePhoto: { color: Colors.accent, textAlign: 'center' },
  submitButton: { backgroundColor: Colors.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});

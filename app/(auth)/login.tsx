import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore } from '@/lib/auth-store';
import { authApi } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const response = await authApi.login(email, password);
      const { token, user } = response.data;
      await setAuth(user, token);
      router.replace('/(tabs)/rooster');
    } catch (error: any) {
      Alert.alert('Inloggen mislukt', error.response?.data?.message || 'Controleer je gegevens');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Street Nacho</Text>
        <Text style={styles.subtitle}>Personeel App</Text>
      </View>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="E-mailadres"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={Colors.gray400}
        />
        <TextInput
          style={styles.input}
          placeholder="Wachtwoord"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={Colors.gray400}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Inloggen</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 32, fontWeight: '700', color: Colors.dark },
  subtitle: { fontSize: 16, color: Colors.gray600, marginTop: 4 },
  form: { gap: 16 },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.dark,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import { useStore } from '../../store/useStore';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { isDarkMode } = useStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const theme = isDarkMode ? {
    background: '#0f172a',
    border: '#374151',
    text: '#f9fafb',
    muted: '#9ca3af',
    input: '#1f2937',
    inputText: '#f9fafb',
  } : {
    background: '#f7f8fb',
    border: '#e5e7eb',
    text: '#111827',
    muted: '#6b7280',
    input: '#ffffff',
    inputText: '#111827',
  };

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Email harus diisi!');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Berhasil', 'Email reset password sudah dikirim!', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error: any) {
      Alert.alert('Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.inner, { backgroundColor: theme.background }]}> 
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Lupa Password</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Masukkan email kamu untuk reset password</Text>

        <TextInput
          style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.inputText }]}
          placeholder="Email"
          placeholderTextColor={theme.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={handleReset}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.resetText}>Kirim Email Reset</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 32 },
  backText: { color: '#E91E63', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  resetText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
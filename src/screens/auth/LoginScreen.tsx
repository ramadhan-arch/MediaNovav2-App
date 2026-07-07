import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import { useStore } from '../../store/useStore';

export default function LoginScreen({ navigation }: any) {
  const { isDarkMode } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const theme = isDarkMode ? {
    background: '#0f172a',
    card: '#111827',
    border: '#374151',
    text: '#f9fafb',
    muted: '#9ca3af',
    input: '#1f2937',
    inputText: '#f9fafb',
  } : {
    background: '#f7f8fb',
    card: '#ffffff',
    border: '#e5e7eb',
    text: '#111827',
    muted: '#6b7280',
    input: '#ffffff',
    inputText: '#111827',
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password harus diisi!');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert('Login Gagal', error.message);
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
        <Text style={[styles.logo, { color: theme.text }]}>🎬 MediaNova</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Share your world</Text>

        <TextInput
          style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.inputText }]}
          placeholder="Email"
          placeholderTextColor={theme.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={[styles.passwordBox, { backgroundColor: theme.input, borderColor: theme.border }]}> 
          <TextInput
            style={[styles.passwordInput, { color: theme.inputText }]}
            placeholder="Password"
            placeholderTextColor={theme.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.muted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.loginText}>Login</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={[styles.forgotText, { color: theme.muted }]}>Lupa password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={[styles.registerText, { color: theme.muted }]}> 
            Belum punya akun? <Text style={styles.registerLink}>Daftar</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 40 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  passwordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  loginBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  forgotText: { textAlign: 'center', marginBottom: 24 },
  registerText: { textAlign: 'center' },
  registerLink: { color: '#E91E63', fontWeight: 'bold' },
});
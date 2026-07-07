import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../utils/firebase';
import { useStore } from '../../store/useStore';

export default function RegisterScreen({ navigation }: any) {
  const { isDarkMode } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Semua field harus diisi!');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Password tidak cocok!');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password minimal 6 karakter!');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        displayName: name,
        email: email,
        photoURL: '',
        bio: '',
        followersCount: 0,
        followingCount: 0,
        createdAt: new Date(),
      });
    } catch (error: any) {
      Alert.alert('Register Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.inner, { backgroundColor: theme.background }]}> 
        <Text style={[styles.logo, { color: theme.text }]}>🎬 MediaNova</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Buat akun baru</Text>

        <TextInput
          style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.inputText }]}
          placeholder="Nama lengkap"
          placeholderTextColor={theme.muted}
          value={name}
          onChangeText={setName}
        />
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
        <View style={[styles.passwordBox, { backgroundColor: theme.input, borderColor: theme.border }]}> 
          <TextInput
            style={[styles.passwordInput, { color: theme.inputText }]}
            placeholder="Konfirmasi Password"
            placeholderTextColor={theme.muted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)}>
            <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.muted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.registerText}>Daftar</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.loginText, { color: theme.muted }]}> 
            Sudah punya akun? <Text style={styles.loginLink}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
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
  registerBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  registerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loginText: { textAlign: 'center' },
  loginLink: { color: '#E91E63', fontWeight: 'bold' },
});
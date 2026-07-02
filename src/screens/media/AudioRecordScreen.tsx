import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Animated
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function AudioRecordScreen({ navigation }: any) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<any>(null);
  const isMounted = useRef(true);
  const waveAnim = useRef(new Animated.Value(1)).current;
  const waveAnimation = useRef<any>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearInterval(intervalRef.current);
      waveAnimation.current?.stop();
      if (recording) recording.stopAndUnloadAsync().catch(() => {});
      if (sound) sound.unloadAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      waveAnimation.current = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1.4, duration: 300, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 0.8, duration: 300, useNativeDriver: true }),
        ])
      );
      waveAnimation.current.start();
    } else {
      waveAnimation.current?.stop();
      waveAnim.setValue(1);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Error', 'Butuh izin mikrofon!');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setDuration(0);
      setRecordedUri(null);
      intervalRef.current = setInterval(() => {
        if (isMounted.current) setDuration(d => d + 1);
      }, 1000);
    } catch (e) {
      Alert.alert('Error', 'Gagal merekam audio');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    clearInterval(intervalRef.current);
    if (isMounted.current) setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri && isMounted.current) setRecordedUri(uri);
    } catch (e) {
      console.log(e);
    }
  };

  const playPreview = async () => {
    if (!recordedUri) return;
    try {
      if (sound) {
        if (isPlaying) {
          await sound.stopAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: recordedUri });
      setSound(newSound);
      setIsPlaying(true);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish && isMounted.current) {
          setIsPlaying(false);
        }
      });
    } catch (e) {
      Alert.alert('Error', 'Gagal memutar audio');
    }
  };

  const handleUse = () => {
    if (!recordedUri) {
      Alert.alert('Error', 'Rekam audio dulu!');
      return;
    }
    if (sound) sound.unloadAsync().catch(() => {});
    navigation.navigate('MainTabs', {
      screen: 'CreatePost',
      params: { audioUri: recordedUri }
    });
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#E91E63" />
        <Text style={styles.backText}>Kembali</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🎙️ Rekam Audio</Text>

      {/* Waveform */}
      <View style={styles.waveformBox}>
        {isRecording ? (
          <View style={styles.waveformBars}>
            {[0.4, 0.7, 1.0, 0.6, 0.9, 0.5, 0.8, 0.3, 0.7, 1.0].map((h, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: 40 * h,
                    transform: [{ scaleY: waveAnim }],
                    opacity: 0.5 + (h * 0.5)
                  }
                ]}
              />
            ))}
          </View>
        ) : recordedUri ? (
          <View style={styles.waveformDoneBox}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
            <Text style={styles.waveformDone}>Audio siap digunakan!</Text>
          </View>
        ) : (
          <Text style={styles.waveformIdle}>Tekan tombol untuk mulai rekam</Text>
        )}
      </View>

      {/* Timer */}
      <Text style={styles.duration}>{formatDuration(duration)}</Text>

      {/* Record button */}
      <TouchableOpacity
        style={[styles.recordBtn, isRecording && styles.recordingBtn]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Ionicons name={isRecording ? 'stop' : 'mic'} size={36} color="#fff" />
        <Text style={styles.recordText}>{isRecording ? 'Stop' : 'Rekam'}</Text>
      </TouchableOpacity>

      {/* Preview & Use buttons */}
      {recordedUri && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.previewBtn} onPress={playPreview}>
            <Ionicons
              name={isPlaying ? 'stop-circle-outline' : 'play-circle-outline'}
              size={28}
              color="#E91E63"
            />
            <Text style={styles.previewBtnText}>
              {isPlaying ? 'Stop' : 'Preview'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.useBtn} onPress={handleUse}>
            <Ionicons name="checkmark-circle" size={28} color="#fff" />
            <Text style={styles.useBtnText}>Gunakan Audio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rerecordBtn}
            onPress={() => {
              setRecordedUri(null);
              setDuration(0);
              if (sound) { sound.unloadAsync(); setSound(null); }
            }}
          >
            <Ionicons name="refresh" size={24} color="#888" />
            <Text style={styles.rerecordText}>Rekam Ulang</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 24, alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 20, marginBottom: 32, gap: 8 },
  backText: { color: '#E91E63', fontSize: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 32 },
  waveformBox: { width: '100%', height: 100, backgroundColor: '#111', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#222' },
  waveformBars: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  waveBar: { width: 6, backgroundColor: '#E91E63', borderRadius: 3 },
  waveformDoneBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waveformDone: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  waveformIdle: { color: '#888', fontSize: 14 },
  duration: { color: '#fff', fontSize: 52, fontWeight: 'bold', marginBottom: 40, fontVariant: ['tabular-nums'] },
  recordBtn: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center', marginBottom: 32, elevation: 4 },
  recordingBtn: { backgroundColor: '#ff0000' },
  recordText: { color: '#fff', fontSize: 11, marginTop: 2 },
  actionButtons: { width: '100%', gap: 12 },
  previewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  previewBtnText: { color: '#fff', fontSize: 16 },
  useBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E91E63', padding: 16, borderRadius: 12 },
  useBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  rerecordBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  rerecordText: { color: '#888', fontSize: 14 },
});
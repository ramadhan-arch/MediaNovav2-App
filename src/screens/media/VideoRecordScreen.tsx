import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export default function VideoRecordScreen({ navigation }: any) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [duration, setDuration] = useState(0);
  const cameraRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearInterval(intervalRef.current);
    };
  }, []);

  if (!cameraPermission || !micPermission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#E91E63" size="large" />
      </View>
    );
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.permContainer}>
        <Ionicons name="camera-outline" size={80} color="#E91E63" />
        <Text style={styles.permTitle}>Butuh Izin Kamera & Mikrofon</Text>
        <Text style={styles.permSubtitle}>Untuk bisa merekam video</Text>
        <TouchableOpacity
          style={styles.permBtn}
          onPress={async () => {
            await requestCameraPermission();
            await requestMicPermission();
          }}
        >
          <Text style={styles.permBtnText}>Izinkan Akses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtnText} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    setIsRecording(true);
    setDuration(0);
    intervalRef.current = setInterval(() => {
      if (!isMounted.current) return;
      setDuration(d => {
        if (d >= 59) {
          stopRecording();
          return 60;
        }
        return d + 1;
      });
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
      if (isMounted.current) {
        navigation.navigate('MainTabs', {
          screen: 'CreatePost',
          params: { videoUri: video.uri }
        });
      }
    } catch (e) {
      console.log('Record error:', e);
    } finally {
      clearInterval(intervalRef.current);
      if (isMounted.current) {
        setIsRecording(false);
        setDuration(0);
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      clearInterval(intervalRef.current);
      if (isMounted.current) {
        setIsRecording(false);
        setDuration(0);
      }
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {isRecording ? (
            <View style={styles.recordingBadge}>
              <View style={styles.redDot} />
              <Text style={styles.recordingTime}>{formatTime(duration)}</Text>
            </View>
          ) : (
            <Text style={styles.hintText}>Tap untuk rekam</Text>
          )}

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
          >
            <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Duration bar */}
        {isRecording && (
          <View style={styles.durationBarContainer}>
            <View style={[styles.durationBar, { width: `${(duration / 60) * 100}%` }]} />
          </View>
        )}

        {/* Record button */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.recordBtn, isRecording && styles.recordingBtn]}
            onPress={isRecording ? stopRecording : startRecording}
            activeOpacity={0.8}
          >
            <View style={[styles.recordInner, isRecording && styles.recordInnerStop]} />
          </TouchableOpacity>
          <Text style={styles.recordLabel}>
            {isRecording ? 'Tap untuk stop' : 'Tap untuk rekam (max 60 detik)'}
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 32 },
  permTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 8, textAlign: 'center' },
  permSubtitle: { color: '#888', fontSize: 14, marginBottom: 32, textAlign: 'center' },
  permBtn: { backgroundColor: '#E91E63', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12, marginBottom: 16 },
  permBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backBtnText: { padding: 12 },
  backText: { color: '#888', fontSize: 15 },
  camera: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  recordingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 8 },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff0000' },
  recordingTime: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  hintText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  durationBarContainer: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 20 },
  durationBar: { height: 3, backgroundColor: '#E91E63' },
  controls: { position: 'absolute', bottom: 60, width: '100%', alignItems: 'center', gap: 12 },
  recordBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  recordingBtn: { borderColor: '#ff0000' },
  recordInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#E91E63' },
  recordInnerStop: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#ff0000' },
  recordLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
});
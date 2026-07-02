import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function AudioPlayer({ uri, caption }: {
  uri: string;
  caption: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (soundRef.current) {
        soundRef.current.stopAsync()
          .then(() => soundRef.current?.unloadAsync())
          .catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const togglePlay = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      if (soundRef.current) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          if (isMounted.current) setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          if (isMounted.current) setIsPlaying(true);
        }
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, rate: speed, progressUpdateIntervalMillis: 500 }
      );
      soundRef.current = sound;
      if (isMounted.current) setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (!isMounted.current) return;
        if (status.isLoaded) {
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
            sound.setPositionAsync(0);
          }
        }
      });
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const changeSpeed = async () => {
    const speeds = [1.0, 1.5, 2.0, 0.5];
    const nextSpeed = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(nextSpeed);
    if (soundRef.current) {
      try { await soundRef.current.setRateAsync(nextSpeed, true); } catch (e) {}
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = duration > 0 ? (position / duration) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="musical-notes" size={24} color="#E91E63" />
        <Text style={styles.title} numberOfLines={1}>{caption || 'Audio Post'}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity onPress={togglePlay}>
          <Ionicons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={52}
            color="#E91E63"
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.speedBtn} onPress={changeSpeed}>
          <Text style={styles.speedText}>{speed}x</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#111', padding: 16, margin: 8, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { color: '#fff', fontSize: 14, flex: 1 },
  progressBar: { height: 4, backgroundColor: '#333', borderRadius: 2, marginBottom: 6 },
  progressFill: { height: 4, backgroundColor: '#E91E63', borderRadius: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  timeText: { color: '#888', fontSize: 11 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  speedBtn: { backgroundColor: '#222', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  speedText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
});
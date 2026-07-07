import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { AVPlaybackStatus, Video } from 'expo-av';

type AutoVideoPlayerResizeMode = 'contain' | 'cover' | 'stretch';

interface AutoVideoPlayerProps {
  sourceUri?: string | null;
  shouldPlay?: boolean;
  isMuted?: boolean;
  resizeMode?: AutoVideoPlayerResizeMode;
  style?: StyleProp<ViewStyle>;
  nativeControls?: boolean;
  posterSource?: { uri: string };
  onStatusUpdate?: (status: AVPlaybackStatus) => void;
}

export default function AutoVideoPlayer({
  sourceUri,
  shouldPlay = false,
  isMuted = true,
  resizeMode = 'contain',
  style,
  nativeControls = false,
  posterSource,
  onStatusUpdate,
}: AutoVideoPlayerProps) {
  const videoRef = useRef<Video | null>(null);
  const shouldPlayRef = useRef(shouldPlay);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const isLoading = shouldPlay && (!isLoaded || isBuffering);

  const resetErrorOnUriChange = useCallback(() => {
    setIsLoaded(false);
    setIsBuffering(false);
    setPlaybackError(null);
    setRetryKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    shouldPlayRef.current = shouldPlay;
  }, [shouldPlay]);

  useEffect(() => {
    resetErrorOnUriChange();
  }, [sourceUri, resetErrorOnUriChange]);

  const handleStatusUpdate = useCallback((playbackStatus: AVPlaybackStatus) => {
    const status = playbackStatus as any;

    if (typeof status?.isLoaded === 'boolean') {
      setIsLoaded((prev) => (prev !== status.isLoaded ? status.isLoaded : prev));
    }
    if (typeof status?.isBuffering === 'boolean') {
      setIsBuffering((prev) => (prev !== status.isBuffering ? status.isBuffering : prev));
    }

    if (status?.isLoaded && !status?.error) {
      setPlaybackError(null);
    }
    if (status?.error) {
      setPlaybackError(status.error);
    }

    onStatusUpdate?.(playbackStatus);
  }, [onStatusUpdate]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.setIsMutedAsync(isMuted).catch(() => null);
  }, [isMuted]);

  useEffect(() => {
    if (!videoRef.current) return;

    videoRef.current.setStatusAsync({
      shouldPlay: Boolean(shouldPlay && sourceUri && !playbackError),
      isMuted,
    }).catch(() => null);
  }, [shouldPlay, sourceUri, playbackError, isMuted]);

  const handleRetry = useCallback(() => {
    setPlaybackError(null);
    setRetryKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    return () => {
      videoRef.current?.pauseAsync().catch(() => null);
      videoRef.current?.setStatusAsync({ shouldPlay: false }).catch(() => null);
    };
  }, []);

  return (
    <View style={[styles.container, style]}>
      {sourceUri ? (
        <Video
          key={`${sourceUri}-${retryKey}`}
          ref={videoRef}
          source={{ uri: sourceUri }}
          posterSource={posterSource}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode as any}
          shouldPlay={Boolean(shouldPlay && sourceUri && !playbackError)}
          isMuted={isMuted}
          useNativeControls={nativeControls}
          isLooping
          onPlaybackStatusUpdate={handleStatusUpdate}
        />
      ) : null}

      {isLoading && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {playbackError && (
        <View style={styles.errorOverlay} pointerEvents="box-none">
          <Text style={styles.errorText}>Gagal memuat video</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#E91E63',
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function VideoPlayerScreen({ navigation, route }: any) {
  const { videoUrl, item } = route.params || {};

  const player = useVideoPlayer(videoUrl || null, (p) => {
    p.loop = true;
    p.play();
  });

  // Stop video saat pindah screen
  useFocusEffect(
    React.useCallback(() => {
      if (videoUrl) player.play();
      return () => {
        player.pause();
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Video 9:16 */}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={true}
      />

      {/* Header overlay */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.username}>@{item?.userDisplayName}</Text>
      </View>

      {/* Caption */}
      {item?.caption ? (
        <View style={styles.captionBox}>
          <Text style={styles.caption}>{item.caption}</Text>
        </View>
      ) : null}

      {/* Text overlay */}
      {item?.textOverlay ? (
        <View style={[
          styles.overlayContainer,
          item.textPosition === 'top' ? styles.overlayTop :
          item.textPosition === 'center' ? styles.overlayCenter :
          styles.overlayBottom
        ]}>
          <Text style={[styles.overlayText, { color: item.textColor || '#fff' }]}>
            {item.textOverlay}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { width, height },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 48, gap: 12, backgroundColor: 'rgba(0,0,0,0.4)' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  username: { color: '#fff', fontWeight: 'bold', fontSize: 16, textShadowColor: '#000', textShadowRadius: 4 },
  captionBox: { position: 'absolute', bottom: 60, left: 16, right: 16 },
  caption: { color: '#fff', fontSize: 14, textShadowColor: '#000', textShadowRadius: 4 },
  overlayContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16 },
  overlayTop: { top: 100 },
  overlayCenter: { top: '45%' },
  overlayBottom: { bottom: 120 },
  overlayText: { fontSize: 22, fontWeight: 'bold', textShadowColor: '#000', textShadowRadius: 6, textAlign: 'center' },
});
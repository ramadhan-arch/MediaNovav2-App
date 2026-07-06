import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Dimensions,
  ActivityIndicator
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../utils/firebase';

const { width, height } = Dimensions.get('window');

interface Video {
  id: string;
  userDisplayName: string;
  userPhotoURL: string;
  mediaURL: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
}

interface VidioCardProps {
  video: Video;
  onLike?: (videoId: string) => void;
  onComment?: (videoId: string) => void;
}

export default function VidioCard({ video, onLike, onComment }: VidioCardProps) {
  const [liked, setLiked] = useState(video.isLiked);
  const [likesCount, setLikesCount] = useState(video.likesCount);
  const [loading, setLoading] = useState(false);

  const player = useVideoPlayer(video.mediaURL || '', (p) => {
    p.loop = true;
  });

  const handleLike = async () => {
    setLoading(true);
    try {
      const videoRef = doc(db, 'posts', video.id);
      await updateDoc(videoRef, {
        likesCount: increment(liked ? -1 : 1),
      });
      setLiked(!liked);
      setLikesCount(likesCount + (liked ? -1 : 1));
      onLike?.(video.id);
    } catch (error) {
      console.log('Error updating like:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Video */}
      <View style={styles.videoWrapper}>
        {video.mediaURL ? (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>📹</Text>
          </View>
        )}

        {/* Overlay Side Actions */}
        <View style={styles.sideActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleLike}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#E91E63" />
            ) : (
              <Text style={styles.actionIcon}>{liked ? '❤️' : '🤍'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onComment?.(video.id)}
          >
            <Text style={styles.actionIcon}>💬</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>📤</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>⋯</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <View style={styles.userSection}>
            {video.userPhotoURL ? (
              <Image
                source={{ uri: video.userPhotoURL }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {video.userDisplayName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.username}>{video.userDisplayName}</Text>
              <Text style={styles.caption} numberOfLines={1}>
                {video.caption}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <Text style={styles.statText}>{likesCount}</Text>
            <Text style={styles.statText}>{video.commentsCount}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  placeholderText: {
    fontSize: 48,
  },
  sideActions: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  caption: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  stats: {
    alignItems: 'center',
    marginLeft: 12,
  },
  statText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Dimensions,
  Alert, ActivityIndicator
} from 'react-native';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../utils/firebase';

const { width } = Dimensions.get('window');

interface Post {
  id: string;
  userDisplayName: string;
  userPhotoURL: string;
  mediaURL: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
}

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
}

export default function PostCard({ post, onLike, onComment }: PostCardProps) {
  const [loading, setLoading] = useState(false);
  const [liked, setLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);

  const handleLike = async () => {
    setLoading(true);
    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        likesCount: increment(liked ? -1 : 1),
      });
      setLiked(!liked);
      setLikesCount(likesCount + (liked ? -1 : 1));
      onLike?.(post.id);
    } catch (error) {
      Alert.alert('Error', 'Gagal update like');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {post.userPhotoURL ? (
            <Image source={{ uri: post.userPhotoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {post.userDisplayName?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={styles.username}>{post.userDisplayName}</Text>
        </View>
        <Text style={styles.moreBtn}>⋮</Text>
      </View>

      {/* Image */}
      {post.mediaURL && (
        <Image
          source={{ uri: post.mediaURL }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
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
          onPress={() => onComment?.(post.id)}
        >
          <Text style={styles.actionIcon}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionIcon}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <Text style={styles.statText}>{likesCount} likes</Text>
        <Text style={styles.statText}>{post.commentsCount} comments</Text>
      </View>

      {/* Caption */}
      <View style={styles.caption}>
        <Text style={styles.captionUser}>{post.userDisplayName}</Text>
        <Text style={styles.captionText}>{post.caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: width,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  moreBtn: {
    fontSize: 20,
    color: '#888',
  },
  image: {
    width: '100%',
    height: width,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 20,
  },
  stats: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  statText: {
    color: '#888',
    fontSize: 12,
  },
  caption: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  captionUser: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  captionText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
});
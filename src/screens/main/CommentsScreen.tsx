import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert, Image, Dimensions, Platform, StatusBar
} from 'react-native';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useStore } from '../../store/useStore';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#FF0050',
  secondary: '#6366F1',
  dark: '#0A0E27',
  darkSecondary: '#1A1F3A',
  text: '#FFFFFF',
  textSecondary: '#A0AEC0',
};

export default function CommentsScreen({ route, navigation }: any) {
  const { postId } = route.params;
  const { currentUser } = useStore();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'comments'), where('postId', '==', postId));
      const snapshot = await getDocs(q);
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
      setComments(fetchedComments);
    } catch (error) {
      console.log('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Komentar tidak boleh kosong');
      return;
    }

    setPosting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        postId,
        userId: currentUser?.uid,
        userDisplayName: currentUser?.displayName,
        userPhotoURL: currentUser?.photoURL,
        text: newComment,
        createdAt: serverTimestamp(),
      });
      setNewComment('');
      fetchComments();
      Alert.alert('Berhasil', 'Komentar posted!');
    } catch (error) {
      Alert.alert('Error', 'Gagal post komentar');
    } finally {
      setPosting(false);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Now';
    const date = timestamp.toDate?.() || new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'Now';
  };

  const renderComment = ({ item }: any) => (
    <View style={styles.commentItem}>
      {item.userPhotoURL ? (
        <Image source={{ uri: item.userPhotoURL }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{getInitials(item.userDisplayName)}</Text>
        </View>
      )}
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUser}>{item.userDisplayName}</Text>
          <Text style={styles.commentTime}>{getTimeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments ({comments.length})</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Comments List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment!</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input Box */}
      <View style={styles.inputContainer}>
        {currentUser?.photoURL ? (
          <Image source={{ uri: currentUser.photoURL }} style={styles.inputAvatar} />
        ) : (
          <View style={styles.inputAvatarPlaceholder}>
            <Text style={styles.inputAvatarText}>{getInitials(currentUser?.displayName || 'User')}</Text>
          </View>
        )}
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            placeholder="Tulis komentar..."
            placeholderTextColor={COLORS.textSecondary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={200}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, posting && styles.sendBtnDisabled]}
          onPress={handleAddComment}
          disabled={posting || !newComment.trim()}
        >
          {posting ? (
            <ActivityIndicator color={COLORS.text} size="small" />
          ) : (
            <Text style={styles.sendBtnText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkSecondary,
  },
  backBtn: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUser: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 13,
  },
  commentTime: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  commentText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkSecondary,
    gap: 10,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  inputAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputAvatarText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 11,
  },
  inputBox: {
    flex: 1,
    backgroundColor: COLORS.darkSecondary,
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  input: {
    color: COLORS.text,
    fontSize: 13,
    paddingVertical: 8,
    maxHeight: 80,
  },
  sendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
  },
});

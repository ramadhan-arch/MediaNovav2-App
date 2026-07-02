import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Image,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import {
  collection, query, orderBy, limit, getDocs,
  doc, updateDoc, increment, addDoc, serverTimestamp,
  startAfter, QueryDocumentSnapshot, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../utils/firebase';
import { useStore } from '../../store/useStore';
import AudioPlayer from '../../components/AudioPlayer';

const POSTS_PER_PAGE = 10; // Batasi 10 post per load biar ga OOM

export default function FeedScreen({ navigation }: any) {
  const { posts, setPosts, currentUser, updateCurrentUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [commentModal, setCommentModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [feedMode, setFeedMode] = useState<'forYou' | 'following'>('forYou');
  const followingKey = currentUser?.following?.join(',') || '';
  const likedPostsKey = currentUser?.likedPosts?.join(',') || '';

  const applyFeedMode = useCallback((items: any[]) => {
    if (feedMode === 'following' && currentUser?.following?.length) {
      return items.filter((post) => currentUser.following.includes(post.userId));
    }
    return items;
  }, [feedMode, currentUser?.following]);

  const fetchPosts = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(POSTS_PER_PAGE)
      );
      const snapshot = await getDocs(q);
      const likedPosts = currentUser?.likedPosts || [];
      const allPosts = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        isLiked: likedPosts.includes(d.id),
      })) as any[];

      const filteredPosts = applyFeedMode(allPosts);

      setPosts(filteredPosts);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || !lastDoc) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(POSTS_PER_PAGE)
      );
      const snapshot = await getDocs(q);
      const morePosts = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        isLiked: false,
      })) as any[];
      const filteredMorePosts = applyFeedMode(morePosts);
      const mergedPosts = [...posts, ...filteredMorePosts];
      setPosts(mergedPosts);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
    } catch (e) {
      console.log(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!currentUser?.uid) return;
    try {
      await updateDoc(doc(db, 'posts', postId), {
        likesCount: increment(isLiked ? -1 : 1)
      });
      await updateDoc(doc(db, 'users', currentUser.uid), {
        likedPosts: isLiked ? arrayRemove(postId) : arrayUnion(postId)
      });
      updateCurrentUser({
        likedPosts: isLiked
          ? (currentUser.likedPosts || []).filter((id) => id !== postId)
          : [...(currentUser.likedPosts || []), postId]
      });
      const updatedPosts = posts.map((p) => p.id === postId ? {
        ...p,
        isLiked: !isLiked,
        likesCount: (p.likesCount || 0) + (isLiked ? -1 : 1)
      } : p);
      useStore.getState().setPosts(updatedPosts);
    } catch (error) {
      console.log(error);
    }
  };

  const openComments = async (postId: string) => {
    setSelectedPostId(postId);
    setCommentModal(true);
    setComments([]);
    try {
      const q = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.log(e); }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const commentData = {
        userId: currentUser?.uid,
        userDisplayName: currentUser?.displayName,
        text: commentText,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'posts', selectedPostId, 'comments'), commentData);
      await updateDoc(doc(db, 'posts', selectedPostId), { commentsCount: increment(1) });
      setComments(prev => [{ id: Date.now().toString(), ...commentData, createdAt: new Date() }, ...prev]);
      useStore.getState().updatePost(selectedPostId, {
        commentsCount: (posts.find(p => p.id === selectedPostId)?.commentsCount || 0) + 1
      });
      setCommentText('');
    } catch (e) {
      Alert.alert('Error', 'Gagal kirim komentar');
    } finally {
      setCommentLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, [currentUser?.uid, followingKey, likedPostsKey, feedMode]);

  const renderPost = useCallback(({ item }: any) => {
    const isLikedByUser = currentUser?.likedPosts?.includes(item.id) ?? item.isLiked;

    return (
    <View style={styles.postCard}>
      {/* Header */}
      <TouchableOpacity
        style={styles.postHeader}
        onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.userDisplayName?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.username}>{item.userDisplayName}</Text>
          <Text style={styles.postTime}>
            {item.createdAt?.toDate?.()?.toLocaleDateString('id-ID') || ''}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Media */}
      {item.mediaType === 'image' && item.mediaURL ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.mediaURL }}
            style={styles.postImage}
            resizeMode="cover"
          />
          {/* Text overlay di atas gambar */}
          {item.textOverlay ? (
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
      ) : item.mediaType === 'video' && item.mediaURL ? (
        <TouchableOpacity
          style={styles.videoBox}
          onPress={() => navigation.navigate('VideoPlayer', { videoUrl: item.mediaURL, item })}
        >
          <Ionicons name="play-circle" size={56} color="#E91E63" />
          <Text style={styles.videoText}>Tap untuk putar video</Text>
        </TouchableOpacity>
      ) : item.mediaType === 'audio' && item.mediaURL ? (
        <AudioPlayer uri={item.mediaURL} caption={item.caption} />
      ) : null}

      {/* Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleLike(item.id, isLikedByUser)}
        >
          <Ionicons
            name={isLikedByUser ? 'heart' : 'heart-outline'}
            size={24}
            color={isLikedByUser ? '#E91E63' : '#fff'}
          />
          <Text style={styles.actionCount}>{item.likesCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openComments(item.id)}
        >
          <Ionicons name="chatbubble-outline" size={22} color="#fff" />
          <Text style={styles.actionCount}>{item.commentsCount || 0}</Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {item.caption ? (
        <Text style={styles.caption}>
          <Text style={styles.captionName}>{item.userDisplayName} </Text>
          {item.caption}
        </Text>
      ) : null}
    </View>
    );
  }, [posts, currentUser?.likedPosts]);

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎬 MediaNova</Text>
      </View>

      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, feedMode === 'forYou' && styles.modeTabActive]}
          onPress={() => setFeedMode('forYou')}
        >
          <Text style={[styles.modeTabText, feedMode === 'forYou' && styles.modeTabTextActive]}>For You</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, feedMode === 'following' && styles.modeTabActive]}
          onPress={() => setFeedMode('following')}
        >
          <Text style={[styles.modeTabText, feedMode === 'following' && styles.modeTabTextActive]}>Following</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPosts(true)}
            tintColor="#E91E63"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={5}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color="#E91E63" style={{ padding: 16 }} /> : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {feedMode === 'following' && (!currentUser?.following?.length)
                ? 'Ikuti creator untuk melihat feed Following'
                : 'Belum ada post 🎬'}
            </Text>
          </View>
        }
      />

      {/* Comment Modal */}
      <Modal
        visible={commentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Komentar</Text>
              <TouchableOpacity onPress={() => setCommentModal(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              style={styles.commentList}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {item.userDisplayName?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentContent}>
                    <Text style={styles.commentName}>{item.userDisplayName}</Text>
                    <Text style={styles.commentText}>{item.text}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.noComments}>Belum ada komentar</Text>
              }
            />
            <View style={styles.commentInputBox}>
              <TextInput
                style={styles.commentInput}
                placeholder="Tulis komentar..."
                placeholderTextColor="#888"
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleComment}
                disabled={commentLoading}
              >
                {commentLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="send" size={20} color="#fff" />
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modeTabs: { flexDirection: 'row', backgroundColor: '#111', padding: 8, gap: 8, marginHorizontal: 12, borderRadius: 16, marginBottom: 8 },
  modeTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  modeTabActive: { backgroundColor: '#E91E63' },
  modeTabText: { color: '#888', fontWeight: '600' },
  modeTabTextActive: { color: '#fff' },
  postCard: { marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#111' },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  username: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  postTime: { color: '#888', fontSize: 11 },
  // Image 1:1 ratio
  imageContainer: { width: '100%', aspectRatio: 1, position: 'relative' },
  postImage: { width: '100%', height: '100%' },
  overlayContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16 },
  overlayTop: { top: 16 },
  overlayCenter: { top: '45%' },
  overlayBottom: { bottom: 16 },
  overlayText: { fontSize: 20, fontWeight: 'bold', textShadowColor: '#000', textShadowRadius: 6, textAlign: 'center' },
  videoBox: { width: '100%', aspectRatio: 9/16, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', gap: 8 },
  videoText: { color: '#888', fontSize: 13 },
  postActions: { flexDirection: 'row', padding: 12, gap: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { color: '#fff', fontSize: 14 },
  caption: { color: '#aaa', paddingHorizontal: 12, paddingBottom: 12, fontSize: 14 },
  captionName: { color: '#fff', fontWeight: 'bold' },
  emptyContainer: { flex: 1, alignItems: 'center', padding: 40 },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  commentList: { maxHeight: 350 },
  commentItem: { flexDirection: 'row', padding: 12, gap: 10 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  commentContent: { flex: 1 },
  commentName: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  commentText: { color: '#aaa', fontSize: 14 },
  noComments: { color: '#888', textAlign: 'center', padding: 20 },
  commentInputBox: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#222' },
  commentInput: { flex: 1, backgroundColor: '#222', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, color: '#fff' },
  sendBtn: { backgroundColor: '#E91E63', borderRadius: 20, width: 40, justifyContent: 'center', alignItems: 'center' },
});
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  RefreshControl, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
  ViewToken, Animated, StatusBar
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  collection, query, orderBy, limit, getDocs,
  doc, updateDoc, increment, addDoc, serverTimestamp,
  startAfter, QueryDocumentSnapshot, arrayUnion, arrayRemove, deleteDoc
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useIsFocused } from '@react-navigation/native';
import { db } from '../../utils/firebase';
import { useStore } from '../../store/useStore';
import AudioPlayer from '../../components/AudioPlayer';

const POSTS_PER_PAGE = 10; // Batasi 10 post per load biar ga OOM

// ----- Post item dipisah jadi komponen sendiri + memo, biar video lain ga ikut re-render -----
const PostItem = memo(function PostItem({
  item,
  isLikedByUser,
  isActive,
  isMuted,
  isOwner,
  onToggleMute,
  onOpenUserProfile,
  onOpenVideoFullscreen,
  onLike,
  onOpenComments,
  onSave,
  onDelete,
}: any) {
  // double-tap detection and heart animation
  const lastTapRef = useRef<number>(0);
  const singleTapTimeout = useRef<any>(null);
  const heartAnim = useRef(new Animated.Value(0)).current;

  const runHeart = () => {
    heartAnim.setValue(0);
    Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 0, duration: 360, delay: 200, useNativeDriver: true })
    ]).start();
  };

  const handleTap = () => {
    const now = Date.now();
    if (lastTapRef.current && (now - lastTapRef.current) < 300) {
      clearTimeout(singleTapTimeout.current);
      lastTapRef.current = 0;
      // double tap -> like
      onLike && onLike();
      runHeart();
    } else {
      lastTapRef.current = now;
      singleTapTimeout.current = setTimeout(() => {
        // single tap -> toggle mute
        onToggleMute && onToggleMute();
        lastTapRef.current = 0;
      }, 300);
    }
  };

  useEffect(() => () => clearTimeout(singleTapTimeout.current), []);
  return (
    <View style={styles.postCard}>
      {/* Header */}
      <TouchableOpacity style={styles.postHeader} onPress={onOpenUserProfile}>
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
          <ExpoImage source={{ uri: item.mediaURL }} style={styles.postImage} contentFit="contain" />
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
        <View style={styles.videoContainer}>
          {/* Use responder overlay to detect single vs double tap */}
          <TouchableWithoutFeedback onPress={handleTap}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="box-none" />
          </TouchableWithoutFeedback>
          {/* Thumbnail sebagai background */}
          {item.thumbnailURL && (
            <ExpoImage
              source={{ uri: item.thumbnailURL }}
              style={styles.videoThumbnail}
              contentFit="contain"
            />
          )}

          <Video
            source={{ uri: item.mediaURL }}
            style={styles.videoPlayer}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={isActive}
            isLooping
            isMuted={isMuted}
            useNativeControls={false}
          />

          {/* Indikator play/pause halus saat tidak aktif */}
          {!isActive && (
            <View style={styles.videoPauseOverlay}>
              <Ionicons name="play" size={40} color="rgba(255,255,255,0.85)" />
            </View>
          )}

          {/* Heart animation on double-tap */}
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: '45%', top: '42%', transform: [{ scale: heartAnim.interpolate({ inputRange: [0,1], outputRange: [0.6,1.4] }) }], opacity: heartAnim }}>
            <Ionicons name="heart" size={96} color={'#E91E63'} />
          </Animated.View>

          <View style={styles.videoControlsOverlay} pointerEvents="box-none">
            <TouchableOpacity style={styles.sideControlButton} onPress={onToggleMute}>
              <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sideControlButton}
              onPress={(e) => {
                e.stopPropagation();
                onOpenVideoFullscreen();
              }}
            >
              <Ionicons name="expand" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : item.mediaType === 'audio' && item.mediaURL ? (
        <AudioPlayer uri={item.mediaURL} caption={item.caption} />
      ) : null}

      {/* Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLike}>
          <Ionicons
            name={isLikedByUser ? 'heart' : 'heart-outline'}
            size={24}
            color={isLikedByUser ? '#E91E63' : '#fff'}
          />
          <Text style={styles.actionCount}>{item.likesCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onOpenComments}>
          <Ionicons name="chatbubble-outline" size={22} color="#fff" />
          <Text style={styles.actionCount}>{item.commentsCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onSave(item.id)}>
          <Ionicons name={item.isSaved ? 'bookmark' : 'bookmark-outline'} size={22} color={item.isSaved ? '#E91E63' : '#fff'} />
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete && onDelete()}>
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        )}
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
});

export default function FeedScreen({ navigation }: any) {
  const { posts, setPosts, currentUser, updateCurrentUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<any>(null);
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

  // ----- Autoplay / autopause state -----
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true); // default muted, ala TikTok/Reels
  const isFocused = useIsFocused(); // pause semua video kalau screen ga lagi difokus

  const applyFeedMode = useCallback((items: any[]) => {
    if (feedMode === 'following') {
      // Jika following kosong, return array kosong (bukan semua posts)
      if (!currentUser?.following?.length) {
        return [];
      }
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
      const savedPosts = currentUser?.savedPosts || [];
      const allPosts = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        isLiked: likedPosts.includes(d.id),
        isSaved: savedPosts.includes(d.id),
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
        isSaved: (currentUser?.savedPosts || []).includes(d.id),
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
      setPosts(updatedPosts);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSave = async (postId: string) => {
    if (!currentUser?.uid) {
      Alert.alert('Error', 'Harus login untuk menyimpan postingan');
      return;
    }
    try {
      const isSaved = (currentUser.savedPosts || []).includes(postId);
      if (isSaved) {
        await updateDoc(doc(db, 'users', currentUser.uid), { savedPosts: arrayRemove(postId) });
        updateCurrentUser({ savedPosts: (currentUser.savedPosts || []).filter((id) => id !== postId) });
      } else {
        await updateDoc(doc(db, 'users', currentUser.uid), { savedPosts: arrayUnion(postId) });
        updateCurrentUser({ savedPosts: [...(currentUser.savedPosts || []), postId] });
      }
      // update local posts state
      const updatedPosts = posts.map((p) => p.id === postId ? { ...p, isSaved: !isSaved } : p);
      setPosts(updatedPosts);
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Gagal mengubah status simpan');
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

  useEffect(() => { fetchPosts(); }, [currentUser?.uid, followingKey, feedMode]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('scrollToTop', () => {
      if (listRef.current) {
        listRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    });
    return unsubscribe;
  }, [navigation]);

  // Re-apply filter ke existing posts secara immediate saat feedMode berubah
  // (tanpa perlu tunggu fetchPosts selesai, untuk UX yang lebih smooth)
  useEffect(() => {
    if (posts.length > 0) {
      let filtered: any[] = [];
      if (feedMode === 'following') {
        if (!currentUser?.following?.length) {
          filtered = [];
        } else {
          filtered = posts.filter((post) => currentUser.following.includes(post.userId));
        }
      } else {
        filtered = posts;
      }
      setPosts(filtered);
    }
  }, [feedMode, followingKey]);

  // ----- Viewability: tentukan post mana yang lagi "aktif" (kelihatan) di layar -----
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60, // dianggap aktif kalau minimal 60% post kelihatan
    minimumViewTime: 150,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        // ambil item paling atas yang kelihatan sebagai yang "aktif"
        const topVisible = viewableItems[0];
        setActivePostId(topVisible.item?.id ?? null);
      } else {
        setActivePostId(null);
      }
    }
  ).current;

  // Video hanya boleh play kalau: post-nya aktif di layar, screen lagi difokus,
  // dan modal komentar sedang tidak terbuka (biar ga numpuk sama audio komentar)
  const isPostActive = useCallback(
    (postId: string) => postId === activePostId && isFocused && !commentModal,
    [activePostId, isFocused, commentModal]
  );

  const renderPost = useCallback(({ item }: any) => {
    const isLikedByUser = currentUser?.likedPosts?.includes(item.id) ?? item.isLiked;

    return (
      <PostItem
        item={item}
        isLikedByUser={isLikedByUser}
        isActive={isPostActive(item.id)}
        isMuted={isMuted}
        isOwner={currentUser?.uid === item.userId}
        onToggleMute={() => setIsMuted((m) => !m)}
        onOpenUserProfile={() => navigation.navigate('UserProfile', { userId: item.userId })}
        onOpenVideoFullscreen={() => navigation.navigate('VideoPlayer', { videoUrl: item.mediaURL, item })}
        onLike={() => handleLike(item.id, item.isLiked ?? (currentUser?.likedPosts?.includes(item.id)))}
        onOpenComments={() => openComments(item.id)}
        onSave={handleSave}
        onDelete={() => handleDelete(item.id)}
      />
    );
  }, [posts, currentUser?.likedPosts, isPostActive, isMuted]);

  const handleDelete = async (postId: string) => {
    if (!currentUser?.uid) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.userId !== currentUser.uid) {
      Alert.alert('Tidak diizinkan', 'Hanya pemilik postingan yang bisa menghapus.');
      return;
    }
    Alert.alert(
      'Hapus postingan',
      'Yakin ingin menghapus postingan ini? Tindakan ini tidak bisa dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive', onPress: async () => {
            try {
              await deleteDoc(doc(db, 'posts', postId));
              // Update local posts state
              const updated = posts.filter(p => p.id !== postId);
              useStore.getState().setPosts(updated);
              // Remove from user's savedPosts if present
              if ((currentUser.savedPosts || []).includes(postId)) {
                try {
                  await updateDoc(doc(db, 'users', currentUser.uid), { savedPosts: arrayRemove(postId) });
                } catch (e) { console.log('failed remove saved ref', e); }
                updateCurrentUser({ savedPosts: (currentUser.savedPosts || []).filter(id => id !== postId) });
              }
            } catch (e) {
              console.log(e);
              Alert.alert('Error', 'Gagal menghapus postingan');
            }
          }
        }
      ]
    );
  };

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
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <View style={{ position: 'relative' }}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>3</Text>
            </View>
          </View>
        </TouchableOpacity>
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
        ref={listRef}
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
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 48, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  notificationBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: '#E91E63', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  notificationCount: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
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
  // Image 1:1 ratio container, keep original aspect ratio inside
  imageContainer: { width: '100%', aspectRatio: 1, position: 'relative', backgroundColor: '#000', overflow: 'hidden' },
  postImage: { width: '100%', height: '100%', backgroundColor: '#000' },
  overlayContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16 },
  overlayTop: { top: 16 },
  overlayCenter: { top: '45%' },
  overlayBottom: { bottom: 16 },
  overlayText: { fontSize: 20, fontWeight: 'bold', textShadowColor: '#000', textShadowRadius: 6, textAlign: 'center' },
  // Video 9:16 container, keep original aspect ratio inside
  videoContainer: { width: '100%', aspectRatio: 9 / 16, backgroundColor: '#000', position: 'relative', overflow: 'hidden' },
  videoThumbnail: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, backgroundColor: '#000' },
  videoPlayer: { width: '100%', height: '100%', backgroundColor: '#000' },
  videoPauseOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)',
  },
  videoControlsOverlay: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: 64, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 16,
    backgroundColor: 'transparent', zIndex: 5,
  },
  sideControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  fullscreenBtn: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  muteIndicator: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14,
    width: 28, height: 28, justifyContent: 'center', alignItems: 'center',
  },
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
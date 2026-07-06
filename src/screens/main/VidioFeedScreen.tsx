import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, Dimensions,
  TouchableOpacity, ViewToken, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  Alert, StatusBar, RefreshControl, Image, Animated,
  Share
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, updateDoc, increment, addDoc, serverTimestamp,
  arrayUnion, arrayRemove, onSnapshot
} from 'firebase/firestore';
import * as MediaLibrary from 'expo-media-library';
import { db } from '../../utils/firebase';
import { useStore } from '../../store/useStore';

const initialWindow = Dimensions.get('window');

// Komponen per item video
const VideoItem = React.memo(({ item, isActive, isLikedByUser, onLike, onComment, onSave, onShare, containerHeight, videoHeight, videoWidth, videoTopOffset, bottomOffset }: any) => {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<any>(null);

  const player = useVideoPlayer(item.mediaURL || null, (p) => {
    p.loop = true;
  });

  // Play/pause saat jadi active atau tidak
  useEffect(() => {
    if (isActive && item.mediaURL) {
      if (!isPaused) player.play();
    } else {
      player.pause();
    }
    return () => {
      clearInterval(progressInterval.current);
    };
  }, [isActive]);

  // Update progress bar setiap 500ms
  useEffect(() => {
    if (isActive && !isPaused) {
      progressInterval.current = setInterval(() => {
        try {
          const duration = player.duration;
          const current = player.currentTime;
          if (duration > 0) {
            setProgress(current / duration);
          }
        } catch (e) {}
      }, 500);
    } else {
      clearInterval(progressInterval.current);
    }
    return () => clearInterval(progressInterval.current);
  }, [isActive, isPaused]);

  const togglePause = () => {
    if (isPaused) {
      player.play();
      setIsPaused(false);
    } else {
      player.pause();
      setIsPaused(true);
    }
  };

  // Double-tap to like: detect quick successive taps
  const lastTapRef = useRef<number>(0);
  const singleTapTimeout = useRef<any>(null);
  const heartAnim = useRef(new Animated.Value(0)).current;

  const runHeart = () => {
    heartAnim.setValue(0);
    Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 0, duration: 400, delay: 200, useNativeDriver: true })
    ]).start();
  };

  const handleDoubleTap = () => {
    // trigger like and animation
    onLike(item.id, isLikedByUser);
    runHeart();
  };

  const handleTap = () => {
    const now = Date.now();
    if (lastTapRef.current && (now - lastTapRef.current) < 300) {
      // double tap
      clearTimeout(singleTapTimeout.current);
      lastTapRef.current = 0;
      handleDoubleTap();
    } else {
      lastTapRef.current = now;
      // single tap after delay
      singleTapTimeout.current = setTimeout(() => {
        togglePause();
        lastTapRef.current = 0;
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(singleTapTimeout.current);
    };
  }, []);

    return (
    <View style={[styles.videoContainer, { height: containerHeight, width: videoWidth, justifyContent: 'center' }]}> 
      {item.mediaURL ? (
          <View style={[styles.fullscreenVideoWrapper, { height: videoHeight, marginTop: -(videoTopOffset || 0) }]}> 
            <VideoView
              player={player}
              style={{ width: '100%', height: videoHeight }}
              contentFit="contain"
              nativeControls={false}
            />
            {/* Transparent overlay to capture taps reliably (single + double tap) */}
            <View
              style={styles.touchOverlay}
              onStartShouldSetResponder={() => true}
              onResponderRelease={handleTap}
            />
          {/* Pause indicator */}
          {isPaused && (
            <View style={styles.pauseOverlay}>
              <Ionicons name="play-circle" size={80} color="rgba(255,255,255,0.8)" />
            </View>
          )}
          {/* Double-tap heart animation */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: '45%',
              left: '45%',
              transform: [
                { scale: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) }
              ],
              opacity: heartAnim,
            }}
          >
            <Ionicons name="heart" size={96} color={'#E91E63'} />
          </Animated.View>
        </View>
      ) : (
        <View style={[styles.fullscreenNoVideo, { height: videoHeight }]}> 
          <Text style={styles.noVideoText}>🎬</Text>
        </View>
      )}

      {/* Progress bar tipis di bawah */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Overlay UI */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Kanan: action buttons */}
        <View style={[styles.rightActions, { bottom: 100 }]}> 
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onLike(item.id, isLikedByUser)}
          >
            <Ionicons
              name={isLikedByUser ? 'heart' : 'heart-outline'}
              size={32}
              color={isLikedByUser ? '#E91E63' : '#fff'}
            />
            <Text style={styles.actionText}>{item.likesCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onComment(item.id)}
          >
            <Ionicons name="chatbubble-outline" size={30} color="#fff" />
            <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onSave(item.mediaURL, item.id)}
          >
            <Ionicons
              name={item.isSaved ? 'bookmark' : 'bookmark-outline'}
              size={30}
              color={item.isSaved ? '#E91E63' : '#fff'}
            />
            <Text style={styles.actionText}>Simpan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => onShare(item)}>
            <Ionicons name="arrow-redo-outline" size={30} color="#fff" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Bawah: info video */}
          <View style={[styles.bottomInfo, { bottom: (bottomOffset || 70) }]}> 
          <View style={styles.bottomRow}>
            {item.userPhotoURL ? (
              <Image source={{ uri: item.userPhotoURL }} style={styles.avatarSmall} />
            ) : (
              <View style={styles.avatarSmallPlaceholder}>
                <Text style={styles.avatarSmallText}>{(item.userDisplayName || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.videoUsername}>@{item.userDisplayName}</Text>
              <Text style={styles.videoCaption} numberOfLines={2}>
                {item.caption}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

export default function VideoFeedScreen({ navigation }: any) {
  const { currentUser, updateCurrentUser } = useStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFocused, setIsFocused] = useState(true);
  const [commentModal, setCommentModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [repliesMap, setRepliesMap] = useState<Record<string, any[]>>({});
  const [repliesVisible, setRepliesVisible] = useState<Record<string, boolean>>({});
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyPlaceholder, setReplyPlaceholder] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [screenSize, setScreenSize] = useState(initialWindow);

  useEffect(() => {
    const onChange = ({ window }: any) => setScreenSize(window);
    // Support both old and new RN APIs for Dimensions event subscriptions
    const subscription: any = (Dimensions as any).addEventListener
      ? (Dimensions as any).addEventListener('change', onChange)
      : null;
    return () => {
      // Newer RN: subscription has .remove()
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      // Older RN: fallback to removeEventListener if available
      } else if (typeof (Dimensions as any).removeEventListener === 'function') {
        (Dimensions as any).removeEventListener('change', onChange);
      }
    };
  }, []);

  // Use a consistent 9:16 video box ratio for the player
  const VIDEO_BOX_RATIO_WIDTH = 9;
  const VIDEO_BOX_RATIO_HEIGHT = 16;
  const VIDEO_BOX_WIDTH = screenSize.width;
  // Use a 9:16 portrait video box (classic portrait video)
  const VIDEO_BOX_HEIGHT = Math.round((VIDEO_BOX_WIDTH * VIDEO_BOX_RATIO_HEIGHT) / VIDEO_BOX_RATIO_WIDTH);
  const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 20;
  const TOP_RESERVED = STATUS_BAR_HEIGHT + 56; // space for modeTabs + status bar
  const BOTTOM_RESERVED = 90; // ensure overlays sit above bottom nav
  // Item height is video box plus reserved spaces so paging centers the video
  const ITEM_HEIGHT = VIDEO_BOX_HEIGHT + TOP_RESERVED + BOTTOM_RESERVED;

  const [feedMode, setFeedMode] = useState<'forYou' | 'following'>('forYou');
  const followingKey = currentUser?.following?.join(',') || '';

  // Ref untuk likedPosts & following supaya fetchVideos TIDAK ikut berubah identitas
  // setiap kali user like/unlike (itu penyebab bug "blank ke atas").
  const likedPostsRef = useRef<string[]>(currentUser?.likedPosts || []);
  const followingRef = useRef<string[]>(currentUser?.following || []);
  const savedPostsRef = useRef<string[]>(currentUser?.savedPosts || []);
  useEffect(() => {
    likedPostsRef.current = currentUser?.likedPosts || [];
  }, [currentUser?.likedPosts]);
  useEffect(() => {
    followingRef.current = currentUser?.following || [];
  }, [followingKey]);
  useEffect(() => {
    savedPostsRef.current = currentUser?.savedPosts || [];
  }, [currentUser?.savedPosts]);

  // Stop video saat pindah screen
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
      };
    }, [])
  );

  const fetchVideos = useCallback(async (refresh = false) => {
    const currentVisibleId = videos[activeIndex]?.id;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        where('mediaType', '==', 'video'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const likedPosts = likedPostsRef.current;
      const following = followingRef.current;
      const allVideos: any[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        isLiked: likedPosts.includes(d.id),
        isSaved: savedPostsRef.current.includes(d.id),
      }));
      let filteredVideos: any[] = [];
      if (feedMode === 'following') {
        // Jika following kosong, return array kosong (bukan semua videos)
        if (!following.length) {
          filteredVideos = [];
        } else {
          filteredVideos = allVideos.filter((video) => video.userId && following.includes(video.userId));
        }
      } else {
        filteredVideos = allVideos;
      }
      setVideos(filteredVideos);
      // Try to preserve currently visible video after refresh to avoid jumpiness
      if (refresh && currentVisibleId) {
        const newIndex = filteredVideos.findIndex(v => v.id === currentVisibleId);
        if (newIndex >= 0) {
          setActiveIndex(newIndex);
          try { listRef.current?.scrollToIndex({ index: newIndex, animated: false }); } catch (e) {}
        } else {
          // if current video disappeared, keep user near top
          try { listRef.current?.scrollToIndex({ index: 0, animated: false }); } catch (e) {}
          setActiveIndex(0);
        }
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // Sengaja TIDAK menaruh currentUser?.likedPosts / followingKey di sini,
    // supaya like/unlike tidak memicu fetch ulang seluruh list.
  }, [currentUser?.uid, feedMode, followingKey]);

  const handleLike = useCallback(async (postId: string, isLiked: boolean) => {
    if (!currentUser?.uid) return;
    // Update UI dulu (optimistic) biar responsif, tanpa nge-refetch apa pun.
    setVideos(prev => prev.map(v =>
      v.id === postId
        ? { ...v, isLiked: !isLiked, likesCount: (v.likesCount || 0) + (isLiked ? -1 : 1) }
        : v
    ));
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
    } catch (e) {
      console.log(e);
      // Rollback kalau gagal
      setVideos(prev => prev.map(v =>
        v.id === postId
          ? { ...v, isLiked, likesCount: (v.likesCount || 0) + (isLiked ? 1 : -1) }
          : v
      ));
    }
  }, [currentUser?.uid, currentUser?.likedPosts, updateCurrentUser]);

  const handleSave = useCallback(async (mediaURL: string, postId: string) => {
    // Toggle bookmark (saved posts) in user's document
    if (!currentUser?.uid) {
      Alert.alert('Error', 'Harus login untuk menyimpan postingan');
      return;
    }
    try {
      // Use latest savedPosts from ref
      const isCurrentlySaved = savedPostsRef.current.includes(postId);
      if (isCurrentlySaved) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          savedPosts: arrayRemove(postId)
        });
        updateCurrentUser({ savedPosts: ((currentUser?.savedPosts) || []).filter((id: string) => id !== postId) });
        setVideos(prev => prev.map(v => v.id === postId ? { ...v, isSaved: false } : v));
      } else {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          savedPosts: arrayUnion(postId)
        });
        updateCurrentUser({ savedPosts: [...((currentUser?.savedPosts) || []), postId] });
        // mark saved in UI
        setVideos(prev => prev.map(v => v.id === postId ? { ...v, isSaved: true } : v));

        // If the post is a video but missing a thumbnail, try to generate a Cloudinary thumbnail URL
        const post = videos.find(v => v.id === postId);
        try {
          if (post && post.mediaType === 'video' && !post.thumbnailURL && post.mediaURL && post.mediaURL.includes('/upload/')) {
            const thumbnailUrl = post.mediaURL.replace('/upload/', '/upload/c_fill,w_400,h_600,g_auto/so_0/');
            await updateDoc(doc(db, 'posts', postId), { thumbnailURL: thumbnailUrl });
            // update local state
            setVideos(prev => prev.map(v => v.id === postId ? { ...v, thumbnailURL: thumbnailUrl } : v));
          }
        } catch (thumbErr) {
          console.log('Thumbnail generation failed', thumbErr);
        }
      }
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Gagal menyimpan postingan');
    }
  }, [currentUser?.uid, currentUser?.savedPosts, updateCurrentUser, videos]);

  const handleShare = useCallback(async (video: any) => {
    if (!video) {
      Alert.alert('Gagal', 'Konten tidak ditemukan untuk dibagikan.');
      return;
    }
    try {
      const url = video.mediaURL || video.videoUrl || video.imageUrl || '';
      const caption = video.caption || '';
      const text = url ? `${caption}\n\nLihat: ${url}` : caption;
      const shareOptions: any = { message: text };
      if (url) shareOptions.url = url;

      await Share.share(shareOptions);
      try {
        if (video.id) await updateDoc(doc(db, 'posts', video.id), { shareCount: increment(1) });
      } catch (e) {
        console.log('share update failed', e);
      }
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, shareCount: (v.shareCount || 0) + 1 } : v));
    } catch (e) {
      console.log('Share failed', e);
      Alert.alert('Gagal', 'Tidak dapat membagikan konten ini.');
    }
  }, []);

  const openComments = useCallback(async (postId: string) => {
    setSelectedPostId(postId);
    setCommentModal(true);
    setComments([]);
    setRepliesMap({});
    setRepliesVisible({});
    setReplyTo(null);
    setReplyText('');
    setReplyPlaceholder(null);
    try {
      const q = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      (openComments as any).unsubscribe = unsubscribe;
    } catch (e) { console.log(e); }
  }, []);

  const closeComments = useCallback(() => {
    setCommentModal(false);
    setComments([]);
    setRepliesMap({});
    setRepliesVisible({});
    setReplyTo(null);
    setReplyText('');
    setReplyPlaceholder(null);
    const unsub = (openComments as any).unsubscribe;
    if (typeof unsub === 'function') unsub();
  }, []);

  const setReplyToAndPlaceholder = useCallback((commentId: string) => {
    const targetComment = comments.find((c) => c.id === commentId);
    setReplyTo(commentId);
    setCommentText('');
    setReplyText('');
    setReplyPlaceholder(targetComment ? `Balas @${targetComment.userDisplayName}...` : 'Balas...');
  }, [comments]);

  const handleComment = useCallback(async () => {
    if (replyTo) {
      if (!replyText.trim()) return;
      setCommentLoading(true);
      try {
        const replyData = {
          userId: currentUser?.uid,
          userDisplayName: currentUser?.displayName,
          text: replyText,
          createdAt: serverTimestamp(),
          likesCount: 0,
          likedBy: [],
        };
        await addDoc(collection(db, 'posts', selectedPostId, 'comments', replyTo, 'replies'), replyData);
        await updateDoc(doc(db, 'posts', selectedPostId, 'comments', replyTo), { repliesCount: increment(1) });
        setRepliesMap(prev => ({
          ...prev,
          [replyTo]: [{ id: Date.now().toString(), ...replyData, createdAt: new Date() }, ...(prev[replyTo] || [])],
        }));
        setRepliesVisible(prev => ({ ...prev, [replyTo]: true }));
        setReplyText('');
        setReplyTo(null);
        setReplyPlaceholder(null);
      } catch (e) {
        Alert.alert('Error', 'Gagal kirim balasan');
      } finally {
        setCommentLoading(false);
      }
      return;
    }

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
      setVideos(prev => prev.map(v =>
        v.id === selectedPostId ? { ...v, commentsCount: (v.commentsCount || 0) + 1 } : v
      ));
      setCommentText('');
    } catch (e) {
      Alert.alert('Error', 'Gagal kirim komentar');
    } finally {
      setCommentLoading(false);
    }
  }, [commentText, replyText, replyTo, currentUser, selectedPostId]);

  const toggleReplies = useCallback((commentId: string) => {
    if (repliesVisible[commentId]) {
      setRepliesVisible((p) => ({ ...p, [commentId]: false }));
      return;
    }
    if (repliesMap[commentId]?.length) {
      setRepliesVisible((p) => ({ ...p, [commentId]: true }));
      return;
    }
    const q = query(collection(db, 'posts', selectedPostId, 'comments', commentId, 'replies'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setRepliesMap((prev) => ({ ...prev, [commentId]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
      setRepliesVisible((p) => ({ ...p, [commentId]: true }));
    });
    (toggleReplies as any)[commentId] = unsubscribe;
  }, [repliesMap, repliesVisible, selectedPostId]);

  // fetchVideos sekarang hanya berubah identitas saat uid atau feedMode berubah,
  // jadi effect ini tidak lagi ke-trigger oleh aksi like.
  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  // Re-apply filter ke existing videos secara immediate saat feedMode berubah
  // (tanpa perlu tunggu fetchVideos selesai, untuk UX yang lebih smooth)
  useEffect(() => {
    if (videos.length > 0) {
      let filtered: any[] = [];
      if (feedMode === 'following') {
        if (!followingRef.current?.length) {
          filtered = [];
        } else {
          filtered = videos.filter((video) => video.userId && followingRef.current.includes(video.userId));
        }
      } else {
        filtered = videos;
      }
      setVideos(filtered);
    }
  }, [feedMode, followingKey]);

  // FlatList ref untuk kontrol scroll (dipakai saat ada upload baru)
  const listRef = useRef<any>(null);
  // Track previous first item to detect new uploads prepended
  const prevFirstIdRef = useRef<string | null>(null);
  const prevLengthRef = useRef<number>(0);

  useEffect(() => {
    const prevFirst = prevFirstIdRef.current;
    const prevLen = prevLengthRef.current;
    if (videos.length > 0) {
      // jika ada item baru di depan (upload baru), scroll ke index 0
      if (prevLen && videos.length > prevLen && videos[0].id !== prevFirst) {
        try { listRef.current?.scrollToIndex({ index: 0, animated: true }); } catch (e) {}
      }
      prevFirstIdRef.current = videos[0].id;
      prevLengthRef.current = videos.length;
    } else {
      prevFirstIdRef.current = null;
      prevLengthRef.current = videos.length;
    }
  }, [videos]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('scrollToTop', () => {
      if (listRef.current) {
        try { listRef.current.scrollToOffset({ offset: 0, animated: true }); } catch (e) {}
      }
    });
    return unsubscribe;
  }, [navigation]);

  // Pastikan snapping 1 video per layar: kalkulasi index saat momentum scroll selesai
  const onMomentumScrollEnd = useCallback((e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y || 0;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    if (index !== activeIndex) setActiveIndex(index);
    // Pastikan posisi tepat
    try { listRef.current?.scrollToIndex({ index, animated: true }); } catch (err) {}
  }, [activeIndex]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index || 0);
      }
    }, []
  );

  const renderVideoItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const shouldRender = index === activeIndex || index === activeIndex - 1 || index === activeIndex + 1;
    const isLikedByUser = item.isLiked;
    if (!shouldRender) {
      return <View style={[styles.hiddenVideoItem, { height: ITEM_HEIGHT, width: VIDEO_BOX_WIDTH }]} />;
    }

    return (
      <MemoizedVideoItem
        key={item.id}
        item={item}
        isActive={index === activeIndex && isFocused}
        isLikedByUser={isLikedByUser}
        onLike={handleLike}
        onComment={openComments}
        onSave={handleSave}
        onShare={handleShare}
        containerHeight={ITEM_HEIGHT}
        videoHeight={VIDEO_BOX_HEIGHT}
        videoWidth={VIDEO_BOX_WIDTH}
        videoTopOffset={Math.round(TOP_RESERVED + 24)}
        bottomOffset={Math.round(BOTTOM_RESERVED + 8)}
      />
    );
  }, [activeIndex, isFocused, handleLike, openComments, handleSave]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={[styles.modeTabs, { top: STATUS_BAR_HEIGHT + 8, backgroundColor: 'transparent' }]}>
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

      {videos.length === 0 ? (
        <View style={styles.emptyContent}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyLabel}>
            {feedMode === 'following' && !currentUser?.following?.length
              ? 'Ikuti creator untuk melihat feed Following'
              : 'Belum ada video'}
          </Text>
          {feedMode !== 'following' && (
            <>
              <Text style={styles.emptySubLabel}>Upload video pertama kamu!</Text>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => navigation.navigate('CreatePost')}
              >
                <Text style={styles.uploadBtnText}>Upload Video</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={videos}
          keyExtractor={(item) => `video-${item.id}`}
          renderItem={renderVideoItem}
          extraData={activeIndex}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchVideos(true)}
              tintColor="#E91E63"
              colors={['#E91E63', '#fff']}
              progressBackgroundColor="#000"
              progressViewOffset={0}
            />
          }
          style={styles.flatList}
          contentContainerStyle={{ padding: 0 }}
          pagingEnabled
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment={'center'}
          disableIntervalMomentum={true}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScrollToIndexFailed={() => { /* ignore */ }}
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={3}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
        />
      )}

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
              <TouchableOpacity onPress={closeComments}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              style={styles.commentList}
              renderItem={({ item }) => (
                <View>
                  <View style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {item.userDisplayName?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentContent}>
                      <Text style={styles.commentName}>{item.userDisplayName}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                      <View style={styles.commentActionsRow}>
                        <TouchableOpacity onPress={() => setReplyToAndPlaceholder(item.id)}>
                          <Text style={styles.commentActionText}>Reply</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => toggleReplies(item.id)}>
                          <Text style={styles.commentActionText}>
                            {repliesVisible[item.id] ? 'Sembunyikan balasan' : `Lihat balasan (${item.repliesCount || 0})`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  {repliesVisible[item.id] && (repliesMap[item.id] || []).map((reply) => (
                    <View key={reply.id} style={[styles.commentItem, styles.replyItem]}>
                      <View style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>
                          {reply.userDisplayName?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.commentContent}>
                        <Text style={styles.commentName}>{reply.userDisplayName}</Text>
                        <Text style={styles.commentText}>{reply.text}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.noComments}>Belum ada komentar</Text>
              }
            />
            <View style={styles.commentInputBox}>
              <TextInput
                style={styles.commentInput}
                placeholder={replyTo ? (replyPlaceholder || 'Balas...') : 'Tulis komentar...'}
                placeholderTextColor="#888"
                value={replyTo ? replyText : commentText}
                onChangeText={replyTo ? setReplyText : setCommentText}
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
  flatList: { flex: 1, backgroundColor: '#000' },
  flatListContent: { flexGrow: 1 },
  hiddenVideoItem: { backgroundColor: '#000' },
  touchOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modeTabs: { position: 'absolute', left: 16, right: 16, zIndex: 10, flexDirection: 'row', padding: 8, gap: 8, borderRadius: 16 },
  modeTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  modeTabActive: { backgroundColor: '#E91E63' },
  modeTabText: { color: '#888', fontWeight: '600' },
  modeTabTextActive: { color: '#fff' },
  emptyContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyContent: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 24, marginTop: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyLabel: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySubLabel: { color: '#888', fontSize: 14, marginBottom: 24 },
  uploadBtn: { backgroundColor: '#E91E63', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  uploadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  videoContainer: { backgroundColor: '#000', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  videoWrapper: { justifyContent: 'center', backgroundColor: '#000', overflow: 'hidden' },
  fullscreenVideoWrapper: { width: '100%', justifyContent: 'center', backgroundColor: '#000', overflow: 'hidden' },
  fullscreenVideo: { width: '100%' },
  fullscreenNoVideo: { width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  pauseOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  noVideo: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  noVideoText: { fontSize: 80 },
  progressBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressBarFill: { height: 3, backgroundColor: '#E91E63' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0 },
  rightActions: { position: 'absolute', right: 12, bottom: 100, alignItems: 'center', gap: 20 },
  actionBtn: { alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 11, marginTop: 3, textShadowColor: '#000', textShadowRadius: 4 },
  bottomInfo: { position: 'absolute', bottom: 20, left: 12, right: 80, zIndex: 6 },
  videoUsername: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginBottom: 4, textShadowColor: '#000', textShadowRadius: 4 },
  videoCaption: { color: '#eee', fontSize: 13, textShadowColor: '#000', textShadowRadius: 4 },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#fff' },
  avatarSmallPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
  avatarSmallText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  commentList: { maxHeight: 300 },
  commentItem: { flexDirection: 'row', padding: 12, gap: 10 },
  replyItem: { marginLeft: 36, backgroundColor: '#1b1b1b', borderRadius: 12, marginVertical: 4, paddingVertical: 8 },
  commentActionsRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  commentActionText: { color: '#E91E63', fontSize: 12, fontWeight: '600' },
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
// Hindari re-render yang tidak perlu: hanya re-render saat prop penting berubah
const areVideoPropsEqual = (prev: any, next: any) => (
  prev.item.id === next.item.id &&
  prev.item.isLiked === next.item.isLiked &&
  prev.item.isSaved === next.item.isSaved &&
  prev.isActive === next.isActive
);

// Versi memoized dengan comparator
const MemoizedVideoItem = React.memo((props: any) => <VideoItem {...props} />, areVideoPropsEqual);
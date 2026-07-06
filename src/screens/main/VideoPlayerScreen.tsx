import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar, Share, Alert,
  Modal, KeyboardAvoidingView, Platform, FlatList, TextInput, ActivityIndicator, PanResponder, Animated
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, orderBy, limit, addDoc, updateDoc, serverTimestamp, onSnapshot, doc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useStore } from '../../store/useStore';

const { width, height } = Dimensions.get('window');

export default function VideoPlayerScreen({ navigation, route }: any) {
  const { videoUrl, item } = route.params || {};
  const postId = item?.id || route.params?.postId || null;
  const { currentUser } = useStore();

  const [commentModal, setCommentModal] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [repliesMap, setRepliesMap] = useState<Record<string, any[]>>({});
  const [repliesVisible, setRepliesVisible] = useState<Record<string, boolean>>({});
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyPlaceholder, setReplyPlaceholder] = useState<string | null>(null);
  const pan = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
    onPanResponderMove: (_, gesture) => {
      if (gesture.dy > 0) Animated.event([{ y: pan }], { useNativeDriver: false })({ y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 120) {
        closeComments();
      } else {
        Animated.timing(pan, { toValue: 0, duration: 150, useNativeDriver: false }).start();
      }
    }
  })).current;

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

  const handleShare = async () => {
    try {
      const caption = item?.caption || '';
      const url = videoUrl || item?.mediaURL || item?.videoUrl || item?.imageUrl || '';
      if (!url) {
        Alert.alert('Gagal', 'URL video tidak tersedia untuk dibagikan.');
        return;
      }
      const text = `${caption}\n\nLihat: ${url}`.trim();
      const shareOptions: any = {
        title: 'Bagikan MediaNova',
        message: text,
        url,
      };

      await Share.share(shareOptions, {
        dialogTitle: 'Bagikan video MediaNova',
      });
      try {
        if (postId) await updateDoc(doc(db, 'posts', postId), { shareCount: increment(1) });
      } catch (e) {
        console.log('share count update failed', e);
      }
    } catch (e) {
      console.log('Share failed', e);
      Alert.alert('Gagal', 'Tidak dapat membagikan video.');
    }
  };

  // Comments realtime
  const openComments = async () => {
    if (!postId) {
      Alert.alert('Error', 'Post tidak ditemukan');
      return;
    }
    setCommentModal(true);
    pan.setValue(0);
    try {
      const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'desc'), limit(100));
      const unsub = onSnapshot(q, (snap) => {
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      (openComments as any).unsubscribe = unsub;
    } catch (e) { console.log(e); }
  };

  const closeComments = () => {
    setCommentModal(false);
    setComments([]);
    setRepliesMap({});
    setRepliesVisible({});
    setReplyTo(null);
    setReplyText('');
    setReplyPlaceholder(null);
    const unsub = (openComments as any).unsubscribe;
    if (typeof unsub === 'function') unsub();
    // cleanup any replies unsubscribes stored on toggleReplies
    Object.keys(toggleReplies).forEach((k) => {
      try {
        const u = (toggleReplies as any)[k];
        if (typeof u === 'function') u();
      } catch (e) { }
    });
    Animated.timing(pan, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  const handleComment = async () => {
    if (!currentUser?.uid) {
      Alert.alert('Login diperlukan', 'Silakan login untuk komentar.');
      return;
    }
    if (!postId) {
      Alert.alert('Error', 'Post tidak ditemukan.');
      return;
    }

    if (replyTo) {
      if (!replyText.trim()) return;
      setCommentLoading(true);
      try {
        const replyData = {
          userId: currentUser.uid,
          userDisplayName: currentUser.displayName,
          text: replyText,
          createdAt: serverTimestamp(),
          likesCount: 0,
          likedBy: [],
        };
        await addDoc(collection(db, 'posts', postId, 'comments', replyTo, 'replies'), replyData);
        await updateDoc(doc(db, 'posts', postId, 'comments', replyTo), { repliesCount: increment(1) });
        setRepliesMap((prev) => ({
          ...prev,
          [replyTo]: [{ id: Date.now().toString(), ...replyData, createdAt: new Date() }, ...(prev[replyTo] || [])],
        }));
        setReplyText('');
        setReplyTo(null);
        setReplyPlaceholder(null);
      } catch (e) {
        console.log(e);
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
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName,
        text: commentText,
        createdAt: serverTimestamp(),
        likesCount: 0,
        likedBy: [],
      };
      await addDoc(collection(db, 'posts', postId, 'comments'), commentData);
      await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
      setComments((prev) => [{ id: Date.now().toString(), ...commentData, createdAt: new Date() }, ...prev]);
      setCommentText('');
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Gagal kirim komentar');
    } finally {
      setCommentLoading(false);
    }
  };

  const toggleReplies = (commentId: string) => {
    if (repliesVisible[commentId]) { setRepliesVisible((p) => ({ ...p, [commentId]: false })); return; }
    if (repliesMap[commentId]?.length) { setRepliesVisible((p) => ({ ...p, [commentId]: true })); return; }
    const q = query(collection(db, 'posts', postId, 'comments', commentId, 'replies'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setRepliesMap((prev) => ({ ...prev, [commentId]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
      setRepliesVisible((p) => ({ ...p, [commentId]: true }));
    });
    (toggleReplies as any)[commentId] = unsub;
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser?.uid) {
      Alert.alert('Login diperlukan', 'Silakan login untuk menyukai komentar.');
      return;
    }
    if (!postId) return;
    try {
      const comment = comments.find((c) => c.id === commentId);
      if (!comment) return;
      const likedBy = comment.likedBy || [];
      const isLiked = likedBy.includes(currentUser.uid);
      const commentRef = doc(db, 'posts', postId, 'comments', commentId);
      if (isLiked) {
        await updateDoc(commentRef, { likedBy: arrayRemove(currentUser.uid), likesCount: increment(-1) });
        setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likesCount: (c.likesCount || 1) - 1, likedBy: (c.likedBy || []).filter((u: string) => u !== currentUser.uid) } : c));
      } else {
        await updateDoc(commentRef, { likedBy: arrayUnion(currentUser.uid), likesCount: increment(1) });
        setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likesCount: (c.likesCount || 0) + 1, likedBy: [...(c.likedBy || []), currentUser.uid] } : c));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleLikeReply = async (commentId: string, replyId: string) => {
    if (!currentUser?.uid) {
      Alert.alert('Login diperlukan', 'Silakan login untuk menyukai balasan.');
      return;
    }
    if (!postId) return;
    try {
      const replies = repliesMap[commentId] || [];
      const reply = replies.find((r) => r.id === replyId);
      if (!reply) return;
      const likedBy = reply.likedBy || [];
      const isLiked = likedBy.includes(currentUser.uid);
      const replyRef = doc(db, 'posts', postId, 'comments', commentId, 'replies', replyId);
      if (isLiked) {
        await updateDoc(replyRef, { likedBy: arrayRemove(currentUser.uid), likesCount: increment(-1) });
        setRepliesMap((prev) => ({
          ...prev,
          [commentId]: prev[commentId].map((r) => r.id === replyId ? { ...r, likesCount: (r.likesCount || 1) - 1, likedBy: (r.likedBy || []).filter((u: string) => u !== currentUser.uid) } : r),
        }));
      } else {
        await updateDoc(replyRef, { likedBy: arrayUnion(currentUser.uid), likesCount: increment(1) });
        setRepliesMap((prev) => ({
          ...prev,
          [commentId]: prev[commentId].map((r) => r.id === replyId ? { ...r, likesCount: (r.likesCount || 0) + 1, likedBy: [...(r.likedBy || []), currentUser.uid] } : r),
        }));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const setReplyToAndPlaceholder = (commentId: string) => {
    const c = comments.find((x) => x.id === commentId);
    setReplyTo(commentId);
    setCommentText('');
    setReplyText('');
    setReplyPlaceholder(c ? `Balas @${c.userDisplayName}...` : 'Balas...');
  };

  const VIDEO_BOX_HEIGHT = Math.round(width * 16 / 9);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Video 9:16 */}
      <View style={[styles.videoContainer, { height: VIDEO_BOX_HEIGHT }]}> 
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={true}
        />
      </View>

      {/* Header overlay */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.username}>@{item?.userDisplayName}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {item?.caption ? (
        <View style={styles.captionBox}>
          <Text style={styles.caption}>{item.caption}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={{ marginTop: 12 }} onPress={openComments}>
        <Text style={{ color: '#E91E63' }}>Lihat Komentar</Text>
      </TouchableOpacity>

      {/* Comment Modal */}
      <Modal
        visible={commentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeComments}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View style={[styles.modalContainer, { transform: [{ translateY: pan }] }]} {...panResponder.panHandlers}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Komentar</Text>
              <TouchableOpacity onPress={closeComments}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              style={styles.commentList}
              contentContainerStyle={styles.commentListContent}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              renderItem={({ item: c }) => (
                <View>
                  <View style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>{c.userDisplayName?.charAt(0)?.toUpperCase() || '?'}</Text>
                    </View>
                    <View style={styles.commentContent}>
                      <Text style={styles.commentName}>{c.userDisplayName}</Text>
                      <Text style={styles.commentText}>{c.text}</Text>
                      <View style={styles.commentActionsRow}>
                        <TouchableOpacity onPress={() => handleLikeComment(c.id)} style={styles.commentActionButton}>
                          <Ionicons name={(c.likedBy || []).includes(currentUser?.uid) ? 'heart' : 'heart-outline'} size={18} color={(c.likedBy || []).includes(currentUser?.uid) ? '#E91E63' : '#888'} />
                          <Text style={styles.commentActionText}>{c.likesCount || (c.likedBy ? c.likedBy.length : 0)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setReplyToAndPlaceholder(c.id); }}>
                          <Text style={styles.commentActionText}>Reply</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => toggleReplies(c.id)}>
                          <Text style={styles.commentActionText}>{repliesVisible[c.id] ? 'Sembunyikan balasan' : `Lihat balasan (${c.repliesCount || 0})`}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  {repliesVisible[c.id] && (repliesMap[c.id] || []).map((r) => (
                    <View key={r.id} style={[styles.commentItem, styles.replyItem]}>
                      <View style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>{r.userDisplayName?.charAt(0)?.toUpperCase() || '?'}</Text>
                      </View>
                      <View style={styles.commentContent}>
                        <Text style={styles.commentName}>{r.userDisplayName}</Text>
                        <Text style={styles.commentText}>{r.text}</Text>
                        <View style={styles.commentActionsRow}>
                          <TouchableOpacity onPress={() => handleLikeReply(c.id, r.id)} style={styles.commentActionButton}>
                            <Ionicons name={(r.likedBy || []).includes(currentUser?.uid) ? 'heart' : 'heart-outline'} size={16} color={(r.likedBy || []).includes(currentUser?.uid) ? '#E91E63' : '#888'} />
                            <Text style={styles.commentActionText}>{r.likesCount || (r.likedBy ? r.likedBy.length : 0)}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              ListEmptyComponent={<Text style={styles.noComments}>Belum ada komentar</Text>}
            />
            <View style={styles.commentInputBox}>
              <TextInput
                style={styles.commentInput}
                placeholder={replyTo ? (replyPlaceholder || 'Balas @...') : 'Tulis komentar...'}
                placeholderTextColor="#888"
                value={replyTo ? replyText : commentText}
                onChangeText={replyTo ? setReplyText : setCommentText}
                multiline
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleComment} disabled={commentLoading}>
                {commentLoading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Text overlay */}
      {item?.textOverlay ? (
        <View
          style={[
            styles.overlayContainer,
            item.textPosition === 'top'
              ? styles.overlayTop
              : item.textPosition === 'center'
                ? styles.overlayCenter
                : styles.overlayBottom,
          ]}
        >
          <Text style={[styles.overlayText, { color: item.textColor || '#fff' }]}>
            {item.textOverlay}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  videoContainer: { width: '100%', backgroundColor: '#000', overflow: 'hidden' },
  video: { width: '100%', height: '100%', backgroundColor: '#000' },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '70%', paddingBottom: 12 },
  modalHandle: { width: 64, height: 5, borderRadius: 3, backgroundColor: '#333', alignSelf: 'center', marginVertical: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  commentList: { flex: 1 },
  commentListContent: { paddingBottom: 12 },
  commentItem: { flexDirection: 'row', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  replyItem: { marginLeft: 48, backgroundColor: '#141414', borderRadius: 14, marginVertical: 4, paddingVertical: 8 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  commentContent: { flex: 1 },
  commentName: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  commentText: { color: '#ddd', fontSize: 14 },
  commentActionsRow: { flexDirection: 'row', marginTop: 6, gap: 14, alignItems: 'center' },
  commentActionButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentActionText: { color: '#888', fontSize: 12 },
  noComments: { color: '#888', textAlign: 'center', padding: 20 },
  commentInputBox: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#222' },
  commentInput: { flex: 1, backgroundColor: '#222', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, color: '#fff', minHeight: 40 },
  sendBtn: { backgroundColor: '#E91E63', borderRadius: 20, width: 40, justifyContent: 'center', alignItems: 'center' },
});
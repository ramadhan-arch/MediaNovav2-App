import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { doc, deleteDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useStore } from '../../store/useStore';
import { VideoView, useVideoPlayer } from 'expo-video';
import AudioPlayer from '../../components/AudioPlayer';

const { width, height } = Dimensions.get('window');

export default function PostDetailScreen({ navigation, route }: any) {
  const { post } = route.params || {};
  const { currentUser, updateCurrentUser, posts } = useStore();

  const handleDelete = () => {
    if (!currentUser?.uid) return;
    if (post.userId !== currentUser.uid) {
      Alert.alert('Tidak diizinkan', 'Hanya pemilik postingan yang bisa menghapus.');
      return;
    }
    Alert.alert('Hapus postingan', 'Yakin ingin menghapus postingan ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'posts', post.id));
          // remove from saved posts if present
          if ((currentUser.savedPosts || []).includes(post.id)) {
            try { await updateDoc(doc(db, 'users', currentUser.uid), { savedPosts: arrayRemove(post.id) }); } catch (e) { console.log(e); }
            updateCurrentUser({ savedPosts: (currentUser.savedPosts || []).filter((id: string) => id !== post.id) });
          }
          // update local posts
          useStore.getState().setPosts((posts || []).filter((p: any) => p.id !== post.id));
          navigation.goBack();
        } catch (e) { console.log(e); Alert.alert('Error', 'Gagal menghapus postingan'); }
      } }
    ]);
  };

  const player = useVideoPlayer(post?.mediaType === 'video' && post?.mediaURL ? post.mediaURL : null, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{post?.userDisplayName || 'Postingan'}</Text>
        {currentUser?.uid === post?.userId ? (
          <TouchableOpacity onPress={handleDelete} style={{ width: 40, alignItems: 'flex-end' }}>
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {post?.mediaType === 'image' && post?.mediaURL ? (
          <Image source={{ uri: post.mediaURL }} style={styles.media} resizeMode="contain" />
        ) : post?.mediaType === 'video' && post?.mediaURL ? (
          <VideoView player={player} style={styles.media} contentFit="contain" nativeControls />
        ) : post?.mediaType === 'audio' && post?.mediaURL ? (
          <View style={styles.audioBox}>
            <AudioPlayer uri={post.mediaURL} caption={post.caption} />
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Tidak ada media</Text>
          </View>
        )}

        {post?.caption ? (
          <View style={styles.captionBox}>
            <Text style={styles.caption}>{post.caption}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  content: { flexGrow: 1, paddingBottom: 24 },
  media: { width, height: height * 0.6, backgroundColor: '#111' },
  audioBox: { padding: 16 },
  placeholder: { height: height * 0.6, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  placeholderText: { color: '#888', fontSize: 16 },
  captionBox: { padding: 16 },
  caption: { color: '#fff', fontSize: 15, lineHeight: 22 },
});

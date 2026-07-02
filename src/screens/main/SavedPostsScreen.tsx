import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { collection, doc, getDocs, query, where, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useStore } from '../../store/useStore';

export default function SavedPostsScreen({ navigation }: any) {
  const { currentUser } = useStore();
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchSaved = async () => {
      if (!currentUser?.savedPosts || currentUser.savedPosts.length === 0) {
        setPosts([]);
        return;
      }
      try {
        const ids: string[] = currentUser.savedPosts;
        // Firestore 'in' supports up to 10; chunk if necessary
        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));
        let results: any[] = [];
        for (const chunk of chunks) {
          const q = query(collection(db, 'posts'), where('__name__', 'in', chunk));
          const snap = await getDocs(q);
            results = results.concat(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
          setPosts(results);

          // For any video post missing thumbnail, try to derive Cloudinary thumbnail and persist it
          for (const p of results) {
            try {
              if (p.mediaType === 'video' && !p.thumbnailURL && p.mediaURL && p.mediaURL.includes('/upload/')) {
                const thumbnailUrl = p.mediaURL.replace('/upload/', '/upload/c_fill,w_400,h_600,g_auto/so_0/');
                // update firestore doc
                await import('firebase/firestore').then(async (mod) => {
                  const { updateDoc, doc } = mod;
                  await updateDoc(doc(db, 'posts', p.id), { thumbnailURL: thumbnailUrl });
                });
                // update local state
                setPosts(prev => prev.map(pp => pp.id === p.id ? { ...pp, thumbnailURL: thumbnailUrl } : pp));
              }
            } catch (e) {
              console.log('thumbnail persist failed', e);
            }
          }
      } catch (e) { console.log(e); }
    };
    fetchSaved();
  }, [currentUser?.savedPosts]);

  const ImageWithFallback = ({ uri }: { uri?: string }) => {
    const [failed, setFailed] = useState(false);
    if (!uri || failed) {
      return (
        <View style={[styles.thumb, { justifyContent: 'center', alignItems: 'center' }]}> 
          <Text style={{ color: '#888' }}>No preview</Text>
        </View>
      );
    }
    return (
      <Image
        source={{ uri }}
        style={styles.thumb}
        onError={() => setFailed(true)}
      />
    );
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.item}>
      <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { post: item })}>
        <View style={{ position: 'relative' }}>
          <ImageWithFallback uri={item.thumbnailURL || (item.mediaType === 'image' ? item.mediaURL : undefined)} />
          {item.mediaType === 'video' && (
            <View style={styles.playOverlay} pointerEvents="none">
              <Text style={styles.playIcon}>▶︎</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.unsaveBtn} onPress={() => toggleUnsave(item.id)}>
        <Text style={styles.unsaveText}>Unsave</Text>
      </TouchableOpacity>
    </View>
  );

  const toggleUnsave = async (postId: string) => {
    if (!currentUser?.uid) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { savedPosts: arrayRemove(postId) });
      // update local store
      useStore.getState().updateCurrentUser({ savedPosts: (currentUser.savedPosts || []).filter((id: string) => id !== postId) });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (e) {
      console.log('Failed to unsave', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved</Text>
      {posts.length === 0 ? (
        <Text style={styles.empty}>Belum ada postingan yang disimpan</Text>
      ) : (
        <FlatList data={posts} numColumns={3} keyExtractor={(p) => p.id} renderItem={renderItem} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#000' },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  empty: { color: '#888' },
  item: { flex: 1/3, padding: 4 },
  thumb: { width: '100%', aspectRatio: 1, backgroundColor: '#111' },
  playOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  playIcon: { color: '#E91E63', fontSize: 36, textShadowColor: '#000', textShadowRadius: 6 },
  unsaveBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  unsaveText: { color: '#fff', fontSize: 12 }
});

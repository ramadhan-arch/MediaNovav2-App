import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Image, FlatList, Alert, RefreshControl,
  Platform, StatusBar
} from 'react-native';
import {
  doc, getDoc, updateDoc, addDoc, arrayUnion, arrayRemove,
  increment, collection, query, where, serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../utils/firebase';
import { useStore } from '../../store/useStore';

export default function UserProfileScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const { currentUser, updateCurrentUser, isDarkMode } = useStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileTab, setProfileTab] = useState<'posts' | 'videos'>('posts');

  const isOwnProfile = userId === currentUser?.uid;
  const theme = isDarkMode ? {
    background: '#0f172a',
    surface: '#111827',
    card: '#1f2937',
    border: '#334155',
    text: '#f8fafc',
    muted: '#cbd5e1',
  } : {
    background: '#f8fafc',
    surface: '#ffffff',
    card: '#ffffff',
    border: '#cbd5e1',
    text: '#0f172a',
    muted: '#475569',
  };

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId, currentUser?.uid]);

  useEffect(() => {
    if (!userId) {
      setUserPosts([]);
      return;
    }

    const q = query(collection(db, 'posts'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const posts = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.toDate?.() ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate?.() ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });
      setUserPosts(posts);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.log(error);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        const data = snap.data();
        setProfileData(data);
        if (!isOwnProfile && currentUser?.uid) {
          setIsFollowing(data.followers?.includes(currentUser.uid) || false);
        }
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
  };

  const handleFollow = async () => {
    if (!currentUser?.uid) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await updateDoc(doc(db, 'users', userId), {
          followers: arrayRemove(currentUser.uid),
          followersCount: increment(-1)
        });
        await updateDoc(doc(db, 'users', currentUser.uid), {
          following: arrayRemove(userId),
          followingCount: increment(-1)
        });
        updateCurrentUser({
          following: (currentUser.following || []).filter((id) => id !== userId),
          followingCount: Math.max(0, (currentUser.followingCount || 0) - 1)
        });
        setIsFollowing(false);
        setProfileData((prev: any) => ({
          ...prev,
          followersCount: Math.max(0, (prev.followersCount || 1) - 1)
        }));
      } else {
        await updateDoc(doc(db, 'users', userId), {
          followers: arrayUnion(currentUser.uid),
          followersCount: increment(1)
        });
        await updateDoc(doc(db, 'users', currentUser.uid), {
          following: arrayUnion(userId),
          followingCount: increment(1)
        });
        await addDoc(collection(db, 'notifications'), {
          type: 'follow',
          message: `${currentUser.displayName || 'Seseorang'} mulai mengikuti kamu`,
          toUserId: userId,
          fromUserId: currentUser.uid,
          createdAt: serverTimestamp(),
          isRead: false,
        });
        updateCurrentUser({
          following: [...(currentUser.following || []), userId],
          followingCount: (currentUser.followingCount || 0) + 1
        });
        setIsFollowing(true);
        setProfileData((prev: any) => ({
          ...prev,
          followersCount: (prev.followersCount || 0) + 1
        }));
      }
    } catch (e) {
      Alert.alert('Error', 'Gagal follow/unfollow');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}> 
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#E91E63"
          colors={['#E91E63']}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}> 
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{profileData?.displayName || 'Profil'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Profile info */}
      <View style={[styles.profileSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}> 
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {profileData?.displayName?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>

        <Text style={[styles.displayName, { color: theme.text }]}>{profileData?.displayName}</Text>

        {profileData?.bio ? (
          <Text style={[styles.bio, { color: theme.muted }]}>{profileData.bio}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.text }]}>{userPosts.length}</Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>Post</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('FollowList', { userId, listType: 'followers' })}
          >
            <Text style={[styles.statNumber, { color: theme.text }]}>{profileData?.followersCount || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>Followers</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('FollowList', { userId, listType: 'following' })}
          >
            <Text style={[styles.statNumber, { color: theme.text }]}>{profileData?.followingCount || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>Following</Text>
          </TouchableOpacity>
        </View>

        {!isOwnProfile && (
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followingBtn]}
            onPress={handleFollow}
            disabled={followLoading}
          >
            {followLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.followBtnText}>
                  {isFollowing ? '✓ Following' : '+ Follow'}
                </Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* Posts grid */}
      <View style={[styles.profileTabs, { backgroundColor: theme.background }]}> 
        <TouchableOpacity style={[styles.profileTab, profileTab === 'posts' && styles.profileTabActive, { backgroundColor: profileTab === 'posts' ? '#E91E63' : theme.card }]} onPress={() => setProfileTab('posts')}>
          <Text style={[styles.profileTabText, { color: profileTab === 'posts' ? '#fff' : theme.muted }]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.profileTab, profileTab === 'videos' && styles.profileTabActive, { backgroundColor: profileTab === 'videos' ? '#E91E63' : theme.card }]} onPress={() => setProfileTab('videos')}>
          <Text style={[styles.profileTabText, { color: profileTab === 'videos' ? '#fff' : theme.muted }]}>Videos</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.postsGrid, { backgroundColor: theme.background }]}> 
        {userPosts.filter((post) => profileTab === 'videos' ? post.mediaType === 'video' : true).map(post => (
          <TouchableOpacity key={post.id} style={styles.gridItem} onPress={() => navigation.navigate('PostDetail', { post } as any)}>
            {post.mediaURL && post.mediaType === 'image' ? (
              <Image source={{ uri: post.mediaURL }} style={styles.gridImage} resizeMode="contain" />
            ) : post.mediaType === 'video' ? (
              <View style={[styles.gridVideoBox, { backgroundColor: theme.card }]}> 
                {post.thumbnailURL && (
                  <Image source={{ uri: post.thumbnailURL }} style={styles.gridImage} resizeMode="contain" />
                )}
                <Ionicons name="play-circle" size={32} color="#E91E63" />
              </View>
            ) : post.mediaType === 'audio' ? (
              <View style={[styles.gridAudioBox, { backgroundColor: theme.card }]}> 
                <Ionicons name="musical-notes" size={32} color="#E91E63" />
              </View>
            ) : (
              <View style={[styles.gridTextBox, { backgroundColor: theme.card }]}> 
                <Text style={[styles.gridTextCaption, { color: theme.text }]} numberOfLines={3}>
                  {post.caption}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {userPosts.length === 0 && (
        <View style={styles.emptyPosts}>
          <Text style={[styles.emptyText, { color: theme.muted }]}>Belum ada post</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  profileSection: { alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#222' },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  displayName: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  email: { color: '#888', fontSize: 13, marginBottom: 8 },
  bio: { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  statItem: { alignItems: 'center', paddingHorizontal: 20 },
  statDivider: { width: 1, height: 32, backgroundColor: '#333' },
  statNumber: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12 },
  followBtn: { backgroundColor: '#E91E63', paddingHorizontal: 40, paddingVertical: 10, borderRadius: 24, marginTop: 8 },
  followingBtn: { backgroundColor: '#333' },
  followBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  profileTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  profileTab: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center', backgroundColor: '#111' },
  profileTabActive: { backgroundColor: '#E91E63' },
  profileTabText: { color: '#888', fontWeight: '600' },
  profileTabTextActive: { color: '#fff' },
  postsTitle: { color: '#888', fontSize: 12, textTransform: 'uppercase', padding: 16, paddingBottom: 8 },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '33.33%', aspectRatio: 1, padding: 1 },
  gridImage: { flex: 1, resizeMode: 'cover' },
  gridVideoBox: { flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  gridAudioBox: { flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  gridTextBox: { flex: 1, backgroundColor: '#111', padding: 8, justifyContent: 'center' },
  gridTextCaption: { color: '#fff', fontSize: 11 },
  emptyPosts: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 14 },
});
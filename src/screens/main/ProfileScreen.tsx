import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Switch, ActivityIndicator, Image, FlatList, RefreshControl,
  Platform, StatusBar
} from 'react-native';
import { signOut } from 'firebase/auth';
import {
  doc, getDoc, updateDoc, addDoc, arrayUnion, arrayRemove, increment,
  collection, query, where, orderBy, getDocs, serverTimestamp
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../utils/firebase';
import { useStore } from '../../store/useStore';

export default function ProfileScreen({ route, navigation }: any) {
  const { currentUser, isDarkMode, toggleDarkMode, updateCurrentUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [profileTab, setProfileTab] = useState<'posts' | 'videos'>('posts');
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<any>(null);

  const isOwnProfile = !route?.params?.userId ||
    route?.params?.userId === currentUser?.uid;
  const targetUserId = route?.params?.userId || currentUser?.uid;

  useEffect(() => {
    if (targetUserId) {
      fetchProfile();
      fetchUserPosts();
    }
  }, [targetUserId, currentUser?.uid]);

  const fetchProfile = async () => {
    if (!targetUserId) return;
    try {
      const snap = await getDoc(doc(db, 'users', targetUserId));
      if (snap.exists()) {
        const data = snap.data();
        setProfileData(data);
        if (!isOwnProfile && currentUser?.uid) {
          setIsFollowing(data.followers?.includes(currentUser.uid) || false);
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const fetchUserPosts = async () => {
    if (!targetUserId) return;
    try {
      const q = query(
        collection(db, 'posts'),
        where('userId', '==', targetUserId)
      );
      const snap = await getDocs(q);
      const posts = snap.docs
        .map((d: any) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.toDate?.() ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate?.() ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });
      setUserPosts(posts);
    } catch (e) {
      console.log(e);
    }
  };

  const handleFollow = async () => {
    if (!currentUser?.uid || !targetUserId) return;
    setLoading(true);
    try {
      if (isFollowing) {
        await updateDoc(doc(db, 'users', targetUserId), {
          followers: arrayRemove(currentUser.uid),
          followersCount: increment(-1)
        });
        await updateDoc(doc(db, 'users', currentUser.uid), {
          following: arrayRemove(targetUserId),
          followingCount: increment(-1)
        });
        updateCurrentUser({
          following: (currentUser.following || []).filter((id) => id !== targetUserId),
          followingCount: Math.max(0, (currentUser.followingCount || 0) - 1)
        });
        setIsFollowing(false);
        setProfileData((prev: any) => ({
          ...prev,
          followersCount: (prev.followersCount || 1) - 1
        }));
      } else {
        await updateDoc(doc(db, 'users', targetUserId), {
          followers: arrayUnion(currentUser.uid),
          followersCount: increment(1)
        });
        await updateDoc(doc(db, 'users', currentUser.uid), {
          following: arrayUnion(targetUserId),
          followingCount: increment(1)
        });
        await addDoc(collection(db, 'notifications'), {
          type: 'follow',
          message: `${currentUser.displayName || 'Seseorang'} mulai mengikuti kamu`,
          toUserId: targetUserId,
          fromUserId: currentUser.uid,
          createdAt: serverTimestamp(),
          isRead: false,
        });
        updateCurrentUser({
          following: [...(currentUser.following || []), targetUserId],
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
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchUserPosts()]);
    setRefreshing(false);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        onRefresh();
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    });
    return unsubscribe;
  }, [navigation, onRefresh]);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Yakin mau logout?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await signOut(auth);
        }
      }
    ]);
  };

  const bgColor = isDarkMode ? '#000' : '#f5f5f5';
  const cardColor = isDarkMode ? '#111' : '#fff';
  const textColor = isDarkMode ? '#fff' : '#000';
  const subTextColor = isDarkMode ? '#888' : '#666';

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.container, { backgroundColor: bgColor }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#E91E63"
          colors={["#E91E63"]}
        />
      }
    >
      <View style={[styles.header, { backgroundColor: cardColor }]}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {(profileData?.displayName || currentUser?.displayName)?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>

        <Text style={[styles.displayName, { color: textColor }]}>
          {profileData?.displayName || currentUser?.displayName}
        </Text>

        {profileData?.bio ? (
          <Text style={[styles.bio, { color: subTextColor }]}>{profileData.bio}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('FollowList', { userId: targetUserId, listType: 'followers' })}
          >
            <Text style={[styles.statNumber, { color: textColor }]}> 
              {profileData?.followersCount || 0}
            </Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>Followers</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('FollowList', { userId: targetUserId, listType: 'following' })}
          >
            <Text style={[styles.statNumber, { color: textColor }]}> 
              {profileData?.followingCount || 0}
            </Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>Following</Text>
          </TouchableOpacity>
        </View>

        {!isOwnProfile && (
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followingBtn]}
            onPress={handleFollow}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.followBtnText}>
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: cardColor }]}> 
        <View style={styles.profileTabs}>
          <View style={styles.profileTabsLeft}>
            <TouchableOpacity style={[styles.profileTab, profileTab === 'posts' && styles.profileTabActive]} onPress={() => setProfileTab('posts')}>
              <Text style={[styles.profileTabText, profileTab === 'posts' && styles.profileTabTextActive]}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileTab, profileTab === 'videos' && styles.profileTabActive]} onPress={() => setProfileTab('videos')}>
              <Text style={[styles.profileTabText, profileTab === 'videos' && styles.profileTabTextActive]}>Videos</Text>
            </TouchableOpacity>
          </View>
          {isOwnProfile && (
            <TouchableOpacity style={styles.savedTab} onPress={() => navigation.navigate('SavedPosts')}>
              <Ionicons name="bookmark" size={18} color={isDarkMode ? '#E91E63' : '#E91E63'} />
            </TouchableOpacity>
          )}
        </View>
        {userPosts.length > 0 ? (
          <View style={styles.postsGrid}>
            {userPosts.filter((post) => profileTab === 'videos' ? post.mediaType === 'video' : true).slice(0, 6).map((post) => (
              <TouchableOpacity key={post.id} style={styles.gridItem} onPress={() => navigation.navigate('PostDetail', { post } as any)}>
                {post.mediaType === 'image' && post.mediaURL ? (
                  <Image source={{ uri: post.mediaURL }} style={styles.gridImage} resizeMode="contain" />
                ) : post.mediaType === 'video' && post.mediaURL ? (
                  <View style={styles.gridVideoBox}>
                    {post.thumbnailURL && (
                      <Image source={{ uri: post.thumbnailURL }} style={styles.gridImage} resizeMode="contain" />
                    )}
                    <Ionicons name="play-circle" size={32} color="#E91E63" />
                  </View>
                ) : (
                  <View style={styles.gridTextBox}>
                    <Text style={styles.gridTextCaption} numberOfLines={3}>{post.caption}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyPosts, { color: subTextColor }]}>Belum ada postingan</Text>
        )}
      </View>

      {isOwnProfile && (
        <>
          <View style={[styles.section, { backgroundColor: cardColor }]}>
            <Text style={[styles.sectionTitle, { color: subTextColor }]}>Pengaturan</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="moon-outline" size={20} color={textColor} />
                <Text style={[styles.settingLabel, { color: textColor }]}>Dark Mode</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: '#333', true: '#E91E63' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#ff3333" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 48,
    paddingHorizontal: 24,
    paddingBottom: 16,
    marginBottom: 12,
  },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  displayName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  bio: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 16 },
  statItem: { alignItems: 'center', paddingHorizontal: 24 },
  statDivider: { width: 1, height: 32, backgroundColor: '#333' },
  statNumber: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 13 },
  followBtn: { backgroundColor: '#E91E63', paddingHorizontal: 40, paddingVertical: 10, borderRadius: 24 },
  followingBtn: { backgroundColor: '#333' },
  followBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  section: { marginBottom: 12, padding: 16 },
  sectionTitle: { fontSize: 12, marginBottom: 12, textTransform: 'uppercase' },
  profileTabs: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  profileTabsLeft: { flexDirection: 'row', flex: 1, gap: 8 },
  savedTab: { width: 44, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#333', backgroundColor: '#111' },
  profileTab: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center', backgroundColor: '#222' },
  profileTabActive: { backgroundColor: '#E91E63' },
  profileTabText: { color: '#888', fontWeight: '600' },
  profileTabTextActive: { color: '#fff' },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, backgroundColor: '#1a0000', borderWidth: 1, borderColor: '#ff3333', borderRadius: 12, padding: 16 },
  logoutText: { color: '#ff3333', fontSize: 16, fontWeight: 'bold' },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '33.33%', aspectRatio: 1, padding: 1 },
  gridImage: { flex: 1, backgroundColor: '#000' },
  gridVideoBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', position: 'relative', overflow: 'hidden' },
  gridTextBox: { flex: 1, justifyContent: 'center', padding: 8, backgroundColor: '#111' },
  gridTextCaption: { color: '#fff', fontSize: 11 },
  emptyPosts: { paddingVertical: 8, textAlign: 'center' },
});
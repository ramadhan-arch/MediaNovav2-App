import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  FlatList, TouchableOpacity, ActivityIndicator,
  Platform, StatusBar, SectionList, Image as RNImage
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { collection, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../utils/firebase';
import { useStore } from '../../store/useStore';

interface SearchUser {
  id: string;
  displayName?: string;
  username?: string;
  email?: string;
  photoURL?: string;
  type: 'user';
}

interface SearchPost {
  id: string;
  caption?: string;
  mediaURL?: string;
  videoUrl?: string;
  imageUrl?: string;
  userDisplayName?: string;
  username?: string;
  userId?: string;
  likesCount?: number;
  mediaType?: 'image' | 'video' | 'audio';
  hashtags?: string[];
  type: 'post';
}

type SearchResult = SearchUser | SearchPost;

interface SearchSection {
  title: string;
  data: SearchResult[];
  key: string;
}

export default function SearchScreen({ navigation }: any) {
  const { isDarkMode } = useStore();
  const [searchText, setSearchText] = useState('');
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [postResults, setPostResults] = useState<SearchPost[]>([]);
  const [loading, setLoading] = useState(false);

  const theme = isDarkMode ? {
    background: '#0f172a',
    surface: '#111827',
    border: '#374151',
    text: '#f9fafb',
    muted: '#9ca3af',
    input: '#1f2937',
    inputText: '#f9fafb',
    card: '#1f2937',
  } : {
    background: '#f7f8fb',
    surface: '#ffffff',
    border: '#e5e7eb',
    text: '#111827',
    muted: '#6b7280',
    input: '#ffffff',
    inputText: '#111827',
    card: '#ffffff',
  };

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (text.trim().length < 2) {
      setUserResults([]);
      setPostResults([]);
      return;
    }

    setLoading(true);
    try {
      const keyword = text.trim().toLowerCase();

      // Search users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const filteredUsers = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any, type: 'user' as const }))
        .filter((user: SearchUser) => {
          const displayName = (user.displayName || '').toLowerCase();
          const username = (user.username || '').toLowerCase();
          return displayName.includes(keyword) || username.includes(keyword);
        })
        .slice(0, 10);

      // Search posts
      const postsSnapshot = await getDocs(collection(db, 'posts'));
      const filteredPosts = postsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any, type: 'post' as const }))
        .filter((post: SearchPost) => {
          const caption = (post.caption || '').toLowerCase();
          const userDisplayName = (post.userDisplayName || '').toLowerCase();
          const username = (post.username || '').toLowerCase();
          const hashtags = (post.hashtags || []) as string[];
          return (
            caption.includes(keyword) ||
            userDisplayName.includes(keyword) ||
            username.includes(keyword) ||
            hashtags.some((tag: string) => tag.toLowerCase().includes(keyword))
          );
        })
        .slice(0, 10);

      setUserResults(filteredUsers);
      setPostResults(filteredPosts);
    } catch (error) {
      console.log('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sections: SearchSection[] = [
    { title: 'Users', data: userResults, key: 'users' },
    { title: 'Posts', data: postResults, key: 'posts' },
  ].filter(s => s.data.length > 0) as SearchSection[];

  const renderUserItem = ({ item }: { item: SearchUser }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.displayName?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.displayName, { color: theme.text }]}>{item.displayName || item.username || 'User'}</Text>
        <Text style={[styles.email, { color: theme.muted }]}>{item.username ? `@${item.username}` : item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPostItem = ({ item }: { item: SearchPost }) => {
    const thumbnailUrl = item.mediaType === 'image' ? (item.mediaURL || item.imageUrl) : item.videoUrl;

    return (
      <TouchableOpacity
        style={[styles.postItem, { borderBottomColor: theme.border }]}
        onPress={() => navigation.navigate('PostDetail', { post: item })}
      >
        {/* Thumbnail */}
        {thumbnailUrl && (
          <View style={styles.postThumbnail}>
            <ExpoImage
              source={{ uri: thumbnailUrl }}
              style={styles.postImage}
              contentFit="cover"
            />
            {item.mediaType === 'video' && (
              <View style={styles.videoIcon}>
                <Ionicons name="play" size={24} color="#fff" />
              </View>
            )}
          </View>
        )}

        {/* Post info */}
        <View style={styles.postInfo}>
          <Text style={[styles.postCaption, { color: theme.text }]} numberOfLines={2}>
            {item.caption || 'No caption'}
          </Text>
          <View style={styles.postMeta}>
            <Text style={styles.postUser}>
              {item.userDisplayName || item.username}
            </Text>
            <View style={styles.postStats}>
              <Ionicons name="heart" size={14} color="#E91E63" />
              <Text style={[styles.statsText, { color: theme.muted }]}>{item.likesCount || 0}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}> 
        <Text style={[styles.headerTitle, { color: theme.text }]}>Cari</Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
        <Ionicons name="search-outline" size={20} color={theme.muted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.inputText }]}
          placeholder="Cari username atau konten..."
          placeholderTextColor={theme.muted}
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>

      {loading && <ActivityIndicator color="#E91E63" style={{ marginTop: 20 }} />}

      {sections.length > 0 ? (
        <SectionList<SearchResult, SearchSection>
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.type === 'user') {
              return renderUserItem({ item });
            }
            return renderPostItem({ item });
          }}
          renderSectionHeader={renderSectionHeader}
        />
      ) : searchText.length > 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={theme.muted} />
          <Text style={[styles.emptyText, { color: theme.muted }]}>Hasil tidak ditemukan</Text>
        </View>
      ) : searchText.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={theme.muted} />
          <Text style={[styles.emptyText, { color: theme.muted }]}>Mulai mengetik untuk mencari</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { color: '#E91E63', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  // User item styles
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  displayName: { fontWeight: '600', fontSize: 14 },
  email: { fontSize: 12, marginTop: 2 },
  // Post item styles
  postItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  postThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#111',
    overflow: 'hidden',
    position: 'relative',
  },
  postImage: { width: '100%', height: '100%' },
  videoIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  postInfo: { flex: 1, justifyContent: 'space-between' },
  postCaption: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postUser: { fontSize: 12 },
  postStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsText: { fontSize: 12 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyText: { fontSize: 16, marginTop: 12, textAlign: 'center' },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../utils/firebase';

export default function FollowListScreen({ route, navigation }: any) {
  const { userId, listType } = route.params;
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!userId) return;
    setTitle(listType === 'following' ? 'Following' : 'Followers');
    fetchFollowList();
  }, [userId, listType]);

  const fetchFollowList = async () => {
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (!userSnap.exists()) {
        setUsers([]);
        return;
      }
      const userData = userSnap.data() as any;
      const ids: string[] = listType === 'following' ? (userData.following || []) : (userData.followers || []);
      if (!ids.length) {
        setUsers([]);
        return;
      }

      const userDocs = await Promise.all(
        ids.map((id) => getDoc(doc(db, 'users', id)))
      );
      const loadedUsers = userDocs
        .filter((snap) => snap.exists())
        .map((snap) => ({ id: snap.id, ...snap.data() }));
      setUsers(loadedUsers);
    } catch (error) {
      console.log('Fetch follow list error', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.displayName?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.displayName || item.username || 'User'}</Text>
        <Text style={styles.subtitle}>{item.username ? `@${item.username}` : item.email}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#888" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {listType === 'following' ? 'Belum mengikuti siapa pun' : 'Belum ada followers'}
            </Text>
          </View>
        }
      />
    </View>
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
  userItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  userInfo: { flex: 1 },
  displayName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 13 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#888', fontSize: 16, textAlign: 'center' },
});

import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  FlatList, TouchableOpacity, ActivityIndicator,
  Platform, StatusBar
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../utils/firebase';

export default function SearchScreen({ navigation }: any) {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (text.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const keyword = text.trim().toLowerCase();
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const filtered = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((user: any) => {
          const displayName = (user.displayName || '').toLowerCase();
          const username = (user.username || '').toLowerCase();
          return displayName.includes(keyword) || username.includes(keyword);
        });
      setResults(filtered);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cari</Text>
      </View>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Cari user..."
          placeholderTextColor="#888"
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>
      {loading && <ActivityIndicator color="#E91E63" style={{ marginTop: 20 }} />}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userItem}
            onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.displayName?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.displayName}>{item.displayName || item.username || 'User'}</Text>
              <Text style={styles.email}>{item.username ? `@${item.username}` : item.email}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          searchText.length > 0 && !loading ? (
            <Text style={styles.emptyText}>User tidak ditemukan</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  searchBox: { padding: 12 },
  searchInput: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  userItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  displayName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  email: { color: '#888', fontSize: 13 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40 },
});
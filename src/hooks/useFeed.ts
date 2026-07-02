import { useState, useCallback } from 'react';
import {
  collection, query, orderBy, limit, getDocs,
  where, DocumentSnapshot, startAfter
} from 'firebase/firestore';
import { db } from '../utils/firebase';

export interface Post {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  mediaURL: string;
  mediaType: 'image' | 'video' | 'audio';
  caption: string;
  likesCount: number;
  commentsCount: number;
  createdAt: any;
  isLiked: boolean;
}

export const useFeed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (pageSize = 10) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      const snapshot = await getDocs(q);
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isLiked: false,
      })) as Post[];

      setPosts(fetchedPosts);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (error) {
      console.log('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMorePosts = useCallback(async (pageSize = 10) => {
    if (!hasMore || !lastVisible) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(pageSize)
      );
      const snapshot = await getDocs(q);
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isLiked: false,
      })) as Post[];

      setPosts(prev => [...prev, ...fetchedPosts]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (error) {
      console.log('Error fetching more posts:', error);
    } finally {
      setLoading(false);
    }
  }, [lastVisible, hasMore]);

  const fetchUserPosts = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isLiked: false,
      })) as Post[];

      setPosts(fetchedPosts);
    } catch (error) {
      console.log('Error fetching user posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPosts = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const allPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isLiked: false,
      })) as Post[];

      // Client-side search
      const filtered = allPosts.filter(post =>
        post.caption.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.userDisplayName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setPosts(filtered);
    } catch (error) {
      console.log('Error searching posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    posts,
    loading,
    hasMore,
    fetchPosts,
    fetchMorePosts,
    fetchUserPosts,
    searchPosts,
    setPosts,
  };
};
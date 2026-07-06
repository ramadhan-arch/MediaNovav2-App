import { create } from 'zustand';

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  followers: string[];
  following: string[];
  likedPosts: string[];
  savedPosts?: string[];
}

interface Post {
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

interface LastEditedMedia {
  originalImage: string;
  filteredImage: string;
  editedImageUri: string;
  activeFilter: string;
  activeTint: string | null;
  brightness: number;
  contrast: number;
  stickerLayers: StickerLayer[];
  activeStickerCategory: string;
  activeStickerId: string | null;
}

interface StickerLayer {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface AppState {
  currentUser: User | null;
  isLoggedIn: boolean;
  setCurrentUser: (user: User | null) => void;
  updateCurrentUser: (data: Partial<User>) => void;
  setIsLoggedIn: (val: boolean) => void;
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, data: Partial<Post>) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  lastEditedMedia: LastEditedMedia | null;
  setLastEditedMedia: (media: LastEditedMedia) => void;
  clearLastEditedMedia: () => void;
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  isLoggedIn: false,
  setCurrentUser: (user) => set({ currentUser: user }),
  updateCurrentUser: (data) => set((state) => ({
    currentUser: state.currentUser ? { ...state.currentUser, ...data } : state.currentUser
  })),
  setIsLoggedIn: (val) => set({ isLoggedIn: val }),
  posts: [],
  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
  updatePost: (id, data) => set((state) => ({
    posts: state.posts.map((p) => p.id === id ? { ...p, ...data } : p)
  })),
  isDarkMode: false,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  lastEditedMedia: null,
  setLastEditedMedia: (media) => set({ lastEditedMedia: media }),
  clearLastEditedMedia: () => set({ lastEditedMedia: null }),
}));
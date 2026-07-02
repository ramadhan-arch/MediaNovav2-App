import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './src/utils/firebase';
import { useStore } from './src/store/useStore';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

// Main Screens
import FeedScreen from './src/screens/main/feedScreen';
import VideoFeedScreen from './src/screens/main/VidioFeedScreen';
import SearchScreen from './src/screens/main/SearchScreen';
import CreatePostScreen from './src/screens/main/CreatePostScreen';
import ProfileScreen from './src/screens/main/ProfileScreen';
import NotificationScreen from './src/screens/main/NotificationScreen';
import UserProfileScreen from './src/screens/main/UserProfilScreen';
import VideoPlayerScreen from './src/screens/main/VideoPlayerScreen';
import PostDetailScreen from './src/screens/main/PostDetailScreen';

// Media Screens
import VideoRecordScreen from './src/screens/media/VideoRecordScreen';
import AudioRecordScreen from './src/screens/media/AudioRecordScreen';
import CameraFilterScreen from './src/screens/media/CameraFilterScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#222',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#E91E63',
        tabBarInactiveTintColor: '#888',
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Feed') {
            return <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />;
          } else if (route.name === 'VideoFeed') {
            return <Ionicons name={focused ? 'play-circle' : 'play-circle-outline'} size={24} color={color} />;
          } else if (route.name === 'CreatePost') {
            return (
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: '#E91E63',
                justifyContent: 'center', alignItems: 'center',
                marginBottom: 8
              }}>
                <Ionicons name="add" size={28} color="#fff" />
              </View>
            );
          } else if (route.name === 'Notifications') {
            return <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={24} color={color} />;
          } else if (route.name === 'Profile') {
            return <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />;
          }
          return <Ionicons name="apps-outline" size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="VideoFeed" component={VideoFeedScreen} options={{ tabBarLabel: 'Video' }} />
      <Tab.Screen name="CreatePost" component={CreatePostScreen} options={{ tabBarLabel: '' }} />
      <Tab.Screen name="Notifications" component={NotificationScreen} options={{ tabBarLabel: 'Notif' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="VideoRecord" component={VideoRecordScreen} />
      <Stack.Screen name="AudioRecord" component={AudioRecordScreen} />
      <Stack.Screen name="CameraFilter" component={CameraFilterScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const { isLoggedIn, setIsLoggedIn, setCurrentUser } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        const profile = userSnap.exists() ? userSnap.data() : {} as any;

        setCurrentUser({
          uid: user.uid,
          email: user.email || profile.email || '',
          displayName: user.displayName || profile.displayName || '',
          photoURL: user.photoURL || profile.photoURL || '',
          bio: profile.bio || '',
          followersCount: profile.followersCount || 0,
          followingCount: profile.followingCount || 0,
          followers: profile.followers || [],
          following: profile.following || [],
          likedPosts: profile.likedPosts || [],
        });
        setIsLoggedIn(true);
      } else {
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
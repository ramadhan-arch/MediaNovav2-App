import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

interface Story {
  id: string;
  userDisplayName: string;
  userPhotoURL?: string;
  hasViewed?: boolean;
}

interface StoryRingProps {
  story: Story;
  onPress?: (storyId: string) => void;
}

export default function StoryRing({ story, onPress }: StoryRingProps) {
  const borderColor = story.hasViewed ? '#444' : '#E91E63';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(story.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.ring, { borderColor, borderWidth: story.hasViewed ? 2 : 3 }]}>
        {story.userPhotoURL ? (
          <Image
            source={{ uri: story.userPhotoURL }}
            style={styles.image}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {story.userDisplayName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.username} numberOfLines={1}>
        {story.userDisplayName}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  username: {
    color: '#fff',
    fontSize: 12,
    maxWidth: 64,
  },
});
/**
 * Store helper functions untuk utility dan data formatting
 */

import { Post } from '../hooks/useFeed';

/**
 * Sort posts berdasarkan engagement (likes + comments)
 */
export const sortByEngagement = (posts: Post[]): Post[] => {
  return [...posts].sort((a, b) => {
    const engagementA = (a.likesCount || 0) + (a.commentsCount || 0);
    const engagementB = (b.likesCount || 0) + (b.commentsCount || 0);
    return engagementB - engagementA;
  });
};

/**
 * Filter posts berdasarkan media type
 */
export const filterByMediaType = (
  posts: Post[],
  mediaType: 'image' | 'video' | 'audio'
): Post[] => {
  return posts.filter(post => post.mediaType === mediaType);
};

/**
 * Get trending posts (recent + high engagement)
 */
export const getTrendingPosts = (posts: Post[], limit = 10): Post[] => {
  const now = new Date().getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const recentPosts = posts.filter(post => {
    const postTime = post.createdAt?.toDate?.()?.getTime?.() || new Date(post.createdAt).getTime();
    return now - postTime < oneDayMs;
  });

  return sortByEngagement(recentPosts).slice(0, limit);
};

/**
 * Format caption - remove excess whitespace dan add hashtags
 */
export const formatCaption = (caption: string): string => {
  return caption
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/([#@])\s+/g, '$1'); // Pastikan hashtag/mention tidak terpisah
};

/**
 * Extract hashtags dari caption
 */
export const extractHashtags = (caption: string): string[] => {
  const hashtagRegex = /#(\w+)/g;
  const matches = caption.match(hashtagRegex) || [];
  return matches.map(tag => tag.toLowerCase());
};

/**
 * Extract mentions dari caption
 */
export const extractMentions = (caption: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const matches = caption.match(mentionRegex) || [];
  return matches.map(mention => mention.toLowerCase());
};

/**
 * Calculate engagement rate
 */
export const calculateEngagementRate = (
  post: Post,
  totalFollowers: number = 1000
): number => {
  if (totalFollowers === 0) return 0;
  const engagement = (post.likesCount || 0) + (post.commentsCount || 0);
  return (engagement / totalFollowers) * 100;
};

/**
 * Group posts by date
 */
export const groupPostsByDate = (posts: Post[]): Record<string, Post[]> => {
  const grouped: Record<string, Post[]> = {};

  posts.forEach(post => {
    const date = post.createdAt?.toDate?.() || new Date(post.createdAt);
    const dateKey = date.toLocaleDateString('id-ID');

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(post);
  });

  return grouped;
};

/**
 * Merge duplicate posts (by ID)
 */
export const mergePostsUnique = (...postArrays: Post[][]): Post[] => {
  const seen = new Set<string>();
  const merged: Post[] = [];

  postArrays.forEach(posts => {
    posts.forEach(post => {
      if (!seen.has(post.id)) {
        seen.add(post.id);
        merged.push(post);
      }
    });
  });

  return merged;
};

/**
 * Filter posts by keyword dalam caption
 */
export const searchPostsByKeyword = (posts: Post[], keyword: string): Post[] => {
  const lowerKeyword = keyword.toLowerCase();
  return posts.filter(post =>
    post.caption.toLowerCase().includes(lowerKeyword) ||
    post.userDisplayName.toLowerCase().includes(lowerKeyword)
  );
};

/**
 * Get posts dari specific user
 */
export const getPostsByUser = (posts: Post[], userId: string): Post[] => {
  return posts.filter(post => post.userId === userId);
};

/**
 * Calculate average likes per post
 */
export const getAverageLikes = (posts: Post[]): number => {
  if (posts.length === 0) return 0;
  const totalLikes = posts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
  return Math.round(totalLikes / posts.length);
};

/**
 * Calculate average comments per post
 */
export const getAverageComments = (posts: Post[]): number => {
  if (posts.length === 0) return 0;
  const totalComments = posts.reduce((sum, post) => sum + (post.commentsCount || 0), 0);
  return Math.round(totalComments / posts.length);
};

/**
 * Check if post is old (older than X days)
 */
export const isPostOld = (post: Post, days: number = 7): boolean => {
  const postTime = post.createdAt?.toDate?.()?.getTime?.() || new Date(post.createdAt).getTime();
  const ageMs = new Date().getTime() - postTime;
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  return ageDays > days;
};

/**
 * Format engagement count (1000 -> 1K, 1000000 -> 1M)
 */
export const formatEngagementCount = (count: number): string => {
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1) + 'M';
  }
  if (count >= 1_000) {
    return (count / 1_000).toFixed(1) + 'K';
  }
  return count.toString();
};

/**
 * Check if post contains media
 */
export const hasMedia = (post: Post): boolean => {
  return Boolean(post.mediaURL);
};

/**
 * Validate post data before adding
 */
export const isValidPost = (post: Partial<Post>): boolean => {
  return Boolean(
    post.id &&
    post.userId &&
    (post.caption || post.mediaURL) &&
    post.userDisplayName
  );
};

/**
 * Create post summary (truncate caption)
 */
export const createPostSummary = (post: Post, maxLength: number = 100): string => {
  if (post.caption.length <= maxLength) {
    return post.caption;
  }
  return post.caption.substring(0, maxLength) + '...';
};
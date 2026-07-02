import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export interface MediaResult {
  uri: string;
  type: 'image' | 'video' | 'audio';
  fileName?: string;
}

export const useMedia = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = useCallback(async (): Promise<MediaResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        return {
          uri: result.assets[0].uri,
          type: 'image',
          fileName: result.assets[0].fileName || undefined,
        };
      }
      return null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const pickVideo = useCallback(async (): Promise<MediaResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        return {
          uri: result.assets[0].uri,
          type: 'video',
          fileName: result.assets[0].fileName || undefined,
        };
      }
      return null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const takePhoto = useCallback(async (): Promise<MediaResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        return {
          uri: result.assets[0].uri,
          type: 'image',
          fileName: `photo_${Date.now()}.jpg`,
        };
      }
      return null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const recordVideo = useCallback(async (): Promise<MediaResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        return {
          uri: result.assets[0].uri,
          type: 'video',
          fileName: `video_${Date.now()}.mp4`,
        };
      }
      return null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFileInfo = useCallback(async (uri: string) => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const deleteFile = useCallback(async (uri: string) => {
    try {
      await FileSystem.deleteAsync(uri);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const getBase64 = useCallback(async (uri: string): Promise<string | null> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      } as any);
      return base64;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  return {
    loading,
    error,
    pickImage,
    pickVideo,
    takePhoto,
    recordVideo,
    getFileInfo,
    deleteFile,
    getBase64,
  };
};
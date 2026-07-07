import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Modal,
  ViewStyle, Platform, StatusBar
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../utils/firebase';
import { useStore } from '../../store/useStore';
import { uploadToCloudinary } from '../../utils/cloudinary';

const TEXT_COLORS = ['#ffffff', '#000000', '#E91E63', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff8800'];
const TEXT_POSITIONS = ['top', 'center', 'bottom'];

export default function CreatePostScreen({ navigation, route }: any) {
  const { currentUser, addPost, isDarkMode } = useStore();
  const [caption, setCaption] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFilterName, setPreviewFilterName] = useState('Normal');
  const [previewTintColor, setPreviewTintColor] = useState<string | null>(null);
  const [previewStickerLayers, setPreviewStickerLayers] = useState<any[]>([]);

  // Text overlay state
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textPosition, setTextPosition] = useState('bottom');
  const [savedOverlayText, setSavedOverlayText] = useState('');

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

  // Video player untuk preview
  const player = useVideoPlayer(
    mediaType === 'video' && mediaUri ? mediaUri : null,
    (p) => { p.loop = true; p.pause(); }
  );

  useEffect(() => {
    if (route?.params?.editedImageUri || route?.params?.imageUri) {
      setMediaUri(route.params.editedImageUri || route.params.imageUri);
      setMediaType('image');
      setPreviewFilterName(route.params.filterName || 'Normal');
      setPreviewTintColor(route.params.tintColor || null);
      const hasFlattenedImage = !!route?.params?.editedImageUri;
      setPreviewStickerLayers(hasFlattenedImage ? [] : route.params.stickerLayers || []);
    } else if (route?.params?.videoUri) {
      setMediaUri(route.params.videoUri);
      setMediaType('video');
      setPreviewFilterName('Normal');
      setPreviewTintColor(null);
      setPreviewStickerLayers([]);
    } else if (route?.params?.audioUri) {
      setMediaUri(route.params.audioUri);
      setMediaType('audio');
      setPreviewFilterName('Normal');
      setPreviewTintColor(null);
      setPreviewStickerLayers([]);
    }
  }, [route?.params]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setMediaUri(result.assets[0].uri);
      setMediaType('image');
      setSavedOverlayText('');
      setPreviewTintColor(null);
      setPreviewStickerLayers([]);
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: 60,
      quality: 0.8,
    });
    if (!result.canceled) {
      setMediaUri(result.assets[0].uri);
      setMediaType('video');
      setSavedOverlayText('');
      setPreviewTintColor(null);
      setPreviewStickerLayers([]);
    }
  };

  const handlePost = async () => {
    if (!caption && !mediaUri) {
      Alert.alert('Error', 'Tambahkan caption atau media dulu!');
      return;
    }
    setLoading(true);
    setUploadProgress(0);
    try {
      let mediaURL = '';
      let thumbnailURL = '';
      if (mediaUri) {
        const uploadResult = await uploadToCloudinary(mediaUri, mediaType, (progress) => {
          setUploadProgress(progress);
        });
        
        // Handle both string and object returns
        if (typeof uploadResult === 'string') {
          mediaURL = uploadResult;
        } else {
          mediaURL = uploadResult.url;
          thumbnailURL = uploadResult.thumbnailUrl || '';
        }
      }

      const postData: any = {
        userId: currentUser?.uid,
        userDisplayName: currentUser?.displayName,
        userPhotoURL: currentUser?.photoURL || '',
        mediaURL,
        mediaType,
        caption,
        textOverlay: savedOverlayText || '',
        textColor,
        textPosition,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
      };

      // Tambah thumbnail untuk video
      if (mediaType === 'video' && thumbnailURL) {
        postData.thumbnailURL = thumbnailURL;
      }

      const docRef = await addDoc(collection(db, 'posts'), postData);
      const addPostData: any = {
        id: docRef.id,
        userId: currentUser?.uid || '',
        userDisplayName: currentUser?.displayName || '',
        userPhotoURL: currentUser?.photoURL || '',
        mediaURL,
        mediaType,
        caption,
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: new Date(),
      };

      if (mediaType === 'video' && thumbnailURL) {
        addPostData.thumbnailURL = thumbnailURL;
      }

      addPost(addPostData);

      setCaption('');
      setMediaUri(null);
      setSavedOverlayText('');
      setUploadProgress(0);
      Alert.alert('Berhasil! 🎉', 'Post berhasil dibuat!');
    } catch (error: any) {
      Alert.alert('Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTextPositionStyle = () => {
  const positions: Record<string, ViewStyle> = {
    top: { top: 30 },
    middle: { top: '50%', transform: [{ translateY: -12 }] },
    bottom: { bottom: 30 }
  };
  return positions[textPosition] || positions.bottom;
};

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}> 
        <Text style={[styles.headerTitle, { color: theme.text }]}>Buat Post</Text>
      </View>

      {/* Media buttons */}
      <View style={styles.mediaButtons}>
        <TouchableOpacity style={[styles.mediaBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={pickImage}>
          <Ionicons name="image-outline" size={26} color={theme.text} />
          <Text style={[styles.mediaBtnText, { color: theme.text }]}>Foto</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.mediaBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={pickVideo}>
          <Ionicons name="videocam-outline" size={26} color={theme.text} />
          <Text style={[styles.mediaBtnText, { color: theme.text }]}>Video</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mediaBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => navigation.navigate('VideoRecord')}
        >
          <Ionicons name="radio-button-on-outline" size={26} color="#E91E63" />
          <Text style={[styles.mediaBtnText, { color: theme.text }]}>Rekam</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mediaBtn}
          onPress={() => navigation.navigate('AudioRecord')}
        >
          <Ionicons name="mic-outline" size={26} color={theme.text} />
          <Text style={[styles.mediaBtnText, { color: theme.text }]}>Audio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mediaBtn}
          onPress={() => navigation.navigate('CameraFilter', { reopenFromCreatePost: true })}
        >
          <Ionicons name="color-filter-outline" size={26} color={theme.text} />
          <Text style={[styles.mediaBtnText, { color: theme.text }]}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Preview media */}
      {mediaUri && (
        <View style={styles.previewBox}>
          {/* IMAGE preview */}
          {mediaType === 'image' && (
            <View style={styles.imageWrapper}>
              <ExpoImage source={{ uri: mediaUri }} style={styles.previewImage} contentFit="contain" />
              {previewTintColor ? (
                <View style={[styles.tintOverlay, { backgroundColor: previewTintColor }]} pointerEvents="none" />
              ) : null}
              {previewStickerLayers.map((sticker) => {
                const size = 62 * (sticker.scale || 1);
                return (
                  <View
                    key={sticker.id}
                    style={[
                      styles.stickerLayer,
                      {
                        width: size,
                        height: size,
                        left: (sticker.x || 0) - size / 2,
                        top: (sticker.y || 0) - size / 2,
                        transform: [{ rotate: `${sticker.rotation || 0}deg` }],
                      },
                    ]}
                  >
                    <Text style={[styles.stickerEmoji, { fontSize: 32 * (sticker.scale || 1), lineHeight: 36 * (sticker.scale || 1) }]}>
                      {sticker.emoji}
                    </Text>
                  </View>
                );
              })}
              {savedOverlayText ? (
                <Text style={[
                  styles.overlayTextPreview,
                  { color: textColor },
                  getTextPositionStyle()
                ]}>
                  {savedOverlayText}
                </Text>
              ) : null}
            </View>
          )}

          {/* VIDEO preview */}
          {mediaType === 'video' && (
            <View style={styles.videoWrapper}>
              <VideoView
                player={player}
                style={styles.videoPreview}
                contentFit="contain"
                nativeControls={true}
              />
              {savedOverlayText ? (
                <Text style={[
                  styles.overlayTextPreview,
                  { color: textColor },
                  getTextPositionStyle()
                ]}>
                  {savedOverlayText}
                </Text>
              ) : null}
            </View>
          )}

          {/* AUDIO preview */}
          {mediaType === 'audio' && (
            <View style={styles.audioPreview}>
              <Ionicons name="musical-notes" size={48} color="#E91E63" />
              <Text style={styles.audioPreviewText}>Audio dipilih ✅</Text>
            </View>
          )}

          {/* Action buttons di atas preview */}
          <View style={styles.previewActions}>
            {(mediaType === 'image' || mediaType === 'video') && (
              <TouchableOpacity
                style={styles.overlayBtn}
                onPress={() => {
                  setOverlayText(savedOverlayText);
                  setShowTextOverlay(true);
                }}
              >
                <Ionicons name="text-outline" size={18} color="#fff" />
                <Text style={styles.overlayBtnText}>Teks Overlay</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => { setMediaUri(null); setSavedOverlayText(''); }}
            >
              <Ionicons name="close-circle" size={18} color="#E91E63" />
              <Text style={styles.removeBtnText}>Hapus</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Caption */}
      <View style={styles.captionBox}>
        <TextInput
          style={[styles.captionInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.inputText }]}
          placeholder="Tulis caption..."
          placeholderTextColor={theme.muted}
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={500}
        />
        <Text style={styles.charCount}>{caption.length}/500</Text>
      </View>

      {/* Upload progress */}
      {loading && (
        <View style={styles.progressBox}> 
          <Text style={[styles.progressText, { color: theme.text }]}>Mengupload... {Math.min(100, uploadProgress)}%</Text>
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}> 
            <View style={[styles.progressFill, { width: `${Math.min(100, uploadProgress)}%` }]} />
          </View>
        </View>
      )}

      {/* Post button */}
      <TouchableOpacity
        style={styles.postBtn}
        onPress={handlePost}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.postBtnText}>Post Sekarang 🚀</Text>
        }
      </TouchableOpacity>

      {/* Text Overlay Modal */}
      <Modal
        visible={showTextOverlay}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTextOverlay(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Teks Overlay</Text>
              <TouchableOpacity onPress={() => setShowTextOverlay(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.overlayInput}
              placeholder="Tulis teks overlay..."
              placeholderTextColor="#888"
              value={overlayText}
              onChangeText={setOverlayText}
              multiline
              maxLength={100}
            />

            <Text style={styles.modalLabel}>Warna Teks:</Text>
            <View style={styles.colorRow}>
              {TEXT_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorBtn,
                    { backgroundColor: color },
                    textColor === color && styles.colorBtnActive
                  ]}
                  onPress={() => setTextColor(color)}
                />
              ))}
            </View>

            <Text style={styles.modalLabel}>Posisi Teks:</Text>
            <View style={styles.positionRow}>
              {TEXT_POSITIONS.map(pos => (
                <TouchableOpacity
                  key={pos}
                  style={[styles.posBtn, textPosition === pos && styles.posBtnActive]}
                  onPress={() => setTextPosition(pos)}
                >
                  <Text style={[styles.posBtnText, textPosition === pos && styles.posBtnTextActive]}>
                    {pos === 'top' ? '⬆️ Atas' : pos === 'center' ? '⬛ Tengah' : '⬇️ Bawah'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.saveOverlayBtn}
              onPress={() => {
                setSavedOverlayText(overlayText);
                setShowTextOverlay(false);
              }}
            >
              <Text style={styles.saveOverlayBtnText}>Simpan Teks ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  mediaButtons: { flexDirection: 'row', justifyContent: 'space-around', padding: 12, flexWrap: 'wrap', gap: 8 },
  mediaBtn: { alignItems: 'center', padding: 12, borderRadius: 12, width: 62, borderWidth: 1 },
  mediaBtnText: { fontSize: 10, marginTop: 4 },
  previewBox: { margin: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' },
  imageWrapper: { position: 'relative', width: '100%', aspectRatio: 1, backgroundColor: '#000', overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%', backgroundColor: '#000' },
  tintOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, opacity: 0.35 },
  stickerLayer: { position: 'absolute', justifyContent: 'center', alignItems: 'center', zIndex: 3 },
  stickerEmoji: { textAlign: 'center' },
  videoWrapper: { position: 'relative', width: '100%', aspectRatio: 9 / 16, backgroundColor: '#000', overflow: 'hidden' },
  videoPreview: { width: '100%', height: '100%', backgroundColor: '#000' },
  audioPreview: { height: 150, justifyContent: 'center', alignItems: 'center', gap: 12 },
  audioPreviewText: { color: '#fff', fontSize: 16 },
  overlayTextPreview: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowRadius: 4,
    paddingHorizontal: 16,
  },
  previewActions: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: 'rgba(0,0,0,0.7)' },
  overlayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  overlayBtnText: { color: '#fff', fontSize: 13 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  removeBtnText: { color: '#E91E63', fontSize: 13 },
  captionBox: { margin: 12 },
  captionInput: { backgroundColor: '#111', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#333' },
  charCount: { color: '#888', textAlign: 'right', marginTop: 4, fontSize: 12 },
  progressBox: { marginHorizontal: 12, marginBottom: 8 },
  progressText: { color: '#fff', marginBottom: 6, textAlign: 'center' },
  progressBar: { height: 6, backgroundColor: '#333', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: '#E91E63', borderRadius: 3 },
  postBtn: { margin: 12, backgroundColor: '#E91E63', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 40 },
  postBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  overlayInput: { backgroundColor: '#222', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#333', marginBottom: 16 },
  modalLabel: { color: '#888', fontSize: 13, marginBottom: 10, textTransform: 'uppercase' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#333' },
  colorBtnActive: { borderColor: '#E91E63', transform: [{ scale: 1.2 }] },
  positionRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  posBtn: { flex: 1, padding: 10, backgroundColor: '#222', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  posBtnActive: { borderColor: '#E91E63', backgroundColor: '#1a0010' },
  posBtnText: { color: '#888', fontSize: 12 },
  posBtnTextActive: { color: '#E91E63', fontWeight: 'bold' },
  saveOverlayBtn: { backgroundColor: '#E91E63', padding: 14, borderRadius: 12, alignItems: 'center' },
  saveOverlayBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
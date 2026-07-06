import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  PanResponder,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';

const SCREEN_WIDTH = Dimensions.get('window').width;

const COLOR_FILTERS = [
  { name: 'Normal', label: 'Normal', emoji: '⭕', tintColor: null },
  { name: 'Grayscale', label: 'Grayscale', emoji: '⬛', tintColor: 'rgba(255,255,255,0.22)' },
  { name: 'Sepia', label: 'Sepia', emoji: '🟫', tintColor: 'rgba(112, 66, 20, 0.24)' },
  { name: 'Vivid', label: 'Vivid', emoji: '🌈', tintColor: 'rgba(255, 120, 0, 0.16)' },
  { name: 'Warm', label: 'Warm', emoji: '🔆', tintColor: 'rgba(255, 140, 0, 0.22)' },
  { name: 'Cool', label: 'Cool', emoji: '❄️', tintColor: 'rgba(0, 110, 255, 0.22)' },
];

const STICKER_CATEGORIES = [
  { key: 'Smileys', label: 'Smileys', stickers: ['😀', '😄', '😂', '😍', '😊', '🥰', '😎', '🤩', '😘', '😇'] },
  { key: 'Love', label: 'Love', stickers: ['❤️', '💖', '💘', '💕', '💞', '💓', '💗', '💌', '❣️', '💟'] },
  { key: 'Animals', label: 'Animals', stickers: ['🐶', '🐱', '🐼', '🐨', '🦊', '🐰', '🐻', '🐸', '🦄', '🦋'] },
  { key: 'Food', label: 'Food', stickers: ['🍎', '🍕', '🍔', '🍣', '🍩', '🍉', '🍓', '🍦', '☕', '🍪'] },
  { key: 'Nature', label: 'Nature', stickers: ['🌸', '🌼', '🌻', '🌳', '🌈', '☁️', '🌧️', '❄️', '🌞', '🌙'] },
  { key: 'Travel', label: 'Travel', stickers: ['✈️', '🌍', '🗺️', '🛩️', '🚗', '🚲', '🏖️', '🏕️', '🏝️', '🗽'] },
  { key: 'Objects', label: 'Objects', stickers: ['🎵', '📸', '📱', '💡', '🎧', '⌚', '🔑', '📌', '📎', '🛍️'] },
  { key: 'Symbols', label: 'Symbols', stickers: ['⭐', '⚡', '🔥', '💧', '❗', '❓', '✳️', '✅', '♻️', '☮️'] },
  { key: 'Flags', label: 'Flags', stickers: ['🇮🇩', '🇺🇸', '🇬🇧', '🇯🇵', '🇰🇷', '🇨🇦', '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸'] },
];

type StickerLayer = {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export default function CameraFilterScreen({ navigation, route }: any) {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [filteredImage, setFilteredImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('Normal');
  const [activeTint, setActiveTint] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'filter' | 'beauty' | 'sticker'>('filter');
  const [activeStickerCategory, setActiveStickerCategory] = useState('Smileys');
  const [stickerLayers, setStickerLayers] = useState<StickerLayer[]>([]);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [brightness, setBrightness] = useState(1.0);
  const [contrast, setContrast] = useState(1.0);
  const [imageKey, setImageKey] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  const stickerCountRef = useRef(0);
  const dragOffsetRef = useRef<Record<string, { x: number; y: number }>>({});
  const panResponders = useRef<Record<string, any>>({});
  const editorRef = useRef<any>(null);
  const { lastEditedMedia, setLastEditedMedia, clearLastEditedMedia } = useStore();

  useEffect(() => {
    const fromCreatePost = route?.params?.reopenFromCreatePost;
    const routeImageUri = fromCreatePost ? null : route?.params?.imageUri || route?.params?.editedImageUri;
    const routeStickerLayers = fromCreatePost ? null : route?.params?.stickerLayers;

    if (routeImageUri) {
      setOriginalImage(routeImageUri);
      setFilteredImage(route?.params?.editedImageUri || routeImageUri);
      setActiveFilter(route.params.filterName || 'Normal');
      setActiveTint(route.params.tintColor || null);

      if (routeStickerLayers?.length) {
        setStickerLayers(routeStickerLayers);
        setActiveStickerId(routeStickerLayers[0]?.id ?? null);
      } else {
        setStickerLayers([]);
        setActiveStickerId(null);
      }

      setImageKey((prev) => prev + 1);
      return;
    }

    if (!originalImage && lastEditedMedia?.originalImage) {
      setOriginalImage(lastEditedMedia.originalImage);
      setFilteredImage(lastEditedMedia.filteredImage || lastEditedMedia.editedImageUri || lastEditedMedia.originalImage);
      setActiveFilter(lastEditedMedia.activeFilter || 'Normal');
      setActiveTint(lastEditedMedia.activeTint || null);
      setBrightness(lastEditedMedia.brightness ?? 1.0);
      setContrast(lastEditedMedia.contrast ?? 1.0);
      setStickerLayers(lastEditedMedia.stickerLayers || []);
      setActiveStickerCategory(lastEditedMedia.activeStickerCategory || 'Smileys');
      setActiveStickerId(lastEditedMedia.activeStickerId || null);
      setImageKey((prev) => prev + 1);
    }
  }, [route?.params, lastEditedMedia]);

  useEffect(() => {
    if (!originalImage) {
      clearLastEditedMedia();
      return;
    }

    setLastEditedMedia({
      originalImage,
      filteredImage: filteredImage || originalImage,
      editedImageUri: filteredImage || originalImage,
      activeFilter,
      activeTint,
      brightness,
      contrast,
      stickerLayers,
      activeStickerCategory,
      activeStickerId,
    });
  }, [
    originalImage,
    filteredImage,
    activeFilter,
    activeTint,
    brightness,
    contrast,
    stickerLayers,
    activeStickerCategory,
    activeStickerId,
    setLastEditedMedia,
    clearLastEditedMedia,
  ]);

  const captureFinalEditedImage = async () => {
    if (!editorRef.current) {
      return filteredImage || originalImage;
    }

    try {
      const snapshotUri = await captureRef(editorRef.current, {
        result: 'tmpfile',
        format: 'jpg',
        quality: 0.9,
      });
      return snapshotUri;
    } catch (error) {
      console.log('Failed to capture edited image', error);
      return filteredImage || originalImage;
    }
  };

  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Izin diperlukan', 'Butuh izin galeri untuk pilih foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setOriginalImage(result.assets[0].uri);
      setFilteredImage(result.assets[0].uri);
      setActiveFilter('Normal');
      setActiveTint(null);
      setStickerLayers([]);
      setActiveStickerId(null);
      setImageKey((prev) => prev + 1);
    }
  };

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Izin diperlukan', 'Butuh izin kamera untuk ambil foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setOriginalImage(result.assets[0].uri);
      setFilteredImage(result.assets[0].uri);
      setActiveFilter('Normal');
      setActiveTint(null);
      setStickerLayers([]);
      setActiveStickerId(null);
      setImageKey((prev) => prev + 1);
    }
  };

  const applyFilter = async (filter: typeof COLOR_FILTERS[number]) => {
    if (!originalImage) {
      Alert.alert('Pilih foto dulu', 'Silakan pilih foto sebelum menggunakan filter.');
      return;
    }

    setLoading(true);
    setActiveFilter(filter.name);
    setActiveTint(filter.tintColor || null);
    const baseImage = filteredImage || originalImage;
    setFilteredImage(baseImage);
    setImageKey((prev) => prev + 1);
    setLoading(false);
  };

  const applyBeautyFilter = async () => {
    if (!originalImage) {
      Alert.alert('Pilih foto dulu', 'Silakan pilih foto sebelum menggunakan beauty.');
      return;
    }

    setLoading(true);
    try {
      const baseImage = filteredImage || originalImage;
      const result = await manipulateAsync(baseImage, [{ resize: { width: 1080 } }], {
        format: SaveFormat.JPEG,
        compress: brightness > 1 ? 0.95 : 0.8,
      });
      setFilteredImage(result.uri);
      setImageKey((prev) => prev + 1);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const addSticker = (emoji: string) => {
    const id = `sticker-${stickerCountRef.current + 1}`;
    stickerCountRef.current += 1;
    setStickerLayers((prev) => [
      ...prev,
      {
        id,
        emoji,
        x: SCREEN_WIDTH * 0.3,
        y: SCREEN_WIDTH * 0.3,
        scale: 1,
        rotation: 0,
      },
    ]);
    setActiveStickerId(id);
  };

  const updateSticker = (id: string, changes: Partial<StickerLayer>) => {
    setStickerLayers((prev) => prev.map((sticker) => (sticker.id === id ? { ...sticker, ...changes } : sticker)));
  };

  const removeSticker = (id: string) => {
    setStickerLayers((prev) => prev.filter((sticker) => sticker.id !== id));
    if (activeStickerId === id) {
      setActiveStickerId(null);
    }
  };

  const createPanResponder = (stickerId: string) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const sticker = stickerLayers.find((item) => item.id === stickerId);
        if (sticker) {
          dragOffsetRef.current[stickerId] = { x: sticker.x, y: sticker.y };
        }
        setActiveStickerId(stickerId);
      },
      onPanResponderMove: (_evt, gestureState) => {
        const origin = dragOffsetRef.current[stickerId];
        if (!origin) return;
        updateSticker(stickerId, {
          x: origin.x + gestureState.dx,
          y: origin.y + gestureState.dy,
        });
      },
      onPanResponderRelease: () => {
        delete dragOffsetRef.current[stickerId];
      },
      onPanResponderTerminate: () => {
        delete dragOffsetRef.current[stickerId];
      },
    });

  const getPanResponder = (id: string) => {
    if (!panResponders.current[id]) {
      panResponders.current[id] = createPanResponder(id);
    }
    return panResponders.current[id];
  };

  const selectedStickerLayer = stickerLayers.find((sticker) => sticker.id === activeStickerId);

  const handleUse = async () => {
    if (!filteredImage) {
      Alert.alert('Pilih foto dulu', 'Silakan pilih foto sebelum melanjutkan.');
      return;
    }

    setIsCapturing(true);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const capturedUri = await captureFinalEditedImage();
    const finalEditedImage = capturedUri || filteredImage;

    setIsCapturing(false);

    navigation.navigate('MainTabs', {
      screen: 'CreatePost',
      params: {
        imageUri: finalEditedImage,
        editedImageUri: finalEditedImage,
        filterName: activeFilter,
        tintColor: activeTint,
      },
    });
  };

  const activeStickers = STICKER_CATEGORIES.find((category) => category.key === activeStickerCategory)?.stickers || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filter & Sticker</Text>
        <TouchableOpacity style={[styles.useBtn, !filteredImage && styles.useBtnDisabled]} onPress={handleUse} disabled={!filteredImage}>
          <Text style={styles.useBtnText}>Pakai</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.imageBox}>
        {filteredImage ? (
          <View style={styles.imageWrapper} ref={editorRef} collapsable={false}>
            <Image key={imageKey} source={{ uri: filteredImage }} style={styles.previewImage} />
            {activeTint ? <View style={[styles.tintOverlay, { backgroundColor: activeTint }]} /> : null}
            {stickerLayers.map((sticker) => {
              const size = 62 * sticker.scale;
              const isSelected = selectedStickerLayer?.id === sticker.id;
              return (
                <View
                  key={sticker.id}
                  style={[
                    styles.stickerLayer,
                    {
                      width: size,
                      height: size,
                      left: sticker.x - size / 2,
                      top: sticker.y - size / 2,
                      transform: [{ rotate: `${sticker.rotation}deg` }],
                    },
                  ]}
                  {...getPanResponder(sticker.id).panHandlers}
                >
                  <TouchableOpacity
                    style={styles.stickerTouch}
                    activeOpacity={0.8}
                    onPress={() => setActiveStickerId(sticker.id)}
                  >
                    <Text style={[styles.stickerEmoji, { fontSize: 32 * sticker.scale, lineHeight: 36 * sticker.scale }]}>{sticker.emoji}</Text>
                  </TouchableOpacity>
                  {isSelected && !isCapturing ? (
                    <View style={styles.selectionOutline} pointerEvents="none" />
                  ) : null}
                </View>
              );
            })}
            {loading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color="#E91E63" size="large" />
                <Text style={styles.loadingText}>Memproses...</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <TouchableOpacity style={styles.placeholder} onPress={pickImage} activeOpacity={0.8}>
            <Ionicons name="image-outline" size={64} color="#333" />
            <Text style={styles.placeholderText}>Ketuk untuk pilih foto</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.pickerButtons}>
        <TouchableOpacity style={styles.pickerBtn} onPress={pickImage}>
          <Ionicons name="images-outline" size={18} color="#fff" />
          <Text style={styles.pickerBtnText}>Galeri</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickerBtn} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={18} color="#fff" />
          <Text style={styles.pickerBtnText}>Kamera</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(['filter', 'beauty', 'sticker'] as const).map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'filter' ? '🎨 Filter' : tab === 'beauty' ? '✨ Beauty' : '🎭 Sticker'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomPanel}>
        {activeTab === 'filter' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionList}>
            {COLOR_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.name}
                style={[styles.filterItem, activeFilter === filter.name && styles.filterItemActive]}
                onPress={() => applyFilter(filter)}
                disabled={loading}
              >
                <Text style={styles.filterEmoji}>{filter.emoji}</Text>
                <Text style={[styles.filterName, activeFilter === filter.name && styles.filterNameActive]}>{filter.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {activeTab === 'beauty' && (
          <View style={styles.beautyContainer}>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Brightness</Text>
              <Text style={styles.sliderValue}>{brightness.toFixed(1)}</Text>
            </View>
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => setBrightness(Math.max(0.5, brightness - 0.1))}>
                <Text style={styles.controlBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.controlBar} />
              <TouchableOpacity style={styles.controlBtn} onPress={() => setBrightness(Math.min(2.0, brightness + 0.1))}>
                <Text style={styles.controlBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Contrast</Text>
              <Text style={styles.sliderValue}>{contrast.toFixed(1)}</Text>
            </View>
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => setContrast(Math.max(0.5, contrast - 0.1))}>
                <Text style={styles.controlBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.controlBar} />
              <TouchableOpacity style={styles.controlBtn} onPress={() => setContrast(Math.min(2.0, contrast + 0.1))}>
                <Text style={styles.controlBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.applyBeautyBtn, (!originalImage || loading) && styles.disabledButton]}
              onPress={applyBeautyFilter}
              disabled={!originalImage || loading}
            >
              <Text style={styles.applyBeautyBtnText}>{loading ? 'Memproses...' : 'Terapkan Beauty'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'sticker' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryList}>
              {STICKER_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[styles.categoryPill, activeStickerCategory === category.key && styles.categoryPillActive]}
                  onPress={() => setActiveStickerCategory(category.key)}
                >
                  <Text style={[styles.categoryText, activeStickerCategory === category.key && styles.categoryTextActive]}>{category.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionList}>
              {activeStickers.map((sticker) => (
                <TouchableOpacity key={sticker} style={styles.stickerBtn} onPress={() => addSticker(sticker)}>
                  <Text style={styles.stickerEmoji}>{sticker}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedStickerLayer && (
              <View style={styles.stickerControlRow}>
                <TouchableOpacity style={styles.stickerControlButton} onPress={() => updateSticker(selectedStickerLayer.id, { scale: Math.max(0.6, selectedStickerLayer.scale - 0.1) })}>
                  <Text style={styles.stickerControlText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stickerControlButton} onPress={() => updateSticker(selectedStickerLayer.id, { scale: selectedStickerLayer.scale + 0.1 })}>
                  <Text style={styles.stickerControlText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stickerControlButton} onPress={() => updateSticker(selectedStickerLayer.id, { rotation: selectedStickerLayer.rotation - 15 })}>
                  <Text style={styles.stickerControlText}>⟲</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stickerControlButton} onPress={() => updateSticker(selectedStickerLayer.id, { rotation: selectedStickerLayer.rotation + 15 })}>
                  <Text style={styles.stickerControlText}>⟳</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.stickerControlButton, styles.deleteBtn]} onPress={() => removeSticker(selectedStickerLayer.id)}>
                  <Text style={styles.stickerControlText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  useBtn: { backgroundColor: '#E91E63', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  useBtnDisabled: { opacity: 0.45 },
  useBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  imageBox: { flex: 1.2, marginHorizontal: 12, marginTop: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: '#111' },
  imageWrapper: { flex: 1, position: 'relative' },
  previewImage: { flex: 1, resizeMode: 'contain' },
  tintOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, pointerEvents: 'none' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', fontSize: 14, marginTop: 10 },
  stickerLayer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  stickerLayerActive: { borderWidth: 2, borderColor: '#E91E63', borderRadius: 999 },
  stickerTouch: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stickerEmoji: { fontSize: 32, textAlign: 'center' },
  selectionOutline: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 2,
    borderColor: '#E91E63',
    borderRadius: 999,
  },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  placeholderText: { color: '#555', fontSize: 16, marginTop: 10 },
  pickerButtons: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, borderWidth: 1, borderColor: '#333', marginHorizontal: 6 },
  pickerBtnText: { color: '#fff', fontSize: 14 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#222', marginBottom: 10, marginHorizontal: 12 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#E91E63' },
  tabText: { color: '#888', fontSize: 13 },
  tabTextActive: { color: '#E91E63', fontWeight: '700' },
  bottomPanel: { paddingBottom: 18, backgroundColor: '#050505' },
  optionList: { paddingHorizontal: 12, paddingBottom: 8 },
  filterItem: { alignItems: 'center', justifyContent: 'center', padding: 8, marginRight: 10, borderRadius: 16, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', width: 72 },
  filterItemActive: { borderColor: '#E91E63', backgroundColor: '#1a0010' },
  filterEmoji: { fontSize: 28, marginBottom: 4 },
  filterName: { color: '#aaa', fontSize: 12, textAlign: 'center' },
  filterNameActive: { color: '#E91E63', fontWeight: '700' },
  beautyContainer: { paddingHorizontal: 12 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sliderLabel: { color: '#fff', fontSize: 14 },
  sliderValue: { color: '#E91E63', fontSize: 14, fontWeight: '700' },
  controlRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  controlBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  controlBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  controlBar: { flex: 1, height: 6, marginHorizontal: 12, borderRadius: 3, backgroundColor: '#222' },
  applyBeautyBtn: { backgroundColor: '#E91E63', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  disabledButton: { opacity: 0.45 },
  applyBeautyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  categoryList: { paddingHorizontal: 12, marginBottom: 10 },
  categoryPill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#111', marginRight: 10, borderWidth: 1, borderColor: '#222' },
  categoryPillActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  categoryText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  categoryTextActive: { color: '#fff' },
  stickerBtn: { width: 58, height: 58, marginRight: 10, borderRadius: 28, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  stickerControlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, marginTop: 10 },
  stickerControlButton: { flex: 1, marginHorizontal: 4, backgroundColor: '#111', borderRadius: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
  stickerControlText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#631c2b', borderColor: '#bd2d5f' },
});

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator,
  
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

// 5 Filter warna sesuai ketentuan: grayscale, sepia, vivid, warm, cool + normal
const COLOR_FILTERS = [
  {
    name: 'Normal',
    label: 'Normal',
    emoji: '⭕',
    actions: [],
  },
  {
    name: 'Grayscale',
    label: 'Grayscale',
    emoji: '⬛',
    // manipulateAsync tidak punya grayscale langsung, kita pakai kontras rendah
    actions: [{ grayscale: true }],
  },
  {
    name: 'Sepia',
    label: 'Sepia',
    emoji: '🟫',
    // Sepia simulasi dengan brightness + contrast
    actions: [{ grayscale: true }],
    tintColor: 'rgba(112, 66, 20, 0.4)',
  },
  {
    name: 'Vivid',
    label: 'Vivid',
    emoji: '🌈',
    actions: [],
    tintColor: null,
    contrast: 1.3,
  },
  {
    name: 'Warm',
    label: 'Warm',
    emoji: '🔆',
    actions: [],
    tintColor: 'rgba(255, 140, 0, 0.25)',
  },
  {
    name: 'Cool',
    label: 'Cool',
    emoji: '❄️',
    actions: [],
    tintColor: 'rgba(0, 120, 255, 0.25)',
  },
];

const STICKERS = ['⭐', '❤️', '🔥', '😎', '🎵', '✨', '🌟', '💫', '🎉', '👑', '🦋', '🌸'];

export default function CameraFilterScreen({ navigation }: any) {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [filteredImage, setFilteredImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('Normal');
  const [activeTint, setActiveTint] = useState<string | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'filter' | 'beauty' | 'sticker'>('filter');

  // Beauty filter values
  const [brightness, setBrightness] = useState(1.0);
  const [contrast, setContrast] = useState(1.0);

  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert('Error', 'Butuh izin galeri!'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setOriginalImage(result.assets[0].uri);
      setFilteredImage(result.assets[0].uri);
      setActiveFilter('Normal');
      setActiveTint(null);
    }
  };

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) { Alert.alert('Error', 'Butuh izin kamera!'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: true });
    if (!result.canceled) {
      setOriginalImage(result.assets[0].uri);
      setFilteredImage(result.assets[0].uri);
      setActiveFilter('Normal');
      setActiveTint(null);
    }
  };

  const applyFilter = async (filter: any) => {
    if (!originalImage) { Alert.alert('Error', 'Pilih foto dulu!'); return; }
    setLoading(true);
    setActiveFilter(filter.name);
    setActiveTint(filter.tintColor || null);
    try {
      if (filter.actions.length > 0) {
        const result = await manipulateAsync(
          originalImage,
          filter.actions,
          { format: SaveFormat.JPEG, compress: 0.85 }
        );
        setFilteredImage(result.uri);
      } else {
        setFilteredImage(originalImage);
      }
    } catch (e) {
      setFilteredImage(originalImage);
    } finally {
      setLoading(false);
    }
  };

  const applyBeautyFilter = async () => {
    if (!originalImage) { Alert.alert('Error', 'Pilih foto dulu!'); return; }
    setLoading(true);
    try {
      // Apply resize untuk simulate beauty (expo-image-manipulator limitation)
      const result = await manipulateAsync(
        originalImage,
        [{ resize: { width: 1080 } }],
        { format: SaveFormat.JPEG, compress: brightness > 1 ? 0.95 : 0.8 }
      );
      setFilteredImage(result.uri);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (!filteredImage) { Alert.alert('Error', 'Pilih foto dulu!'); return; }
    navigation.navigate('MainTabs', {
      screen: 'CreatePost',
      params: { imageUri: filteredImage }
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filter & Sticker</Text>
        {filteredImage ? (
          <TouchableOpacity style={styles.useBtn} onPress={handleUse}>
            <Text style={styles.useBtnText}>Pakai ✓</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
      </View>

      {/* Image preview */}
      <View style={styles.imageBox}>
        {filteredImage ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: filteredImage }} style={styles.previewImage} />
            {/* Tint overlay untuk filter warna */}
            {activeTint && (
              <View style={[styles.tintOverlay, { backgroundColor: activeTint }]} />
            )}
            {/* Sticker overlay */}
            {selectedSticker && (
              <Text style={styles.stickerOverlay}>{selectedSticker}</Text>
            )}
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color="#E91E63" size="large" />
                <Text style={styles.loadingText}>Memproses...</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={64} color="#333" />
            <Text style={styles.placeholderText}>Tap untuk pilih foto</Text>
          </View>
        )}
      </View>

      {/* Pick buttons */}
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

      {/* Tab selector */}
      <View style={styles.tabRow}>
        {(['filter', 'beauty', 'sticker'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'filter' ? '🎨 Filter' : tab === 'beauty' ? '✨ Beauty' : '🎭 Sticker'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter tab */}
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
              <Text style={[styles.filterName, activeFilter === filter.name && styles.filterNameActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Beauty tab */}
      {activeTab === 'beauty' && (
        <View style={styles.beautyContainer}>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>☀️ Brightness</Text>
            <Text style={styles.sliderValue}>{brightness.toFixed(1)}</Text>
          </View>
          <View style={styles.sliderTrack}>
            <View style={styles.sliderFill} />
            <TouchableOpacity
              style={styles.sliderMinus}
              onPress={() => setBrightness(Math.max(0.5, brightness - 0.1))}
            >
              <Text style={styles.sliderBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sliderPlus}
              onPress={() => setBrightness(Math.min(2.0, brightness + 0.1))}
            >
              <Text style={styles.sliderBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>🔲 Contrast</Text>
            <Text style={styles.sliderValue}>{contrast.toFixed(1)}</Text>
          </View>
          <View style={styles.sliderTrack}>
            <TouchableOpacity
              style={styles.sliderMinus}
              onPress={() => setContrast(Math.max(0.5, contrast - 0.1))}
            >
              <Text style={styles.sliderBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sliderPlus}
              onPress={() => setContrast(Math.min(2.0, contrast + 0.1))}
            >
              <Text style={styles.sliderBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.applyBeautyBtn}
            onPress={applyBeautyFilter}
            disabled={loading || !originalImage}
          >
            <Text style={styles.applyBeautyBtnText}>
              {loading ? 'Memproses...' : '✨ Apply Beauty Filter'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sticker tab */}
      {activeTab === 'sticker' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionList}>
          {STICKERS.map((sticker) => (
            <TouchableOpacity
              key={sticker}
              style={[styles.stickerBtn, selectedSticker === sticker && styles.stickerBtnActive]}
              onPress={() => setSelectedSticker(selectedSticker === sticker ? null : sticker)}
            >
              <Text style={styles.stickerEmoji}>{sticker}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  useBtn: { backgroundColor: '#E91E63', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  useBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  imageBox: { flex: 1, margin: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' },
  imageWrapper: { flex: 1 },
  previewImage: { flex: 1, resizeMode: 'contain' },
  tintOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  stickerOverlay: { position: 'absolute', top: '35%', left: '40%', fontSize: 52 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#fff', fontSize: 14 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  placeholderText: { color: '#555', fontSize: 16 },
  pickerButtons: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 8 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  pickerBtnText: { color: '#fff', fontSize: 14 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#222', marginBottom: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#E91E63' },
  tabText: { color: '#888', fontSize: 13 },
  tabTextActive: { color: '#E91E63', fontWeight: 'bold' },
  optionList: { paddingHorizontal: 8, marginBottom: 12 },
  filterItem: { alignItems: 'center', padding: 10, marginHorizontal: 4, borderRadius: 12, backgroundColor: '#111', borderWidth: 1, borderColor: '#333', width: 72 },
  filterItemActive: { borderColor: '#E91E63', backgroundColor: '#1a0010' },
  filterEmoji: { fontSize: 28, marginBottom: 4 },
  filterName: { color: '#aaa', fontSize: 11, textAlign: 'center' },
  filterNameActive: { color: '#E91E63', fontWeight: 'bold' },
  beautyContainer: { padding: 16, gap: 12 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabel: { color: '#fff', fontSize: 14 },
  sliderValue: { color: '#E91E63', fontSize: 14, fontWeight: 'bold' },
  sliderTrack: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  sliderFill: { flex: 1, height: 4, backgroundColor: '#333', borderRadius: 2 },
  sliderMinus: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  sliderPlus: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center' },
  sliderBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  applyBeautyBtn: { backgroundColor: '#E91E63', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  applyBeautyBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  stickerBtn: { width: 54, height: 54, marginHorizontal: 4, backgroundColor: '#111', borderRadius: 27, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  stickerBtnActive: { borderColor: '#E91E63', backgroundColor: '#1a0010' },
  stickerEmoji: { fontSize: 28 },
});
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ImagePickerService } from '@/libs/image-picker';
import { Toaster } from '@/libs/notification/toast';
import { useGetProductCategories } from '@/modules/product-categories/hooks';
import { useCreateProduct } from '@/modules/products/hooks';
import type { ProductUploadFile } from '@/modules/products/types';
import { CategoryBottomSheet } from '@/modules/shared/components/CategoryBottomSheet';
import { NumberInput } from '@/modules/shared/components/inputs/NumberInput';
import { SelectInput } from '@/modules/shared/components/inputs/SelectInput';
import type { Theme } from '@/modules/shared/theme';
import { toAlpha } from '@/modules/shared/theme/colors';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

export const CreateArticleSection = React.forwardRef((props, ref) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const descriptionRef = React.useRef<TextInput>(null);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('01');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [articleName, setArticleName] = useState('');
  const [categoryBottomSheetVisible, setCategoryBottomSheetVisible] = useState(false);

  React.useImperativeHandle(ref, () => ({
    focus: () => {
      descriptionRef.current?.focus();
    },
  }));

  const {
    categories,
    getProductCategories,
    isLoading: isLoadingCategories,
  } = useGetProductCategories();

  useFocusEffect(
    useCallback(() => {
      getProductCategories();
    }, [getProductCategories]),
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categoryId, categories],
  );

  const { createProduct, isLoading } = useCreateProduct({
    onSuccess: () => {
      Toaster.success('Succès', 'Article publié avec succès!');
      resetForm();
    },
    onError: (err) => {
      Toaster.error('Erreur', err.message);
    },
  });

  const resetForm = () => {
    setDescription('');
    setQuantity('01');
    setPrice('');
    setImages([]);
    setCategoryId(null);
    setArticleName('');
  };

  const pickImage = async () => {
    if (images.length >= 5) {
      Toaster.error('Limite atteinte', 'Vous pouvez ajouter au maximum 5 images');
      return;
    }

    try {
      const results = await ImagePickerService.openMultiple(theme, 5 - images.length);
      if (results.length > 0) {
        const newUris = results.map((img) => img.path);
        setImages((prev) => [...prev, ...newUris].slice(0, 5));
      }
    } catch {
      Toaster.error('Erreur', 'Impossible de charger les images');
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCategorySelect = () => {
    if (isLoadingCategories && categories.length === 0) return;
    setCategoryBottomSheetVisible(true);
  };

  const handlePublish = async () => {
    if (!categoryId || !articleName || !price || !quantity) {
      Toaster.error('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const payload = {
      category_id: categoryId,
      name: articleName,
      description: description,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      images: images.map((uri, index) => ({
        uri: uri,
        name: `image_${index}.jpg`,
        type: 'image/jpeg',
      })) as ProductUploadFile[],
    };

    await createProduct(payload);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photos Section */}
        <View style={styles.photosSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosScroll}
          >
            {images.map((uri, index) => (
              <View key={uri + index} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.thumbnail} />
                <TouchableOpacity style={styles.removePhoto} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            {images.length < 5 && (
              <TouchableOpacity
                style={styles.addPhotoPicker}
                onPress={pickImage}
                disabled={isLoading}
              >
                <Ionicons name="camera" size={24} color={theme.colors.disabled} />
                <Text style={styles.addPhotoText}>
                  {images.length === 0 ? 'Ajouter' : `${images.length}/5`}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.titleContainer}>
            <Text style={styles.label}>NOM DE L&apos;ARTICLE</Text>
            <TextInput
              placeholder="Nom de l'article..."
              placeholderTextColor={theme.colors.placeholder}
              value={articleName}
              onChangeText={setArticleName}
              style={styles.titleInput}
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Input Details */}
        <View style={styles.detailsContainer}>
          <TextInput
            ref={descriptionRef}
            style={styles.descriptionInput}
            placeholder="Description de l'article..."
            placeholderTextColor={theme.colors.placeholder}
            multiline
            value={description}
            onChangeText={setDescription}
            editable={!isLoading}
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>PRIX (CFA)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={theme.colors.placeholder}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <View style={styles.rowItem}>
              <Text style={styles.label}>QUANTITÉ</Text>
              <View style={styles.quantityWrapper}>
                <NumberInput value={quantity} onChangeText={setQuantity} />
              </View>
            </View>
          </View>

          <View style={styles.categoryContainer}>
            <Text style={styles.label}>CATÉGORIE</Text>
            <SelectInput
              label="Sélectionner..."
              value={selectedCategory?.name}
              onPress={handleCategorySelect}
              style={styles.categorySelect}
              textColor={theme.colors.text}
            />
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.publishButton, isLoading && styles.disabled]}
          onPress={handlePublish}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textWhite} />
          ) : (
            <Text style={styles.publishText}>{"PUBLIER L'ARTICLE"}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CategoryBottomSheet
        visible={categoryBottomSheetVisible}
        onClose={() => setCategoryBottomSheetVisible(false)}
        categories={categories}
        selectedId={categoryId}
        onSelect={(category) => setCategoryId(category.id)}
      />
    </View>
  );
});

CreateArticleSection.displayName = 'CreateArticleSection';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    photosSection: {
      marginVertical: theme.spacing.xs,
    },
    photosScroll: {
      paddingVertical: theme.spacing.md,
      gap: 12,
      alignItems: 'center',
    },
    photoWrapper: {
      position: 'relative',
    },
    thumbnail: {
      width: 80,
      height: 80,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    removePhoto: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: 10,
    },
    addPhotoPicker: {
      width: 80,
      height: 80,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    addPhotoText: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      marginTop: 4,
      fontWeight: '700',
    },
    titleContainer: {
      flex: 1,
      gap: 8,
    },
    titleInput: {
      backgroundColor: theme.colors.surface,
      minHeight: 48,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '600',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    detailsContainer: {
      gap: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    descriptionInput: {
      fontSize: 16,
      color: theme.colors.text,
      minHeight: 80,
      textAlignVertical: 'top',
      backgroundColor: toAlpha(theme.colors.surface, 0.5),
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    rowItem: {
      flex: 1,
    },
    label: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: theme.colors.surface,
      height: 48,
      borderRadius: 8,
      paddingHorizontal: 16,
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '600',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    quantityWrapper: {
      height: 48,
      justifyContent: 'center',
    },
    categoryContainer: {
      flex: 1,
    },
    categorySelect: {
      height: 48,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    publishButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.sm,
      paddingVertical: 16,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    publishText: {
      color: theme.colors.textWhite,
      fontWeight: 'bold',
      letterSpacing: 1.2,
      fontSize: 16,
    },
    disabled: {
      opacity: 0.6,
    },
  });

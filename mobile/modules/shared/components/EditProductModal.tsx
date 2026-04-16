import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { ImagePickerService } from '@/libs/image-picker';
import { Toaster } from '@/libs/notification/toast';
import { useGetProductCategories } from '@/modules/product-categories/hooks';
import { useUpdateProduct } from '@/modules/products/hooks';
import type { ProductUploadFile } from '@/modules/products/types';
import { SellerProductResource } from '@/modules/products/types';
import { CategoryBottomSheet } from '@/modules/shared/components/CategoryBottomSheet';
import { NumberInput } from '@/modules/shared/components/inputs/NumberInput';
import { SelectInput } from '@/modules/shared/components/inputs/SelectInput';
import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface EditProductModalProps {
  visible: boolean;
  onClose: () => void;
  product: SellerProductResource | null;
  onSuccess: () => void;
}

export const EditProductModal = ({
  visible,
  onClose,
  product,
  onSuccess,
}: EditProductModalProps) => {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('01');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [articleName, setArticleName] = useState('');
  const [categoryBottomSheetVisible, setCategoryBottomSheetVisible] = useState(false);

  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const {
    categories,
    getProductCategories,
    isLoading: isLoadingCategories,
  } = useGetProductCategories();

  useEffect(() => {
    if (visible) {
      getProductCategories();
    }
  }, [visible, getProductCategories]);

  useEffect(() => {
    if (product) {
      setDescription(product.description || '');
      setQuantity(product.quantity.toString().padStart(2, '0'));
      setPrice(product.price.toString());
      setImages(
        product.images && product.images.length > 0
          ? product.images
          : product.image_url
            ? [product.image_url]
            : [],
      );
      setCategoryId(product.category?.id || null);
      setArticleName(product.name);
    }
  }, [product]);

  const { updateProduct, isLoading } = useUpdateProduct({
    onSuccess: () => {
      Toaster.success('Succès', 'Article modifié avec succès');
      onSuccess();
      onClose();
    },
    onError: (err) => Toaster.error('Erreur', err.message),
  });

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categoryId, categories],
  );

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

  const handleUpdate = async () => {
    if (!product) return;
    if (!categoryId || !articleName || !price || !quantity) {
      Toaster.error('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const payload = {
      id: product.id,
      category_id: categoryId,
      name: articleName,
      description: description,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      existing_images: images.filter((uri) => uri.startsWith('http')),
      images: images
        .filter((uri) => !uri.startsWith('http'))
        .map((uri, index) => ({
          uri: uri,
          name: `image_${Date.now()}_${index}.jpg`,
          type: 'image/jpeg',
        })) as ProductUploadFile[],
    };

    await updateProduct(payload);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.modalContent}
          keyboardVerticalOffset={0}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{`MODIFIER LE PRODUIT`}</Text>
            <TouchableOpacity onPress={onClose} disabled={isLoading}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
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
                    <Ionicons name="camera" size={24} color={theme.colors.textSecondary} />
                    <Text style={styles.addPhotoText}>
                      {images.length === 0 ? 'Ajouter' : `${images.length}/5`}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>

              <View style={styles.titleContainer}>
                <TextInput
                  placeholder="Nom de l'article"
                  placeholderTextColor={theme.colors.placeholder}
                  value={articleName}
                  onChangeText={setArticleName}
                  style={styles.titleInput}
                  editable={!isLoading}
                />
                <View style={styles.titleBar} />
              </View>
            </View>

            {/* Input Details */}
            <View style={styles.detailsContainer}>
              <Text style={styles.label}>DESCRIPTION</Text>
              <TextInput
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
                    editable={!isLoading}
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

            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.disabled]}
              onPress={handleUpdate}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>{'ENREGISTRER'}</Text>
              )}
            </TouchableOpacity>

            {/* Visual padding at bottom */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <CategoryBottomSheet
        visible={categoryBottomSheetVisible}
        onClose={() => setCategoryBottomSheetVisible(false)}
        categories={categories}
        selectedId={categoryId}
        onSelect={(category) => setCategoryId(category.id)}
      />
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '92%',
      paddingTop: 12,
      paddingHorizontal: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: theme.colors.text,
      letterSpacing: 0.5,
    },
    form: {
      flex: 1,
    },
    photosSection: {
      marginBottom: theme.spacing.md,
    },
    photosScroll: {
      paddingVertical: theme.spacing.sm,
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
      backgroundColor: theme.colors.background,
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
      marginTop: theme.spacing.sm,
    },
    titleInput: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.colors.text,
      paddingVertical: 4,
    },
    titleBar: {
      height: 3,
      backgroundColor: theme.colors.accent,
      width: 60,
      borderRadius: 1.5,
    },
    detailsContainer: {
      gap: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    label: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    descriptionInput: {
      fontSize: theme.fontSize.base,
      color: theme.colors.text,
      minHeight: 80,
      textAlignVertical: 'top',
      backgroundColor: theme.colors.surface,
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
    input: {
      backgroundColor: theme.colors.surface,
      height: 48,
      borderRadius: 8,
      paddingHorizontal: 16,
      fontSize: theme.fontSize.base,
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
    saveButton: {
      backgroundColor: theme.colors.accent,
      height: 56,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      marginTop: 10,
    },
    saveText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
      letterSpacing: 1.2,
    },
    bottomSpacer: {
      height: 40,
    },
    disabled: {
      opacity: 0.6,
    },
  });

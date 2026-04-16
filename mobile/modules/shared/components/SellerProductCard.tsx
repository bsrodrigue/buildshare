import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SellerProductResource } from '@/modules/products/types';
import type { Theme } from '@/modules/shared/theme';
import { toAlpha } from '@/modules/shared/theme/colors';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface SellerProductCardProps {
  product: SellerProductResource;
  onMenuPress?: () => void;
  onViewOrdersPress?: () => void;
}

export const SellerProductCard = ({
  product,
  onMenuPress,
  onViewOrdersPress,
}: SellerProductCardProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const CARD_WIDTH = SCREEN_WIDTH - theme.spacing.md * 2;
  const IMAGE_WIDTH = CARD_WIDTH * 0.48;
  const snapInterval = IMAGE_WIDTH + 8;
  const productImages = useMemo(() => {
    const images = product.images || (product.image_url ? [product.image_url] : []);
    return images.filter((uri) => uri && typeof uri === 'string' && uri.length > 0);
  }, [product.images, product.image_url]);
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvrez cet article: ${product.name}!`,
        url: product.image_url,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const statusConfig = {
    inactive: {
      label: 'EN ATTENTE DE VALIDATION',
      color: '#92400e',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
    },
    out_of_stock: {
      label: 'RUPTURE DE STOCK',
      color: '#991b1b',
      bg: 'rgba(220, 38, 38, 0.1)',
      border: 'rgba(220, 38, 38, 0.25)',
    },
  } as const;

  const statusInfo = product.status !== 'active' ? statusConfig[product.status] : null;

  return (
    <View style={styles.container}>
      {/* Status Banner */}
      {statusInfo && (
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: statusInfo.bg, borderColor: statusInfo.border },
          ]}
        >
          <Ionicons
            name={product.status === 'out_of_stock' ? 'alert-circle-outline' : 'hourglass-outline'}
            size={16}
            color={statusInfo.color}
          />
          <Text style={[styles.statusBannerText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      )}

      {/* Header with Product Name and Menu */}
      <View style={styles.header}>
        <Text style={styles.productName}>{product.name}</Text>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.disabled} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {product.description ? <Text style={styles.description}>{product.description}</Text> : null}

        {/* Product Images Carousel */}
        <View style={styles.carouselContainer}>
          {productImages.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={snapInterval}
              contentContainerStyle={styles.carouselContent}
            >
              {productImages.map((uri: string, index: number) => (
                <View key={uri + index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.mainImage} resizeMode="cover" />
                  {productImages.length > 1 && (
                    <View style={styles.imageIndicator}>
                      <Text style={styles.indicatorText}>
                        {index + 1}/{productImages.length}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noImagePlaceholder}>
              <Ionicons name="image-outline" size={40} color={theme.colors.disabled} />
              <Text style={styles.noImageText}>Aucun média disponible</Text>
            </View>
          )}
        </View>

        {/* Product Info Row */}
        <View style={styles.infoRow}>
          <Text style={styles.priceText}>{product.price.toLocaleString()} CFA</Text>
          <View style={[styles.stockBadge, product.quantity <= 5 && styles.lowStockBadge]}>
            <Ionicons
              name="cube-outline"
              size={14}
              color={product.quantity <= 5 ? theme.colors.error : theme.colors.textSecondary}
            />
            <Text style={[styles.stockText, product.quantity <= 5 && styles.lowStockText]}>
              Stock: {product.quantity}
            </Text>
          </View>
        </View>

        {/* Interaction & Stats Footer */}
        <View style={styles.footer}>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.viewOrdersButton} onPress={onViewOrdersPress}>
              <Text style={styles.viewOrdersText}>VOIR COMMANDE</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) => {
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const CARD_WIDTH = SCREEN_WIDTH - theme.spacing.md * 2;
  const IMAGE_WIDTH = CARD_WIDTH * 0.48;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: theme.spacing.sm,
    },
    statusBannerText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    productName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.text,
      textTransform: 'uppercase',
      flex: 1,
    },
    menuButton: {
      padding: 4,
    },
    contentContainer: {
      marginTop: 0,
    },
    description: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      lineHeight: 18,
    },
    carouselContainer: {
      width: '100%',
      backgroundColor: theme.colors.transparent,
      marginBottom: theme.spacing.md,
    },
    imageWrapper: {
      width: IMAGE_WIDTH,
      aspectRatio: 1,
      position: 'relative',
      marginRight: 8,
      borderRadius: theme.borderRadius.sm,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    carouselContent: {
      paddingRight: 40,
    },
    mainImage: {
      width: '100%',
      height: '100%',
    },
    imageIndicator: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: toAlpha(theme.colors.overlay, 0.6),
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    indicatorText: {
      color: theme.colors.textOnPrimary,
      fontSize: 10,
      fontWeight: 'bold',
    },
    noImagePlaceholder: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    noImageText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    priceText: {
      fontSize: 18,
      fontWeight: '900',
      color: theme.colors.text,
    },
    stockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    lowStockBadge: {
      backgroundColor: toAlpha(theme.colors.error, 0.1),
      borderColor: toAlpha(theme.colors.error, 0.2),
    },
    stockText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    lowStockText: {
      color: theme.colors.error,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      flex: 1,
    },
    viewOrdersButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: theme.borderRadius.sm,
      flex: 1,
      alignItems: 'center',
    },
    viewOrdersText: {
      color: theme.colors.textWhite,
      fontSize: 12,
      fontWeight: 'bold',
    },
    shareButton: {
      padding: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.surface,
    },
  });
};

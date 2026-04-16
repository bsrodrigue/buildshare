import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button } from '@/modules/shared/components/inputs/Button';
import { DatePicker } from '@/modules/shared/components/inputs/DatePicker';
import { Input } from '@/modules/shared/components/inputs/Input';
import { LocationDetecterButton } from '@/modules/shared/components/inputs/LocationDetecterButton';
import { PhoneInput } from '@/modules/shared/components/inputs/PhoneInput';
import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';
import {
  MapPickedLocation,
  MapPickerModal as MapPicker,
} from '@/modules/shops/components/MapPickerModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

const profileSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis').max(100, 'Maximum 100 caractères'),
  last_name: z.string().min(1, 'Nom requis').max(100, 'Maximum 100 caractères'),
  email: z.email('Adresse email invalide'),
  date_of_birth: z.date({
    message: 'Date de naissance requise',
  }),
  shop_name: z.string().max(255, 'Maximum 255 caractères').optional().nullable(),
  shop_description: z.string().max(1000, 'Maximum 1000 caractères').optional().nullable(),
  shop_phone: z.string().optional().nullable(),
  shop_email: z.email('Email boutique invalide').optional().nullable().or(z.literal('')),
  shop_address: z.string().optional().nullable(),
  shop_latitude: z.number().optional().nullable(),
  shop_longitude: z.number().optional().nullable(),
});

export type EditProfileFormData = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  isSeller: boolean;
  initialValues: EditProfileFormData;
  onSave: (data: EditProfileFormData) => Promise<void>;
  isLoading: boolean;
}

export const EditProfileModal = ({
  visible,
  onClose,
  isSeller,
  initialValues,
  onSave,
  isLoading,
}: EditProfileModalProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues,
  });

  React.useEffect(() => {
    if (visible) {
      reset(initialValues);
    }
  }, [visible, initialValues, reset]);

  const onSubmit = (data: EditProfileFormData) => {
    onSave(data);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={0}
          style={styles.keyboardAvoidingContainer}
        >
          <View style={styles.sheetContent}>
            <SafeAreaView edges={['bottom']} style={styles.safeArea}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Modifier le profil</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.closeButton}>Annuler</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.modalForm}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                overScrollMode="never"
              >
                <Controller
                  control={control}
                  name="first_name"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Prénom"
                      placeholder="Entrez votre prénom"
                      value={value}
                      onChangeText={onChange}
                      error={errors.first_name?.message}
                      disabled={isLoading}
                    />
                  )}
                />

                {isSeller && (
                  <>
                    <Controller
                      control={control}
                      name="shop_name"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label="Nom de la boutique"
                          placeholder="Entrez le nom de votre boutique"
                          value={value || ''}
                          onChangeText={onChange}
                          error={errors.shop_name?.message}
                          disabled={isLoading}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="shop_description"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label="Description de la boutique"
                          placeholder="Que vendez-vous ?"
                          value={value || ''}
                          multiline
                          numberOfLines={3}
                          maxLength={255}
                          onChangeText={onChange}
                          error={errors.shop_description?.message}
                          disabled={isLoading}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="shop_phone"
                      render={({ field: { onChange, value } }) => (
                        <PhoneInput
                          label="Téléphone de la boutique"
                          countryCode="+226"
                          phoneNumber={value || ''}
                          onChangePhoneNumber={onChange}
                          error={errors.shop_phone?.message}
                          disabled={isLoading}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="shop_email"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label="Email de la boutique"
                          placeholder="Email professionnel"
                          value={value || ''}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          onChangeText={onChange}
                          error={errors.shop_email?.message}
                          disabled={isLoading}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="shop_address"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label="Adresse de la boutique"
                          placeholder="Ville, Quartier, Rue..."
                          value={value || ''}
                          onChangeText={onChange}
                          error={errors.shop_address?.message}
                          disabled={isLoading}
                        />
                      )}
                    />
                    <View style={styles.gpsLabelWrapper}>
                      <Text style={styles.gpsLabel}>LOCALISATION DE LA BOUTIQUE</Text>
                      <Controller
                        control={control}
                        name="shop_latitude"
                        render={({ field: { value: lat } }) => (
                          <Controller
                            control={control}
                            name="shop_longitude"
                            render={({ field: { value: lng } }) => (
                              <View style={styles.gpsContainer}>
                                <Ionicons
                                  name="location"
                                  size={18}
                                  color={
                                    lat && lng ? theme.colors.accent : theme.colors.textSecondary
                                  }
                                />
                                <Text
                                  style={[
                                    styles.gpsCoordText,
                                    !(lat && lng) && { color: theme.colors.textSecondary },
                                  ]}
                                >
                                  {lat && lng && (lat !== 0 || lng !== 0)
                                    ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                                    : 'Non définie'}
                                </Text>
                              </View>
                            )}
                          />
                        )}
                      />

                      <View style={styles.gpsActions}>
                        <TouchableOpacity
                          style={styles.gpsActionButton}
                          onPress={() => setShowMapPicker(true)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="map-outline" size={18} color={theme.colors.accent} />
                          <Text style={styles.gpsActionText}>Choisir sur la carte</Text>
                        </TouchableOpacity>

                        <LocationDetecterButton
                          onLocationDetected={(lat, lng) => {
                            setValue('shop_latitude', lat);
                            setValue('shop_longitude', lng);
                          }}
                        />
                      </View>
                    </View>
                  </>
                )}
                <Controller
                  control={control}
                  name="last_name"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Nom"
                      placeholder="Entrez votre nom"
                      value={value}
                      onChangeText={onChange}
                      error={errors.last_name?.message}
                      disabled={isLoading}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Email"
                      placeholder="Entrez votre email"
                      value={value}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onChangeText={onChange}
                      error={errors.email?.message}
                      disabled={isLoading}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="date_of_birth"
                  render={({ field: { onChange, value } }) => (
                    <DatePicker
                      label="Date de naissance"
                      value={value}
                      onChange={onChange}
                      error={errors.date_of_birth?.message}
                      disabled={isLoading}
                    />
                  )}
                />

                <Button
                  title="Enregistrer"
                  onPress={handleSubmit(onSubmit)}
                  isLoading={isLoading}
                  style={styles.saveButton}
                />
              </ScrollView>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </View>

      <MapPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={(location: MapPickedLocation) => {
          setValue('shop_latitude', location.latitude);
          setValue('shop_longitude', location.longitude);
          if (location.address) {
            setValue('shop_address', location.address);
          }
          setShowMapPicker(false);
        }}
      />
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    keyboardAvoidingContainer: {
      width: '100%',
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: MODAL_MAX_HEIGHT,
      ...(theme.colorScheme === 'light' ? { backgroundColor: '#fff' } : {}),
    },
    sheetContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
    },
    safeArea: {
      flexShrink: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    modalTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.base,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    closeButton: {
      color: theme.colors.accent,
      fontSize: theme.fontSize.sm,
      fontWeight: '600',
    },
    modalForm: {
      paddingBottom: 40,
    },
    saveButton: {
      width: '100%',
      marginTop: theme.spacing.lg,
    },
    gpsLabelWrapper: {
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    gpsLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      opacity: 0.6,
    },
    gpsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.cardBackground,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    gpsCoordText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.text,
      fontWeight: '600',
    },
    gpsActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    gpsActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: theme.colors.cardBackground,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    gpsActionText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.text,
      fontWeight: '600',
    },
  });

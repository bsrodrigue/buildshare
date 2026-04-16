import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { COUNTRY_CODE } from '@/constants';
import { useFilePicker } from '@/hooks/useFileUpload';
import { AppConfiguration } from '@/libs/app-config';
import { Filesystem } from '@/libs/fs';
import { PasswordInput } from '@/modules/auth/components/inputs/PasswordInput';
import { useRegister } from '@/modules/auth/api/hooks';
import { Button } from '@/modules/shared/components/inputs/Button';
import { Checkbox } from '@/modules/shared/components/inputs/Checkbox';
import { DatePicker } from '@/modules/shared/components/inputs/DatePicker';
import { FileUploadButton } from '@/modules/shared/components/inputs/FileUploadButton';
import { Input } from '@/modules/shared/components/inputs/Input';
import { PhoneInput } from '@/modules/shared/components/inputs/PhoneInput';
import { RolePicker } from '@/modules/shared/components/inputs/RolePicker';
import { VehicleTypePicker } from '@/modules/shared/components/inputs/VehicleTypePicker';
import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

import { RegisterParams, UserRole } from '../api/schemas';

export const AllowedRegistrationRoles = [
  'client',
  'delivery_man',
  'seller',
] as const satisfies readonly UserRole[];
export const AllowedRegistrationRolesSchema = z.enum(AllowedRegistrationRoles);

export type AllowedRegistrationRole = z.infer<typeof AllowedRegistrationRolesSchema>;

const registerSchema = z
  .object({
    // Common fields (required)
    firstName: z.string().min(1, 'Prénom requis').max(100, 'Maximum 100 caractères'),
    lastName: z.string().min(1, 'Nom requis').max(100, 'Maximum 100 caractères'),
    birthDate: z.date(),
    email: z.email('Adresse email invalide'),
    role: AllowedRegistrationRolesSchema,
    password: z.string().min(6, 'Minimum 6 caractères'),
    passwordConfirmation: z.string().min(6, 'Minimum 6 caractères'),
    phoneNumber: z.string().min(1, 'Numéro de téléphone requis'),

    // Optional common field
    promoCode: z.string().max(50, 'Maximum 50 caractères').optional().nullable(),

    // Seller fields
    shopName: z.string().max(255, 'Maximum 255 caractères').optional().nullable(),
    cnibRecto: z.string().optional().nullable(),
    cnibVerso: z.string().optional().nullable(),
    businessRegister: z.string().optional().nullable(),

    // Delivery man fields
    vehicle_type: z.enum(['moto', 'velo', 'voiture']).optional().nullable(),
    license_plate: z.string().max(20, 'Maximum 20 caractères').optional().nullable(),
  })
  .refine(
    (data) => {
      return data.password === data.passwordConfirmation;
    },
    {
      message: 'Les mots de passe ne correspondent pas',
      path: ['passwordConfirmation'],
    },
  )
  .refine(
    (data) => {
      if (data.role === 'seller') {
        return !!data.shopName && data.shopName.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Le nom de la boutique est obligatoire pour les vendeurs',
      path: ['shopName'],
    },
  )
  .refine(
    (data) => {
      if (data.role === 'seller') {
        return !!data.cnibRecto;
      }
      return true;
    },
    {
      message: 'Photo CNIB recto obligatoire pour les vendeurs',
      path: ['cnibRecto'],
    },
  )
  .refine(
    (data) => {
      if (data.role === 'seller') {
        return !!data.cnibVerso;
      }
      return true;
    },
    {
      message: 'Photo CNIB verso obligatoire pour les vendeurs',
      path: ['cnibVerso'],
    },
  )
  .refine(
    (data) => {
      if (data.role === 'delivery_man') {
        return !!data.vehicle_type;
      }
      return true;
    },
    {
      message: 'Le type de véhicule est obligatoire pour les livreurs',
      path: ['vehicle_type'],
    },
  )
  .refine(
    (data) => {
      if (data.role === 'delivery_man') {
        return !!data.cnibRecto;
      }
      return true;
    },
    {
      message: 'Photo CNIB recto obligatoire pour les livreurs',
      path: ['cnibRecto'],
    },
  )
  .refine(
    (data) => {
      if (data.role === 'delivery_man') {
        return !!data.cnibVerso;
      }
      return true;
    },
    {
      message: 'Photo CNIB verso obligatoire pour les livreurs',
      path: ['cnibVerso'],
    },
  );

type RegisterFormData = z.infer<typeof registerSchema>;

const defaultRegisterValues: RegisterFormData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  phoneNumber: '',
  promoCode: null,
  role: 'client',
  birthDate: new Date('2000-01-01'),
  shopName: null,
  cnibRecto: null,
  cnibVerso: null,
  businessRegister: null,
  vehicle_type: null,
  license_plate: null,
};

const RegisterScreen = () => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | undefined>();
  const router = useRouter();
  const { files, loading, pickDocument, pickImage } = useFilePicker();
  const styles = useThemedStyles(createStyles);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    getValues,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: defaultRegisterValues,
  });

  const selectedRole = watch('role');

  const apiFieldToFormField: Record<string, keyof RegisterFormData> = {
    first_name: 'firstName',
    last_name: 'lastName',
    date_of_birth: 'birthDate',
    email: 'email',
    phone: 'phoneNumber',
    role: 'role',
    password: 'password',
    password_confirmation: 'passwordConfirmation',
    promo_code: 'promoCode',
    shop_name: 'shopName',
    cnib_recto: 'cnibRecto',
    cnib_verso: 'cnibVerso',
    business_register: 'businessRegister',
    vehicle_type: 'vehicle_type',
    license_plate: 'license_plate',
  };

  const { callRegister: register, isLoading } = useRegister({
    onSuccess() {
      const phone = getValues('phoneNumber');
      router.replace({
        pathname: '/(auth)/otp',
        params: { phone: encodeURIComponent(phone) },
      });
    },
    onError(error) {
      if (error.errors) {
        for (const [apiKey, messages] of Object.entries(error.errors)) {
          const formField = apiFieldToFormField[apiKey];
          if (formField && messages.length > 0) {
            setError(formField, { message: messages[0] });
          }
        }
      }
    },
  });

  useEffect(() => {
    Object.entries(files).forEach(([key, value]) => {
      if (value) {
        setValue(key as keyof RegisterFormData, value as RegisterFormData[keyof RegisterFormData]);
      }
    });
  }, [files, setValue]);

  const toggleTerms = () => {
    setAcceptedTerms(!acceptedTerms);
    setTermsError(undefined);
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (!acceptedTerms) {
      setTermsError('Veuillez accepter les termes et conditions');
      return;
    }

    const payload = {
      ...data,
      cnibRecto: Filesystem.prepareFileForUpload(data.cnibRecto ?? undefined, 'cnib_recto.jpg'),
      cnibVerso: Filesystem.prepareFileForUpload(data.cnibVerso ?? undefined, 'cnib_verso.jpg'),
      businessRegister: Filesystem.prepareFileForUpload(
        data.businessRegister ?? undefined,
        'business_register.pdf',
      ),
    };

    await register(payload as RegisterParams);
  };

  return (
    <>
      <Text style={styles.title}>Bienvenue chez {AppConfiguration.appName}!</Text>
      <Text style={styles.subtitle}>pour commencer, veuillez saisir vos informations</Text>

      <Controller
        control={control}
        name="role"
        render={({ field: { onChange, value } }) => (
          <RolePicker
            name="role"
            label="Rôle"
            value={value || ''}
            onValueChange={onChange}
            disabled={isLoading}
            error={errors.role?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="firstName"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Prénom"
            placeholder="Prénom"
            value={value || ''}
            onChangeText={onChange}
            autoCapitalize="words"
            disabled={isLoading}
            autoComplete="name-given"
            error={errors.firstName?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="lastName"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Nom"
            placeholder="Nom"
            value={value || ''}
            onChangeText={onChange}
            autoCapitalize="words"
            disabled={isLoading}
            autoComplete="name-family"
            error={errors.lastName?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="birthDate"
        render={({ field: { onChange, value } }) => (
          <DatePicker
            label="Date de naissance"
            placeholder="Date de naissance"
            value={value}
            onChange={onChange}
            maximumDate={new Date()}
            disabled={isLoading}
            error={errors.birthDate?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Email"
            placeholder="Email"
            value={value || ''}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            disabled={isLoading}
            error={errors.email?.message}
          />
        )}
      />

      {selectedRole === 'seller' && (
        <>
          <Controller
            control={control}
            name="shopName"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Nom de la boutique"
                placeholder="Nom de la boutique"
                value={value ?? ''}
                onChangeText={onChange}
                disabled={isLoading}
                error={errors.shopName?.message}
              />
            )}
          />

          <FileUploadButton
            label="CNIB recto *"
            onPress={() => pickImage('cnibRecto')}
            hasFile={!!watch('cnibRecto')}
            placeholder="Photo CNIB recto *"
            uploadedText="CNIB recto chargé"
            disabled={isLoading}
            loading={loading.cnibRecto}
            error={errors.cnibRecto?.message}
          />

          <FileUploadButton
            label="CNIB verso *"
            onPress={() => pickImage('cnibVerso')}
            hasFile={!!watch('cnibVerso')}
            placeholder="Photo CNIB verso *"
            uploadedText="CNIB verso chargé"
            disabled={isLoading}
            loading={loading.cnibVerso}
            error={errors.cnibVerso?.message}
          />

          <FileUploadButton
            label="Registre de commerce (Optionnel)"
            onPress={() => pickDocument('businessRegister')}
            hasFile={!!watch('businessRegister')}
            placeholder="Registre de commerce (Optionnel)"
            uploadedText="Registre de commerce chargé"
            disabled={isLoading}
            loading={loading.businessRegister}
            error={errors.businessRegister?.message}
          />
        </>
      )}

      {selectedRole === 'delivery_man' && (
        <>
          <Controller
            control={control}
            name="vehicle_type"
            render={({ field: { onChange, value } }) => (
              <VehicleTypePicker
                name="vehicle_type"
                label="Type de véhicule"
                value={value ?? undefined}
                onValueChange={onChange}
                disabled={isLoading}
                error={errors.vehicle_type?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="license_plate"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Plaque d'immatriculation"
                placeholder="Plaque d'immatriculation (Optionnel)"
                value={value ?? ''}
                onChangeText={onChange}
                autoCapitalize="characters"
                disabled={isLoading}
                maxLength={20}
                error={errors.license_plate?.message}
              />
            )}
          />

          <FileUploadButton
            label="CNIB recto *"
            onPress={() => pickImage('cnibRecto')}
            hasFile={!!watch('cnibRecto')}
            placeholder="Photo CNIB recto *"
            uploadedText="CNIB recto chargé"
            disabled={isLoading}
            loading={loading.cnibRecto}
            error={errors.cnibRecto?.message}
          />

          <FileUploadButton
            label="CNIB verso *"
            onPress={() => pickImage('cnibVerso')}
            hasFile={!!watch('cnibVerso')}
            placeholder="Photo CNIB verso *"
            uploadedText="CNIB verso chargé"
            disabled={isLoading}
            loading={loading.cnibVerso}
            error={errors.cnibVerso?.message}
          />
        </>
      )}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <PasswordInput
            label="Mot de passe"
            placeholder="Mot de passe"
            value={value || ''}
            onChangeText={onChange}
            autoCapitalize="none"
            disabled={isLoading}
            autoComplete="password-new"
            error={errors.password?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="passwordConfirmation"
        render={({ field: { onChange, value } }) => (
          <PasswordInput
            label="Confirmation du mot de passe"
            placeholder="Confirmation du mot de passe"
            value={value || ''}
            onChangeText={onChange}
            autoCapitalize="none"
            disabled={isLoading}
            autoComplete="password-new"
            error={errors.passwordConfirmation?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="phoneNumber"
        render={({ field: { onChange, value } }) => (
          <PhoneInput
            label="Numéro de téléphone"
            countryCode={COUNTRY_CODE}
            phoneNumber={value || ''}
            onChangePhoneNumber={onChange}
            disabled={isLoading}
            error={errors.phoneNumber?.message}
          />
        )}
      />

      <Checkbox
        checked={acceptedTerms}
        onPress={toggleTerms}
        label="j'accepte les"
        linkText="conditions générales d'utilisation"
        onLinkPress={() => router.push('/(auth)/terms')}
        disabled={isLoading}
        error={termsError}
      />

      <Button
        title="SUIVANT"
        onPress={handleSubmit(onSubmit)}
        isLoading={isLoading}
        fontSize="sm"
        fontWeight="medium"
      />

      <Button
        variant="ghost"
        title="Déjà un compte? Connectez-vous"
        onPress={() => router.push('/(auth)/login')}
        disabled={isLoading}
        textColor={styles.toggleText.color}
        style={styles.toggleButton}
        fontSize="sm"
        fontWeight="normal"
        accessibilityRole="button"
        accessibilityLabel="Switch to sign in"
      />
    </>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.fontSize.base,
      color: theme.colors.text,
      marginBottom: theme.spacing.xl,
      lineHeight: 24,
    },
    toggleButton: {
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    toggleText: {
      color: theme.colors.primary,
    },
  });

RegisterScreen.displayName = 'RegisterScreen';

export default RegisterScreen;

import * as yup from 'yup';
import { t } from '@/i18n';

export const registrationSchema = yup.object().shape({
    fullName: yup
        .string()
        .matches(/^[\w'\-,.][^0-9_!¡?÷?¿/\\+=@#$%ˆ&*(){}|~<>;:[\]]{1,}$/i, t('registerScreen.errors.fullNameInvalid'))
        .required(t('registerScreen.errors.fullNameRequired')),
    email: yup
        .string()
        .email(t('registerScreen.errors.invalidEmail'))
        .required(t('registerScreen.errors.emailRequired')),
    password: yup
        .string()
        .min(8, t('registerScreen.errors.invalidPasswordLength'))
        .matches(/[a-z]/, t('registerScreen.errors.invalidPasswordLowerCase'))
        .matches(/[A-Z]/, t('registerScreen.errors.invalidPasswordUpperCase'))
        .matches(/\d/, t('registerScreen.errors.invalidPasswordNumber'))
        .matches(/[@$!%*?&_]/, t('registerScreen.errors.invalidPasswordSpecialChar'))
        .required(t('registerScreen.errors.passwordRequired')),
    confirmPassword: yup
        .string()
        .oneOf([yup.ref('password')], t('registerScreen.errors.passwordsDontMatch'))
        .required(t('registerScreen.errors.confirmPasswordRequired')),
});

export const loginSchema = yup.object().shape({
    email: yup
        .string()
        .required(t('loginScreen.errors.emailRequired')),
    password: yup
        .string()
        .required(t('loginScreen.errors.passwordRequired')),
});

export const forgotPasswordSchema = yup.object().shape({
    email: yup
        .string()
        .email(t('forgotPasswordScreen.errors.invalidEmail'))
        .required(t('forgotPasswordScreen.errors.emailRequired')),
});

export const qrCodeSchema = yup.object().shape({
    code: yup
      .string()
      .required(t('qrCodeScreen.errors.codeRequired')),
    qr_index: yup
      .number()
      .integer(t('qrCodeScreen.errors.qrIndexInteger'))
      .required(t('qrCodeScreen.errors.qrIndexRequired')),
    metadata: yup
      .string()
      .nullable(), 
    type: yup
      .string()
      .oneOf(['store', 'bank', 'ewallet'], t('qrCodeScreen.errors.invalidType'))
      .required(t('qrCodeScreen.errors.typeRequired')),
    metadata_type: yup
      .string()
      .oneOf(['qr', 'barcode'], t('qrCodeScreen.errors.invalidMetadataType'))
      .required(t('qrCodeScreen.errors.metadataTypeRequired')),
    account_name: yup
      .string()
      .nullable(),
    account_number: yup
      .string()
      .nullable(),
  });
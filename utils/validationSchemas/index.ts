import * as yup from 'yup';
import { t } from '@/i18n';

export const registrationSchema = yup.object().shape({
  fullName: yup
    .string()
    .matches(/^[\w'\-,.][^0-9_!¡?÷?¿/\\+=@#$%ˆ&*(){}|~<>;:[\]]{1,}$/i, 'fullNameInvalid')
    .required('fullNameRequired'),
  email: yup
    .string()
    .email('invalidEmail')
    .required('emailRequired'),
  password: yup
    .string()
    .min(8, 'invalidPasswordLength')
    .matches(/[a-z]/, 'invalidPasswordLowerCase')
    .matches(/[A-Z]/, 'invalidPasswordUpperCase')
    .matches(/\d/, 'invalidPasswordNumber')
    .matches(/[@$!%*?&_]/, 'invalidPasswordSpecialChar')
    .required('passwordRequired'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'passwordsDontMatch')
    .required('confirmPasswordRequired'),
});

export const loginSchema = yup.object().shape({
  email: yup
    .string()
    .required('emailRequired'),
  password: yup
    .string()
    .required('passwordRequired'),
});

export const forgotPasswordSchema = yup.object().shape({
  email: yup
    .string()
    .email('invalidEmail')
    .required('emailRequired'),
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
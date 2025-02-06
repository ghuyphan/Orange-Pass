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
  category: yup
    .object()
    .shape({
      display: yup.string().required(), //  'display' is always present
      value: yup.string().oneOf(['bank', 'ewallet', 'store']).required(),
    })
    .nullable() // Allow null, as the category can be cleared
    .required(t('addScreen.errors.categoryRequired')), // Make category required
  brand: yup
    .object()
    .shape({
      code: yup.string().required(),
      name: yup.string().required(),
      full_name: yup.string().required(),
      type: yup.string().oneOf(['bank', 'ewallet', 'store']).required(),
    })
    .nullable(), //  null when no brand is selected
  metadataType: yup
    .object()
    .shape({
      display: yup.string().required(),
      value: yup.string().oneOf(['qr', 'barcode']).required(),
    })
    .required(t('addScreen.errors.metadataTypeRequired')), // metadataType is always required
  metadata: yup.string().required(t('addScreen.errors.metadataRequired')), // Metadata is required
  accountName: yup.string().nullable(),
  accountNumber: yup.string().nullable(),
});
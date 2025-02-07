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
      display: yup.string().required(t('addScreen.errors.categoryRequired')), // More specific error messages are good
      value: yup.string().oneOf(['bank', 'ewallet', 'store']).required(t('addScreen.errors.categoryRequired')),
    })
    .nullable()  // Allow null (for clearing),
    .required(t('addScreen.errors.categoryRequired')), // but still require a value to be *selected*.

  brand: yup
    .object()
    .shape({
      code: yup.string().required(), // These are always required *within* the brand object
      name: yup.string().required(),
      full_name: yup.string().required(),
      type: yup.string().oneOf(['bank', 'ewallet', 'store']).required(),
    })
    .nullable() // Allow the entire brand object to be null
    .when('category', {  // Conditional validation based on category
      is: (category: { value?: string }) => category?.value !== 'store', //  check if category is NOT 'store'
      then: (schema) => schema.required(t('addScreen.errors.brandRequired')),  // If not 'store', brand is required
      otherwise: (schema) => schema.nullable(), // otherwise, it can be null
    }),

  metadataType: yup
    .object()
    .shape({
      display: yup.string().required(),
      value: yup.string().oneOf(['qr', 'barcode']).required(),
    })
    .required(t('addScreen.errors.metadataTypeRequired')),

  metadata: yup.string().required(t('addScreen.errors.metadataRequired')),

  accountName: yup.string()
    .nullable() // Allow null initially
    .when('category', {
      is: (category: { value?: string }) => category?.value !== 'store',
      then: (schema) => schema.required(t('addScreen.errors.accountNameRequired')), // Required if category is not 'store'
      otherwise: (schema) => schema.nullable(), // Otherwise, it can be null (or an empty string, which is equivalent)
    }),

  accountNumber: yup.string()
    .nullable() // Allow null initially
    .when('category', {
      is: (category: { value?: string }) => category?.value !== 'store',
      then: (schema) => schema.required(t('addScreen.errors.accountNumberRequired')), // Required if category is not 'store'
      otherwise: (schema) => schema.nullable(), // Otherwise, allow null
    }),
});
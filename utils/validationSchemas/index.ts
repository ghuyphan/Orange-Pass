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


export const qrCodeSchema = yup.object({
  category: yup.object().shape({
    value: yup.string().oneOf(['bank', 'ewallet', 'store']).required(() => t('addScreen.errors.categoryRequired')),
    display: yup.string().required(() => t('addScreen.errors.categoryRequired'))
  }).required(() => t('addScreen.errors.categoryRequired')),

  brand: yup.object().shape({
    code: yup.string().required(),
    name: yup.string().required(),
    full_name: yup.string().required(),
    type: yup.string().oneOf(['bank', 'ewallet', 'store']).required()
  }).nullable().when('category.value', { // Correctly reference category.value
    is: (categoryValue: string) => categoryValue !== 'store',
    then: () => yup.object().shape({ // Re-define the shape for brand
      code: yup.string().required(),
      name: yup.string().required(),
      full_name: yup.string().required(),
      type: yup.string().oneOf(['bank', 'ewallet', 'store']).required()
    }).required(() => t('addScreen.errors.brandRequired')),
    otherwise: () => yup.object().shape({ //allow null for store
      code: yup.string().nullable(),
      name: yup.string().nullable(),
      full_name: yup.string().nullable(),
      type: yup.string().nullable()
    }).nullable(),
  }),

  metadataType: yup.object().shape({
    value: yup.string().oneOf(['qr', 'barcode']).required(),
    display: yup.string().required()
  }).required(() => t('addScreen.errors.metadataTypeRequired')),

  metadata: yup.string().when('category.value', { // Conditional validation for metadata
    is: (categoryValue: string) => categoryValue === 'store' || categoryValue === 'ewallet',
    then: () => yup.string().required(() => t('addScreen.errors.metadataRequired')),
    otherwise: () => yup.string().nullable(), // Allow null/empty for 'bank'
  }),

  accountName: yup.string().when('category.value', {
      is: (categoryValue:string) => categoryValue === 'bank',
      then: () => yup.string().required(() => t('addScreen.errors.accountNameRequired')),
      otherwise: () => yup.string().nullable()
  }),
  accountNumber: yup.string().when('category.value', {
    is: (categoryValue:string) => categoryValue === 'bank',
    then: () => yup.string().required(() => t('addScreen.errors.accountNumberRequired')),
    otherwise: () => yup.string().nullable()
}),
});

export const profileSchema = yup.object().shape({
  name: yup
    .string()
    .matches(
      /^[\w'\-,.][^0-9_!¡?÷?¿/\\+=@#$%ˆ&*(){}|~<>;:[\]]{1,}$/i,
      'nameInvalid'
    )
    .required('nameRequired'),
  email: yup
    .string()
    .email('invalidEmail')
    .required('emailRequired'),
  currentPassword: yup.string().when('newPassword', {
    is: (val: string) => !!val && val.length > 0,
    then: (schema) => schema.required('currentPasswordRequired'),
    otherwise: (schema) => schema.notRequired(),
  }),
  newPassword: yup
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v))
    .min(8, 'invalidPasswordLength')
    .matches(/[a-z]/, 'invalidPasswordLowerCase')
    .matches(/[A-Z]/, 'invalidPasswordUpperCase')
    .matches(/\d/, 'invalidPasswordNumber')
    .matches(/[@$!%*?&_]/, 'invalidPasswordSpecialChar')
    .notRequired(),
  confirmNewPassword: yup.string().when('newPassword', {
    is: (val: string) => !!val && val.length > 0,
    then: (schema) =>
      schema
        .required('confirmNewPasswordRequired')
        .oneOf([yup.ref('newPassword')], 'passwordsDontMatch'),
    otherwise: (schema) => schema.notRequired(),
  }),
});
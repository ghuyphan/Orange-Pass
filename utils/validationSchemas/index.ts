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
      display: yup.string().required(() => t('addScreen.errors.categoryRequired')), // Use a FUNCTION here
      value: yup.string().oneOf(['bank', 'ewallet', 'store']).required(() => t('addScreen.errors.categoryRequired')), // And here
    })
    .nullable()
    .required(() => t('addScreen.errors.categoryRequired')), // And here

  brand: yup
    .object()
    .shape({
      code: yup.string().required(),  // These don't need t() because they are internal, not user-facing
      name: yup.string().required(),
      full_name: yup.string().required(),
      type: yup.string().oneOf(['bank', 'ewallet', 'store']).required(),
    })
    .nullable()
    .when('category', {
      is: (category: { value?: string }) => category?.value !== 'store',
      then: (schema) => schema.required(() => t('addScreen.errors.brandRequired')), // Function here!
      otherwise: (schema) => schema.nullable(),
    }),

  metadataType: yup
    .object()
    .shape({
      display: yup.string().required(), // This likely *doesn't* need a message, as it's a display value
      value: yup.string().oneOf(['qr', 'barcode']).required(),
    })
    .required(() => t('addScreen.errors.metadataTypeRequired')), // Function here!

  metadata: yup.string().required(() => t('addScreen.errors.metadataRequired')), // Function here!

  accountName: yup.string()
    .nullable()
    .when('category', {
      is: (category: { value?: string }) => category?.value !== 'store',
      then: (schema) => schema.required(() => t('addScreen.errors.accountNameRequired')),
      otherwise: (schema) => schema.nullable(),
    }),

  accountNumber: yup.string()
    .nullable()
    .when('category', {
      is: (category: { value?: string }) => category?.value !== 'store',
      then: (schema) => schema.required(() => t('addScreen.errors.accountNumberRequired')),
      otherwise: (schema) => schema.nullable(),
    }),
});

import * as Yup from "yup";
import { t } from "@/i18n";

// --- Helper Types for qrCodeSchema (Ideally, import from your actual types) ---
interface CategoryItemValue {
  value: "bank" | "ewallet" | "store";
  display: string;
}

interface BrandItemShape {
  code: string;
  name: string;
  full_name: string;
  type: "bank" | "ewallet" | "store";
  bin?: string;
}

interface MetadataTypeItemShape {
  value: "qr" | "barcode";
  display: string;
}
// --- End Helper Types ---

export const registrationSchema = Yup.object().shape({
  fullName: Yup.string()
    .matches(
      /^[\w'\-,.][^0-9_!¡?÷?¿/\\+=@#$%ˆ&*(){}|~<>;:[\]]{1,}$/i,
      "fullNameInvalid",
    )
    .required("fullNameRequired"),
  email: Yup.string().email("invalidEmail").required("emailRequired"),
  password: Yup.string()
    .min(8, "invalidPasswordLength")
    .matches(/[a-z]/, "invalidPasswordLowerCase")
    .matches(/[A-Z]/, "invalidPasswordUpperCase")
    .matches(/\d/, "invalidPasswordNumber")
    .matches(/[@$!%*?&_]/, "invalidPasswordSpecialChar")
    .required("passwordRequired"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "passwordsDontMatch")
    .required("confirmPasswordRequired"),
});

export const loginSchema = Yup.object().shape({
  email: Yup.string().required("emailRequired"),
  password: Yup.string().required("passwordRequired"),
});

export const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string().email("invalidEmail").required("emailRequired"),
});

export const qrCodeSchema = Yup.object({
  category: Yup.object<CategoryItemValue>()
    .shape({
      value: Yup.string()
        .oneOf(["bank", "ewallet", "store"] as const)
        .required(() => t("addScreen.errors.categoryRequired")),
      display: Yup.string().required(() =>
        t("addScreen.errors.categoryRequired"),
      ),
    })
    .nullable() // Allow null initially
    .required(() => t("addScreen.errors.categoryRequired")),

  brand: Yup.object<BrandItemShape>()
    .nullable()
    .when("category", {
      is: (category: CategoryItemValue | null) =>
        category?.value === "bank" || category?.value === "ewallet",
      then: (schema) =>
        schema
          .shape({
            code: Yup.string().required(),
            name: Yup.string().required(),
            full_name: Yup.string().required(),
            type: Yup.string()
              .oneOf(["bank", "ewallet", "store"] as const)
              .required(),
            bin: Yup.string().optional(),
          })
          .required(() => t("addScreen.errors.brandRequired")),
      otherwise: (schema) => schema.optional().nullable().strip(), // Optional and stripped for 'store' or no category
    }),

  metadataType: Yup.object<MetadataTypeItemShape>()
    .shape({
      value: Yup.string()
        .oneOf(["qr", "barcode"] as const)
        .required(),
      display: Yup.string().required(),
    })
    .required(() => t("addScreen.errors.metadataTypeRequired")),

  metadata: Yup.string().when("category", {
    is: (category: CategoryItemValue | null) =>
      !!category && // Ensure category is not null
      (category.value === "store" ||
        category.value === "ewallet" ||
        category.value === "bank"),
    then: (schema) =>
      schema.trim().required(() => t("addScreen.errors.metadataRequired")),
    otherwise: (schema) => schema.optional().nullable().strip(),
  }),

  accountName: Yup.string().when("category", {
    is: (category: CategoryItemValue | null) =>
      category?.value === "bank" || category?.value === "ewallet",
    then: (schema) =>
      schema.trim().required(() => t("addScreen.errors.accountNameRequired")),
    otherwise: (schema) => schema.optional().nullable().strip(),
  }),

  accountNumber: Yup.string().when("category", {
    is: (category: CategoryItemValue | null) =>
      category?.value === "bank" || category?.value === "ewallet",
    then: (schema) =>
      schema
        .trim()
        .required(() => t("addScreen.errors.accountNumberRequired"))
        .matches(/^[0-9]+$/, t("addScreen.errors.accountNumberNumeric")),
    otherwise: (schema) => schema.optional().nullable().strip(),
  }),
});

export const editProfileSchema = Yup.object().shape({
  name: Yup.string()
    .matches(
      /^[\w'\-,.][^0-9_!¡?÷?¿/\\+=@#$%ˆ&*(){}|~<>;:[\]]{1,}$/i,
      "nameInvalid"
    )
    .required("nameRequired"),
  email: Yup.string().email("invalidEmail").required("emailRequired"),
});

export const profileSchema = Yup.object().shape({
  name: Yup.string()
    .matches(
      /^[\w'\-,.][^0-9_!¡?÷?¿/\\+=@#$%ˆ&*(){}|~<>;:[\]]{1,}$/i,
      "nameInvalid",
    )
    .required("nameRequired"),
  email: Yup.string().email("invalidEmail").required("emailRequired"),
  currentPassword: Yup.string().when("newPassword", {
    is: (val?: string | null) => !!val && val.length > 0, // Check if newPassword has a value
    then: (schema) => schema.required("currentPasswordRequired"),
    otherwise: (schema) => schema.notRequired(),
  }),
  newPassword: Yup.string()
    .nullable()
    .transform((v) => (v === "" ? null : v)) // Treat empty string as null
    .min(8, "invalidPasswordLength")
    .matches(/[a-z]/, "invalidPasswordLowerCase")
    .matches(/[A-Z]/, "invalidPasswordUpperCase")
    .matches(/\d/, "invalidPasswordNumber")
    .matches(/[@$!%*?&_]/, "invalidPasswordSpecialChar")
    .notRequired(), // Not required by default
  confirmNewPassword: Yup.string().when("newPassword", {
    is: (val?: string | null) => !!val && val.length > 0, // Check if newPassword has a value
    then: (schema) =>
      schema
        .required("confirmNewPasswordRequired")
        .oneOf([Yup.ref("newPassword")], "passwordsDontMatch"),
    otherwise: (schema) => schema.notRequired(),
  }),
});

export const passwordChangeSchema = Yup.object().shape({
  currentPassword: Yup.string().required("currentPasswordRequired"),
  newPassword: Yup.string()
    .min(8, "invalidPasswordLength")
    .matches(/[a-z]/, "invalidPasswordLowerCase")
    .matches(/[A-Z]/, "invalidPasswordUpperCase")
    .matches(/\d/, "invalidPasswordNumber")
    .matches(/[@$!%*?&_]/, "invalidPasswordSpecialChar")
    .required("newPasswordRequired"),
  confirmNewPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "passwordsDontMatch") // Use a consistent error key
    .required("confirmNewPasswordRequired"),
});

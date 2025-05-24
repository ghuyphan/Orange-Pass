// AddScreenGuest.tsx
import React, { useCallback, useMemo, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { router, useLocalSearchParams } from "expo-router";
import { FormikHelpers, FormikProps } from "formik";
import QRForm, {
  FormParams,
  CategoryItem,
  BrandItem,
  MetadataTypeItem,
} from "@/components/forms/QRForm";
import { addQrData, removeQrData } from "@/store/reducers/qrSlice";
import { generateUniqueId } from "@/utils/uniqueId";
import QRRecord from "@/types/qrType";
import { getNextQrIndex, insertOrUpdateQrCodes } from "@/services/localDB/qrDB";
import { returnItemCodeByBin, returnItemData } from "@/utils/returnItemData";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/i18n";
import { getVietQRData } from "@/utils/vietQR";

const GUEST_USER_ID = ""; // Guest user ID is always an empty string

const AddScreenGuest: React.FC = () => {
  const dispatch = useDispatch();
  const userId = GUEST_USER_ID; // For a guest-only screen, userId is constant
  const { locale: currentLocale = "en" } = useLocale();
  const { codeFormat, codeValue, codeBin, codeType, codeProvider } =
    useLocalSearchParams<{
      codeFormat?: string;
      codeValue?: string;
      codeBin?: string;
      codeType?: string;
      codeProvider?: string;
    }>();

  const [isVietQrLoading, setIsVietQrLoading] = useState(false);
  const formikRef = useRef<FormikProps<FormParams>>(null);

  const onNavigateBack = useCallback(() => router.back(), []);

  const categoryMap = useMemo(
    () => ({
      bank: { display: t("addScreen.bankCategory"), value: "bank" },
      ewallet: { display: t("addScreen.ewalletCategory"), value: "ewallet" },
      store: { display: t("addScreen.storeCategory"), value: "store" },
    }),
    [t],
  );

  const metadataTypeData: MetadataTypeItem[] = useMemo(
    () => [
      { display: t("addScreen.qr"), value: "qr" },
      { display: t("addScreen.barcode"), value: "barcode" },
    ],
    [t],
  );

  const getItemDataHelper = useCallback(
    (itemCode: string): BrandItem | null => {
      const itemData = returnItemData(itemCode);
      if (!itemData || !["bank", "store", "ewallet"].includes(itemData.type)) {
        return null;
      }
      return {
        code: itemCode,
        name: itemData.name,
        full_name: itemData.full_name[currentLocale] || itemData.name,
        type: itemData.type as "bank" | "store" | "ewallet",
        bin: itemData.bin, // Added bin to match AddScreen.tsx
      };
    },
    [currentLocale],
  );

  const itemCode = useMemo(() => {
    return codeProvider || returnItemCodeByBin(codeBin || "");
  }, [codeBin, codeProvider]);

  const initialValues: FormParams = useMemo(() => {
    const categoryKey = codeType as keyof typeof categoryMap;
    const category = categoryKey ? categoryMap[categoryKey] : null;
    const brand = itemCode ? getItemDataHelper(itemCode) : null;

    let metadataType: MetadataTypeItem = metadataTypeData[0]; // Default to QR
    if (codeFormat) {
      if (codeFormat.includes("QR_CODE") || codeFormat === "256") {
        metadataType =
          metadataTypeData.find((item) => item.value === "qr") ||
          metadataTypeData[0];
      } else if (
        codeFormat.includes("CODE_128") ||
        codeFormat.includes("EAN_13") ||
        codeFormat === "1"
      ) {
        metadataType =
          metadataTypeData.find((item) => item.value === "barcode") ||
          metadataTypeData[0];
      }
    }

    return {
      metadataType,
      category: category as CategoryItem,
      brand,
      metadata: codeValue || "",
      accountName: "",
      accountNumber: "",
    };
  }, [
    codeType,
    itemCode,
    codeValue,
    codeFormat,
    categoryMap,
    metadataTypeData,
    getItemDataHelper,
  ]);

  const handleAttemptBankMetadataFetch = useCallback(
    async (accountNumber: string, accountName: string, brandBin: string) => {
      setIsVietQrLoading(true);
      try {
        console.log("Fetching VietQR data for guest...");
        const response = await getVietQRData(
          accountNumber,
          accountName ?? "",
          brandBin,
          0,
          "",
        );
        if (response && response.data && response.data.qrCode) {
          return { qrCode: response.data.qrCode, error: null };
        } else {
          console.warn(
            "Guest VietQR response did not contain qrCode:",
            response,
          );
          return { qrCode: null, error: t("addScreen.vietQrGenerationError") };
        }
      } catch (apiError: any) {
        console.error("Guest VietQR API error:", apiError);
        const errorMessage =
          apiError?.message || t("addScreen.vietQrApiError");
        return { qrCode: null, error: errorMessage };
      } finally {
        setIsVietQrLoading(false);
      }
    },
    [t],
  );

  const handleFormSubmit = useCallback(
    async (values: FormParams, formikHelpers: FormikHelpers<FormParams>) => {
      formikHelpers.setSubmitting(true);
      const newId = generateUniqueId();
      const now = new Date().toISOString();

      const metadataToSave =
        formikRef.current?.values.metadata || values.metadata;

      try {
        if (isVietQrLoading) {
          console.warn(
            "Guest submit initiated while VietQR data is still loading.",
          );
          formikHelpers.setFieldError(
            "metadata",
            t("addScreen.vietQrLoadingSubmitError"),
          );
          formikHelpers.setSubmitting(false);
          return;
        }

        const nextIndex = await getNextQrIndex(userId); // userId is GUEST_USER_ID
        const newQrRecord: QRRecord = {
          id: newId,
          qr_index: nextIndex,
          user_id: userId, // Always GUEST_USER_ID
          code: values.brand?.code || "",
          metadata: metadataToSave,
          metadata_type: values.metadataType?.value || "qr",
          account_name: values.accountName,
          account_number: values.accountNumber,
          type: values.category?.value || "store",
          created: now,
          updated: now,
          is_deleted: false,
          is_synced: true, // For guests, data is "synced" locally by default
        };

        dispatch(addQrData(newQrRecord));
        await insertOrUpdateQrCodes([newQrRecord]);

        // Navigate to guest home for this version of the screen
        router.replace("/(guest)/guest-home");
      } catch (error) {
        console.error("Guest submission error:", error);
        dispatch(removeQrData(newId)); // Rollback redux state on error
        formikHelpers.setStatus({
          submitError: t("addScreen.errors.submitFailed"),
        });
      } finally {
        formikHelpers.setSubmitting(false);
      }
    },
    [dispatch, userId, isVietQrLoading, t, router],
  );

  return (
    <QRForm
      formikRef={formikRef}
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      isEditing={false}
      onNavigateBack={onNavigateBack}
      codeProvider={codeProvider}
      isMetadataLoading={isVietQrLoading}
      onAttemptBankMetadataFetch={handleAttemptBankMetadataFetch}
    />
  );
};

export default React.memo(AddScreenGuest);

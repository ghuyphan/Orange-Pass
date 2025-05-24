// AddScreen.tsx
import React, { useCallback, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { router, useLocalSearchParams } from "expo-router";
import { FormikHelpers, FormikProps } from "formik";
import QRForm, {
  FormParams,
  CategoryItem,
  BrandItem,
  MetadataTypeItem,
} from "@/components/forms/QRForm";
import { addQrData, removeQrData } from "@/store/reducers/qrSlice";
import { RootState } from "@/store/rootReducer";
import { generateUniqueId } from "@/utils/uniqueId";
import QRRecord from "@/types/qrType";
import { getNextQrIndex, insertOrUpdateQrCodes } from "@/services/localDB/qrDB";
import { returnItemCodeByBin, returnItemData } from "@/utils/returnItemData";
import { useLocale } from "@/context/LocaleContext";
import { t } from "@/i18n";
import { getVietQRData } from "@/utils/vietQR";

const AddScreen: React.FC = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? "");
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
        bin: itemData.bin,
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
      // Expo Router params are strings. "256" is a common value for QR.
      // Adjust these values based on what your scanner actually provides.
      if (codeFormat.includes("QR_CODE") || codeFormat === "256") {
        metadataType =
          metadataTypeData.find((item) => item.value === "qr") ||
          metadataTypeData[0];
      } else if (
        codeFormat.includes("CODE_128") ||
        codeFormat.includes("EAN_13") ||
        codeFormat === "1"
      ) {
        // Example barcode formats
        metadataType =
          metadataTypeData.find((item) => item.value === "barcode") ||
          metadataTypeData[0];
      }
    }

    return {
      metadataType,
      category: category as CategoryItem, // Cast, as it might be null initially
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
        console.log("Fetching VietQR data...");
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
          console.warn("VietQR response did not contain qrCode:", response);
          return { qrCode: null, error: t("addScreen.vietQrGenerationError") };
        }
      } catch (apiError: any) {
        console.error("VietQR API error:", apiError);
        const errorMessage =
          apiError?.message || t("addScreen.vietQrApiError");
        return { qrCode: null, error: errorMessage };
      } finally {
        setIsVietQrLoading(false);
      }
    },
    [],
  );

  const handleFormSubmit = useCallback(
    async (values: FormParams, formikHelpers: FormikHelpers<FormParams>) => {
      formikHelpers.setSubmitting(true);
      const newId = generateUniqueId();
      const now = new Date().toISOString();

      // Ensure metadata is the latest, especially if it was fetched
      const metadataToSave = formikRef.current?.values.metadata || values.metadata;


      try {
        if (isVietQrLoading) {
          console.warn(
            "Submit initiated while VietQR data is still loading.",
          );
          // Use the toast mechanism from QRForm if possible, or set a formik error
          formikHelpers.setFieldError(
            "metadata",
            t("addScreen.vietQrLoadingSubmitError"),
          );
          formikHelpers.setSubmitting(false);
          return;
        }

        const nextIndex = await getNextQrIndex(userId);
        const newQrRecord: QRRecord = {
          id: newId,
          qr_index: nextIndex,
          user_id: userId,
          code: values.brand?.code || "",
          metadata: metadataToSave,
          metadata_type: values.metadataType?.value || "qr",
          account_name: values.accountName,
          account_number: values.accountNumber,
          type: values.category?.value || "store",
          created: now,
          updated: now,
          is_deleted: false,
          is_synced: false,
        };

        dispatch(addQrData(newQrRecord));
        await insertOrUpdateQrCodes([newQrRecord]);
        router.replace("/(auth)/home");
      } catch (error) {
        console.error("Submission error:", error);
        dispatch(removeQrData(newId));
        formikHelpers.setStatus({
          submitError: t("addScreen.errors.submitFailed"),
        }); // General error
      } finally {
        formikHelpers.setSubmitting(false);
      }
    },
    [dispatch, userId, isVietQrLoading, t],
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

export default React.memo(AddScreen);

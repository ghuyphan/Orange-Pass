import React, { useCallback, useMemo } from "react";
import { useDispatch } from "react-redux"; // Removed useSelector as userId is fixed
import { router, useLocalSearchParams } from "expo-router";
import { FormikHelpers } from "formik";
import QRForm, {
  FormParams,
  CategoryItem,
  BrandItem,
  MetadataTypeItem,
} from "@/components/forms/QRForm";
import { addQrData, removeQrData } from "@/store/reducers/qrSlice";
// Removed RootState import as we are not selecting userId anymore
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
  // For a guest-only screen, userId is constant
  const userId = GUEST_USER_ID;
  const { locale: currentLocale = "en" } = useLocale();
  const { codeFormat, codeValue, codeBin, codeType, codeProvider } =
    useLocalSearchParams<{
      codeFormat?: string;
      codeValue?: string;
      codeBin?: string;
      codeType?: string;
      codeProvider?: string;
    }>();

  const onNavigateBack = useCallback(() => router.back(), [router]);

  const categoryMap = useMemo(
    () => ({
      bank: { display: t("addScreen.bankCategory"), value: "bank" },
      ewallet: { display: t("addScreen.ewalletCategory"), value: "ewallet" },
      store: { display: t("addScreen.storeCategory"), value: "store" },
    }),
    [t]
  );

  const metadataTypeData: MetadataTypeItem[] = useMemo(
    () => [
      { display: t("addScreen.qr"), value: "qr" },
      { display: t("addScreen.barcode"), value: "barcode" },
    ],
    [t]
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
      };
    },
    [currentLocale]
  );

  const itemCode = useMemo(() => {
    return codeProvider || returnItemCodeByBin(codeBin || "");
  }, [codeBin, codeProvider]);

  const initialValues: FormParams = useMemo(() => {
    const categoryKey = codeType as keyof typeof categoryMap;
    const category = categoryKey ? categoryMap[categoryKey] : null;
    const brand = itemCode ? getItemDataHelper(itemCode) : null;

    let metadataType: MetadataTypeItem = metadataTypeData[0];
    if (codeFormat === "256") {
      metadataType =
        metadataTypeData.find(item => item.value === "qr") ||
        metadataTypeData[0];
    } else if (codeFormat === "1") {
      metadataType =
        metadataTypeData.find(item => item.value === "barcode") ||
        metadataTypeData[0];
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

  const handleFormSubmit = useCallback(
    async (values: FormParams, formikHelpers: FormikHelpers<FormParams>) => {
      formikHelpers.setSubmitting(true);
      const newId = generateUniqueId();
      const now = new Date().toISOString();
      let metadata = values.metadata;

      try {
        // userId is GUEST_USER_ID
        const nextIndex = await getNextQrIndex(userId);

        if (
          values.category?.value === "bank" &&
          values.brand?.bin &&
          values.accountNumber
        ) {
          const response = await getVietQRData(
            values.accountNumber,
            values.accountName,
            values.brand.bin,
            0,
            ""
          );
          if (response?.data?.qrCode) {
            metadata = response.data.qrCode;
          } else {
            console.warn("VietQR data fetch was not successful, using original metadata.");
          }
        }

        const newQrRecord: QRRecord = {
          id: newId,
          qr_index: nextIndex,
          user_id: userId, // Always GUEST_USER_ID
          code: values.brand?.code || "",
          metadata: metadata,
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

        await new Promise(resolve => setTimeout(resolve, 300));

        // Always navigate to guest home for this version of the screen
        router.replace("/(guest)/guest-home");
      } catch (error) {
        console.error("Submission error:", error);
        dispatch(removeQrData(newId));
        formikHelpers.setSubmitting(false);
      }
    },
    [dispatch, userId, router] // userId is stable (GUEST_USER_ID) but kept for consistency
  );

  return (
    <QRForm
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      isEditing={false}
      onNavigateBack={onNavigateBack}
      codeProvider={codeProvider}
    />
  );
};

export default React.memo(AddScreenGuest);

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productSchema } from "../schema/productSchema";
import type { ProductFormData } from "../schema/productSchema";
import { productService } from "../services/productService";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import { fetchGlobalMasterData } from "../../shared/store/masterDataSlice";
import { subCategoryApi } from "../../subcategory/api";
import { categoryApi } from "../../category";
import { subscribeToCategoryUpdates } from "../../category/utils/categorySync";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../../app/providers/useToast";
import { backofficeConfigApi } from "../../../general/configuration/services/backofficeConfigApi";
import { resolveImageUrl } from "../../../../utils/imageUtils";
import { notifyPosMenuUpdated } from "../../../pos/utils/posMenuSync";






export const useProductForm = (productId?: number) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const auth = useAppSelector((state: any) => state.auth);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isImageChanged, setIsImageChanged] = useState<boolean>(false);

  const handleImageSelect = (file: File | null) => {
    setImageFile(file);
    setIsImageChanged(true);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview("");
    }
  };

  // Global Master Data (branches, etc.)
  const dispatch = useAppDispatch();
  const { data: globalMasterData, branches } = useAppSelector((state: any) => state.masterData);

  let currentBranchId = auth?.activeBranchId || auth?.branchId || Number(localStorage.getItem("branchId"));
  if (!currentBranchId || Number(currentBranchId) === 0) {
    currentBranchId = branches && branches.length > 0 ? branches[0].id : 1;
  }
  currentBranchId = Number(currentBranchId);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      productId: undefined,
      code: "",
      name: "",
      arabicName: "",
      categoryId: "",
      subCatId: "",
      branchId: String(currentBranchId),
      groupId: "",
      typeId: "",
      unitId: "",
      pVatId: "",
      sVatId: "",
      cost: (0).toFixed(parseInt(localStorage.getItem("decimalPart") || "3", 10)),
      price: (0).toFixed(parseInt(localStorage.getItem("decimalPart") || "3", 10)),
      barcode: "",
      colorCode: "#49293e",
      isActive: true,
      priceIsIncl: false,
      fileName: "",
      fileUrl: "",
      filePath: "",
      imageUrl: "",
      altProducts: [],
      productColors: [],
      openingStocks: []
    }
  });

  const altProductsField = useFieldArray({
    control: form.control,
    name: "altProducts"
  });

  useEffect(() => {
    if (!globalMasterData || branches.length === 0) {
      dispatch(fetchGlobalMasterData());
    }
  }, [dispatch, globalMasterData, branches.length]);

  // Product Master Data
  const { data: masterData, isLoading: isLoadingMaster } = useQuery({
    queryKey: ["productMasterData"],
    queryFn: () => productService.loadMasterData(),
    staleTime: 0,
    refetchOnMount: "always"
  });

  // Category Master Data (always fresh from /category/category-list)
  const { data: categoryList = [], refetch: refetchCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.getCategories(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Real-time synchronization for category updates (same tab and cross-tab)
  useEffect(() => {
    const unsubscribe = subscribeToCategoryUpdates(() => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["productMasterData"] });
      void refetchCategories();
      void queryClient.refetchQueries({ queryKey: ["productMasterData"] });
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, refetchCategories]);

  // Merge masterData?.category with categoryList and queryClient cache
  const effectiveMasterData = useMemo(() => {
    const categoryMap = new Map<string, { id: number; name: string }>();

    // 1. First add from masterData?.category
    if (Array.isArray(masterData?.category)) {
      for (const c of masterData.category) {
        const id = Number(c.id ?? (c as any).categoryId);
        const name = c.name || (c as any).categoryName || "";
        if (id) {
          categoryMap.set(String(id), { id, name });
        }
      }
    }

    // 2. Add/merge from categoryList (which calls /category/category-list)
    if (Array.isArray(categoryList)) {
      for (const c of categoryList) {
        const id = Number(c.id);
        const name = c.name || "";
        if (id) {
          categoryMap.set(String(id), { id, name });
        }
      }
    }

    // 3. Fallback from queryClient cache for ["categories"]
    const cachedCategories = queryClient.getQueryData<any[]>(["categories"]);
    if (Array.isArray(cachedCategories)) {
      for (const c of cachedCategories) {
        const id = Number(c.id ?? c.catId);
        const name = c.name ?? c.catName ?? "";
        if (id && !categoryMap.has(String(id))) {
          categoryMap.set(String(id), { id, name });
        }
      }
    }

    const mergedCategories = Array.from(categoryMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return {
      unit: masterData?.unit || [],
      group: masterData?.group || [],
      category: mergedCategories,
      vat: masterData?.vat || [],
      type: masterData?.type || [],
    };
  }, [masterData, categoryList, queryClient]);

  // Dynamic Subcategories based on Category selection
  const selectedCategoryId = form.watch("categoryId");
  const { data: subCategories = [], isLoading: isLoadingSubs } = useQuery({
    queryKey: ["subCategories", selectedCategoryId],
    queryFn: async () => {
      const catId = parseInt(selectedCategoryId);
      if (!catId) return [];
      const subs = await subCategoryApi.getSubCategories(undefined, undefined, catId);
      return subs.map(s => ({ id: s.id, name: s.name }));
    },
    enabled: !!selectedCategoryId
  });

  // Existing Data (for edit)
  const { data: existingData, isLoading: isLoadingExisting } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => productService.getById(productId!),
    enabled: !!productId
  });

  // Generate Base Barcode & Code on Mount (if creating new)
  useEffect(() => {
    if (!productId) {
      productService.getNextBarcode().then(barcode => {
        if (!form.getValues("barcode")) {
          form.setValue("barcode", barcode, { shouldValidate: true });
        }
        if (!form.getValues("code")) {
          form.setValue("code", barcode, { shouldValidate: true });
        }
      }).catch(err => console.error("Failed to generate base barcode/code", err));
    }
  }, [productId, form]);

  const selectedFormBranchId = form.watch("branchId");
  const activeBranchId = Number(selectedFormBranchId) > 0 
    ? Number(selectedFormBranchId) 
    : (auth?.activeBranchId || auth?.branchId || Number(localStorage.getItem("branchId")) || 1);

  // Fetch Backoffice Config to get branch default Product Type and VAT %
  const { data: backofficeConfigList } = useQuery({
    queryKey: ["backofficeBranchConfig", activeBranchId],
    queryFn: () => backofficeConfigApi.getConfigData(activeBranchId),
    enabled: !productId && !!activeBranchId
  });

  // Set default values (Product Type, VAT %, Unit 'nos') from Backoffice Config when creating new product
  useEffect(() => {
    if (productId) return;

    const boConfig = backofficeConfigList && backofficeConfigList.length > 0 ? backofficeConfigList[0] : null;
    console.log("[useProductForm] Branch:", activeBranchId, "Loaded boConfig:", boConfig);
    
    // Default Product Type
    if (boConfig?.productType) {
      console.log("[useProductForm] Pre-selecting Product Type from config:", boConfig.productType);
      form.setValue("typeId", String(boConfig.productType), { shouldValidate: true });
    }

    // Default VAT % (applies to both Purchase VAT and Sales VAT)
    if (boConfig?.vatId) {
      console.log("[useProductForm] Pre-selecting VAT % from config:", boConfig.vatId);
      form.setValue("pVatId", String(boConfig.vatId), { shouldValidate: true });
      form.setValue("sVatId", String(boConfig.vatId), { shouldValidate: true });
    }

    // Default Unit ('nos')
    if (masterData?.unit) {
      const nosUnit = masterData.unit.find(u => u.name.toLowerCase() === 'nos' || u.name.toLowerCase().includes('nos'));
      if (nosUnit && !form.getValues("unitId")) {
        form.setValue("unitId", String(nosUnit.id), { shouldValidate: true });
      }
    }
  }, [backofficeConfigList, masterData, productId, form]);

  // Load existing data into form
  useEffect(() => {
    if (existingData?.product) {
      const p = Array.isArray(existingData.product) ? existingData.product[0] : existingData.product;
      if (!p) return;
      const dec = parseInt(localStorage.getItem("decimalPart") || "3", 10);
      form.reset({
        productId: p.productId,
        code: p.code,
        name: p.name,
        arabicName: p.arabicName || "",
        categoryId: String(p.categoryId),
        subCatId: p.subCatId ? String(p.subCatId) : "",
        branchId: String(p.branchId || currentBranchId),
        groupId: String(p.groupId),
        typeId: String(p.typeId),
        unitId: String(p.unitId),
        pVatId: String(p.pVatId),
        sVatId: String(p.sVatId),
        cost: Number(p.cost).toFixed(dec),
        price: Number(p.price).toFixed(dec),
        barcode: p.barcode || "",
        colorCode: p.colorCode || "#49293e",
        isActive: p.isActive,
        priceIsIncl: p.priceIsIncl,
        fileName: (p as any).fileName || "",
        fileUrl: p.fileUrl || p.filePath || (p as any).imageUrl || "",
        filePath: p.filePath || "",
        imageUrl: (p as any).imageUrl || p.fileUrl || p.filePath || "",
        altProducts: existingData.altProducts?.map(a => ({
          unitId: String(a.unitId),
          barcode: a.barcode || "",
          isIncl: a.isIncl,
          price: Number(a.price).toFixed(dec),
          altName: a.altName || "",
          altArabic: a.altArabic || "",
          branchId: String(a.branchId)
        })) || [],
        productColors: existingData.productColors?.map(c => ({
          branchId: String(c.branchId),
          colorCode: c.colorCode || "#49293e"
        })) || [],
        openingStocks: existingData.openingStocks?.map(o => ({
          unitId: String(o.unitId),
          qty: String(Number(o.qty) || 0),
          cost: Number(o.cost).toFixed(dec),
          amount: Number(o.amount).toFixed(dec),
          baseQty: String(Number(o.baseQty) || 0),
          branchId: String(o.branchId)
        })) || []
      });

      const rawImage = p.fileUrl || p.filePath || (p as any).imageUrl || (p as any).imagePath || "";
      const resolved = resolveImageUrl(rawImage);
      setImagePreview(resolved);
      setImageFile(null);
      setIsImageChanged(false);

      if (resolved) {
        const testImg = new Image();
        testImg.onerror = () => {
          setImagePreview((prev) => (prev === resolved ? "" : prev));
        };
        testImg.src = resolved;
      }
    }
  }, [existingData, form, currentBranchId]);

  const handleResetForm = async () => {
    const dec = parseInt(localStorage.getItem("decimalPart") || "3", 10);
    const boConfig = backofficeConfigList && backofficeConfigList.length > 0 ? backofficeConfigList[0] : null;

    let defaultTypeId = "";
    if (boConfig?.productType) {
      defaultTypeId = String(boConfig.productType);
    }
    let defaultVatId = "";
    if (boConfig?.vatId) {
      defaultVatId = String(boConfig.vatId);
    }
    let defaultUnitId = "";
    if (masterData?.unit) {
      const nosUnit = masterData.unit.find(u => u.name.toLowerCase() === 'nos' || u.name.toLowerCase().includes('nos'));
      if (nosUnit) {
        defaultUnitId = String(nosUnit.id);
      }
    }

    let nextBarcode = "";
    try {
      nextBarcode = await productService.getNextBarcode();
    } catch (err) {
      console.error("Failed to generate next barcode on reset", err);
    }

    form.reset({
      productId: undefined,
      code: nextBarcode,
      name: "",
      arabicName: "",
      categoryId: "",
      subCatId: "",
      branchId: String(currentBranchId),
      groupId: "",
      typeId: defaultTypeId,
      unitId: defaultUnitId,
      pVatId: defaultVatId,
      sVatId: defaultVatId,
      cost: (0).toFixed(dec),
      price: (0).toFixed(dec),
      barcode: nextBarcode,
      colorCode: "#49293e",
      isActive: true,
      priceIsIncl: false,
      fileName: "",
      fileUrl: "",
      filePath: "",
      altProducts: [],
      productColors: [],
      openingStocks: []
    });
    setImageFile(null);
    setImagePreview("");
    setIsImageChanged(false);
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const activeProductId = productId || data.productId || (existingData?.product?.productId) || 0;

      const payload: any = {
        code: data.code,
        barcode: data.barcode,
        name: data.name,
        arabicName: data.arabicName || "",
        categoryId: Number(data.categoryId) || 0,
        subCatId: Number(data.subCatId) || 0,
        groupId: Number(data.groupId) || 0,
        typeId: Number(data.typeId) || 0,
        unitId: Number(data.unitId) || 0,
        pVatId: Number(data.pVatId) || 0,
        sVatId: Number(data.sVatId) || 0,
        cost: Number(data.cost) || 0,
        price: Number(data.price) || 0,
        priceIsIncl: data.priceIsIncl,
        branchId: Number(data.branchId) || currentBranchId,
        isActive: data.isActive,
        colorCode: data.colorCode || "#49293e",
        altProducts: data.altProducts.map(a => ({
          unitId: Number(a.unitId),
          barcode: a.barcode || "",
          isIncl: a.isIncl,
          price: Number(a.price),
          altName: a.altName || "",
          altArabic: a.altArabic || "",
          branchId: Number(a.branchId) || currentBranchId
        })),
        productColors: data.productColors.map(c => ({
          branchId: Number(c.branchId) || currentBranchId,
          colorCode: c.colorCode || "#49293e"
        })),
        openingStocks: (data.openingStocks || []).map(o => {
          const unitObj = masterData?.unit?.find(u => String(u.id) === String(o.unitId));
          const uVal = unitObj?.currentvalue !== undefined && unitObj?.currentvalue !== null ? Number(unitObj.currentvalue) : 1;
          const q = Number(o.qty) || 0;
          const c = Number(o.cost) || 0;
          return {
            unitId: Number(o.unitId),
            qty: q,
            cost: c,
            amount: q * c,
            baseQty: q * (isNaN(uVal) ? 1 : uVal),
            branchId: Number(o.branchId) || currentBranchId
          };
        })
      };

      if (activeProductId > 0) {
        payload.productId = activeProductId;
        payload.updatedAt = new Date().toISOString();
        payload.isImageChanged = isImageChanged;
        payload.imageFile = imageFile;
        console.log("Submitting PUT payload to productService:", payload);

        await productService.update(activeProductId, payload);
        return { id: activeProductId };
      } else {
        payload.createdAt = new Date().toISOString();
        payload.imageFile = imageFile;
        console.log("Submitting POST payload to productService:", payload);
        return productService.create(payload);
      }
    },
    onSuccess: async () => {
      showToast("Product saved successfully!", "success", "Success");
      queryClient.invalidateQueries({ queryKey: ["productsList"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["productClosingStock"] });
      queryClient.invalidateQueries({ queryKey: ["productAverageCost"] });
      queryClient.invalidateQueries({ queryKey: ["productList"] });
      queryClient.invalidateQueries({ queryKey: ["stockRegisterReport"] });
      queryClient.invalidateQueries({ queryKey: ["pos"] });
      notifyPosMenuUpdated("product");

      if (productId) {
        navigate("/dashboard/products");
      } else {
        await handleResetForm();
      }
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to save product", "error", "Error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productService.delete(id),
    onSuccess: () => {
      showToast("Product deleted successfully", "success", "Success");
      queryClient.invalidateQueries({ queryKey: ["productsList"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["productClosingStock"] });
      queryClient.invalidateQueries({ queryKey: ["productAverageCost"] });
      queryClient.invalidateQueries({ queryKey: ["productList"] });
      queryClient.invalidateQueries({ queryKey: ["stockRegisterReport"] });
      queryClient.invalidateQueries({ queryKey: ["pos"] });
      notifyPosMenuUpdated("product");
      navigate("/dashboard/products");
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to delete product", "error", "Error");
    }
  });

  // Handle Alt Product Appending with Auto Barcode
  const handleAddAltProduct = async (unitId: string) => {
    let barcode = "";
    try {
      barcode = await productService.getNextBarcode();
    } catch (e) {
      console.error("Failed to generate alt barcode", e);
    }
    altProductsField.append({
      unitId,
      barcode,
      isIncl: form.getValues("priceIsIncl"),
      price: (0).toFixed(parseInt(localStorage.getItem("decimalPart") || "3", 10)),
      altName: "",
      altArabic: "",
      branchId: String(currentBranchId)
    });
  };

  return {
    form,
    masterData: effectiveMasterData,
    branches,
    subCategories,
    altProductsField,
    isLoading: isLoadingMaster || (!!productId && isLoadingExisting),
    isSubCategoryLoading: isLoadingSubs,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    imagePreview,
    setImageFile: handleImageSelect,
    handleImageSelect,
    setImagePreview,
    isImageChanged,
    saveMutation,
    deleteMutation,
    handleAddAltProduct,
    handleResetForm,
    currentBranchId
  };
};




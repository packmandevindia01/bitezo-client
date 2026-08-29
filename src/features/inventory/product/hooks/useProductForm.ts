import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productSchema } from "../schema/productSchema";
import type { ProductFormData } from "../schema/productSchema";
import { productService } from "../services/productService";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import { fetchGlobalMasterData } from "../../shared/store/masterDataSlice";
import { subCategoryApi } from "../../subcategory/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../../app/providers/useToast";
import { getConfig } from "../../../../config";
import { backofficeConfigApi } from "../../../general/configuration/services/backofficeConfigApi";





export const useProductForm = (productId?: number) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const auth = useAppSelector((state: any) => state.auth);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>();

  // Global Master Data (branches, etc.)
  const dispatch = useAppDispatch();
  const { masterData: globalMasterData, branches } = useAppSelector((state: any) => state.masterData);

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
    queryFn: () => productService.loadMasterData()
  });

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

  // Manage local image preview URL and memory cleanup
  useEffect(() => {
    if (!imageFile) {
      let path = existingData?.product?.fileUrl || existingData?.product?.filePath;
      if (path && path !== "string") {
        // Normalize backslashes to forward slashes
        path = path.replace(/\\/g, "/");
        let fullUrl = "";
        if (path.startsWith("http://") || path.startsWith("https://")) {
          fullUrl = path;
        } else {
          let apiOrigin = "";
          try {
            const rawApi = getConfig().apiBaseUrl;
            apiOrigin = rawApi.startsWith("http") 
              ? new URL(rawApi).origin 
              : window.location.origin;
          } catch {
            apiOrigin = window.location.origin;
          }
          const cleanPath = path.startsWith("/") ? path : `/${path}`;
          fullUrl = `${apiOrigin}${cleanPath}`;
        }
        console.log("[useProductForm] Product ID:", productId, "Existing image URL:", fullUrl);
        setImagePreview(fullUrl);
      } else {
        setImagePreview("");
      }
    } else {
        const objectUrl = URL.createObjectURL(imageFile);
        setImagePreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }
  }, [imageFile, existingData, productId]);

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
      const p = existingData.product;
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
        fileUrl: p.fileUrl || p.filePath || "",
        filePath: p.filePath || "",
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
    }
  }, [existingData, form, currentBranchId]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const activeProductId = productId || data.productId || (existingData?.product?.productId) || 0;
      const rawPath = existingData?.product?.filePath || existingData?.product?.fileUrl || data.filePath || "";
      const cleanOldPath = (!rawPath || rawPath === "string") 
        ? "string" 
        : (rawPath.startsWith("http") ? new URL(rawPath).pathname : rawPath).replace(/\\/g, "/");

      const payload: any = {
        code: data.code,
        barcode: data.barcode,
        name: data.name,
        arabicName: data.arabicName || "",
        categoryId: Number(data.categoryId),
        subCatId: Number(data.subCatId),
        groupId: Number(data.groupId),
        typeId: Number(data.typeId),
        unitId: Number(data.unitId),
        pVatId: Number(data.pVatId),
        sVatId: Number(data.sVatId),
        cost: Number(data.cost),
        price: Number(data.price),
        priceIsIncl: data.priceIsIncl,
        branchId: Number(data.branchId),
        isActive: data.isActive,
        colorCode: data.colorCode || "#49293e",
        filePath: cleanOldPath !== "string" ? cleanOldPath : (data.filePath || undefined),
        fileUrl: existingData?.product?.fileUrl || data.fileUrl || undefined,
        altProducts: data.altProducts.map(a => ({
          unitId: Number(a.unitId),
          barcode: a.barcode || "",
          isIncl: a.isIncl,
          price: Number(a.price),
          altName: a.altName || "",
          altArabic: a.altArabic || "",
          branchId: Number(a.branchId)
        })),
        productColors: data.productColors.map(c => ({
          branchId: Number(c.branchId),
          colorCode: c.colorCode
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
            branchId: Number(o.branchId)
          };
        })
      };

      if (activeProductId > 0) {
        payload.productId = activeProductId;
        payload.updatedAt = new Date().toISOString();
        console.log("Submitting PUT payload to API:", JSON.stringify(payload, null, 2));

        await productService.update(activeProductId, { 
          ...payload, 
          imageFile: imageFile || undefined,
          oldPath: cleanOldPath
        });
        return { id: activeProductId };
      } else {
        payload.createdAt = new Date().toISOString();
        console.log("Submitting POST payload to API:", JSON.stringify(payload, null, 2));
        return productService.create({ 
          ...payload, 
          imageFile: imageFile || undefined 
        });
      }
    },
    onSuccess: () => {
      showToast("Product saved successfully!", "success", "Success");
      queryClient.invalidateQueries({ queryKey: ["productsList"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["productClosingStock"] });
      queryClient.invalidateQueries({ queryKey: ["productAverageCost"] });
      navigate("/dashboard/product");
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
      navigate("/dashboard/product");
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
    masterData,
    branches,
    subCategories,
    altProductsField,
    isLoading: isLoadingMaster || (!!productId && isLoadingExisting),
    isSubCategoryLoading: isLoadingSubs,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    imagePreview,
    setImageFile,
    setImagePreview,
    saveMutation,
    deleteMutation,
    handleAddAltProduct,
    currentBranchId
  };
};




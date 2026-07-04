import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productSchema } from "../schema/productSchema";
import type { ProductFormData } from "../schema/productSchema";
import { productService } from "../services/productService";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import { fetchGlobalMasterData } from "../../shared/store/masterDataSlice";
import { subCategoryService } from "../../subcategory/services/subCategoryService";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../../app/providers/useToast";

export const useProductForm = (productId?: number) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const auth = useAppSelector((state: any) => state.auth);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      productId: undefined,
      code: "",
      name: "",
      arabicName: "",
      categoryId: "",
      subCatId: "",
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
      productColors: []
    }
  });

  const altProductsField = useFieldArray({
    control: form.control,
    name: "altProducts"
  });

  // Global Master Data (branches, etc.)
  const dispatch = useAppDispatch();
  const { masterData: globalMasterData, branches } = useAppSelector((state: any) => state.masterData);

  let currentBranchId = auth?.activeBranchId || auth?.branchId || Number(localStorage.getItem("branchId"));
  if (!currentBranchId || Number(currentBranchId) === 0) {
    currentBranchId = branches && branches.length > 0 ? branches[0].id : 1;
  }
  currentBranchId = Number(currentBranchId);

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
      const subs = await subCategoryService.getSubCategories(undefined, undefined, catId);
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
      let path = existingData?.product?.filePath;
      if (path && path !== "string") {
        // Normalize backslashes to forward slashes
        path = path.replace(/\\/g, "/");
        // If absolute URL points to backend server, strip it to go through local proxy
        if (path.startsWith("http://84.255.173.131:8068")) {
          path = path.replace("http://84.255.173.131:8068", "");
        }
        // If already an absolute URL, use it directly. Otherwise prepend base URL.
        const fullUrl = path.startsWith("http://") || path.startsWith("https://")
          ? path
          : `${window.location.origin}${path}`;
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

  // Generate Base Barcode on Mount (if creating new)
  useEffect(() => {
    if (!productId) {
      productService.getNextBarcode().then(barcode => {
        if (!form.getValues("barcode")) {
          form.setValue("barcode", barcode, { shouldValidate: true });
        }
      }).catch(err => console.error("Failed to generate base barcode", err));
    }
  }, [productId, form]);

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
        subCatId: String(p.subCatId),
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
        fileName: p.fileName,
        fileUrl: p.filePath,
        filePath: p.filePath,
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
        })) || []
      });

      // Preload existing image from server as File to prevent backend from clearing it on PUT
      const path = p.filePath;
      if (path && path !== "string") {
        let normalizedPath = path.replace(/\\/g, "/");
        if (normalizedPath.startsWith("http://84.255.173.131:8068")) {
          normalizedPath = normalizedPath.replace("http://84.255.173.131:8068", "");
        }
        const fullUrl = normalizedPath.startsWith("http")
          ? normalizedPath
          : `${window.location.origin}${normalizedPath}`;

        fetch(fullUrl)
          .then(res => res.blob())
          .then(blob => {
            const fileName = normalizedPath.split("/").pop() || "image.jpg";
            const file = new File([blob], fileName, { type: blob.type });
            setImageFile(file);
          })
          .catch(err => console.error("Failed to preload existing image file", err));
      }
    }
  }, [existingData, form]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload: any = {
        code: data.code,
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
        barcode: data.barcode,
        branchId: currentBranchId,
        isActive: data.isActive,
        priceIsIncl: data.priceIsIncl,
        colorCode: data.colorCode,
        fileName: data.fileUrl ? data.fileUrl.split("/").pop() || "" : data.fileName || "",
        fileUrl: data.fileUrl,
        filePath: data.filePath ? (data.filePath.startsWith("http") ? new URL(data.filePath).pathname : data.filePath).replace(/\\/g, "/") : "",
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
        oldPath: data.filePath ? (data.filePath.startsWith("http") ? new URL(data.filePath).pathname : data.filePath).replace(/\\/g, "/") : "string"
      };

      console.log("Submitting payload to API:", JSON.stringify(payload, null, 2));

      if (data.productId) {
        payload.productId = data.productId;
        payload.updatedAt = new Date().toISOString();
        await productService.update(data.productId, { ...payload, imageFile: imageFile || undefined });
        return { id: data.productId };
      } else {
        payload.createdAt = new Date().toISOString();
        return productService.create({ ...payload, imageFile: imageFile || undefined });
      }
    },
    onSuccess: () => {
      showToast("Product saved successfully!", "success", "Success");
      queryClient.invalidateQueries({ queryKey: ["productsList"] });
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
    handleAddAltProduct
  };
};

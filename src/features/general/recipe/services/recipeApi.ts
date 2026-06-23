/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RecipePayload } from "../types";

// Dummy API implementation for Recipe until actual endpoints are available
export const recipeApi = {
  getBranchList: async () => {
    // Return dummy data
    return [
      { branchId: 1, branchName: "Main Branch" },
      { branchId: 2, branchName: "Secondary Branch" },
    ];
  },

  getFinishedProductListByName: async (productName: string) => {
    return [
      { productId: 101, productName: "Special Burger", code: "SB001", barcode: "123456" },
      { productId: 102, productName: "Classic Pizza", code: "CP002", barcode: "234567" },
    ];
  },

  getRawMaterialProductListByName: async (productName: string) => {
    return [
      { productId: 201, productName: "Burger Bun", code: "RM001", barcode: "345678" },
      { productId: 202, productName: "Beef Patty", code: "RM002", barcode: "456789" },
      { productId: 203, productName: "Cheese Slice", code: "RM003", barcode: "567890" },
    ];
  },

  getProductCostData: async (barcode: string) => {
    // Dummy cost data
    return {
      productId: 201,
      productCode: barcode,
      productName: "Dummy Material",
      baseUnitId: 1,
      cost: 2.5,
      altUnitId: 2,
      vatId: 1,
      vatName: "Standard",
      vatValue: 5,
      unitCategory: "Weight",
    };
  },

  getUnitListByName: async (unitCategory: string) => {
    return [
      { unitId: 1, name: "Kg" },
      { unitId: 2, name: "Gram" },
      { unitId: 3, name: "Pcs" },
    ];
  },

  getRecipeById: async (transId: number) => {
    return {
      masterData: {
        branchId: 1,
        productId: 101,
        unitId: 3,
        qty: 1,
      },
      detailsData: [
        {
          productId: 201,
          productName: "Burger Bun",
          barcode: "345678",
          unitId: 3,
          unitName: "Pcs",
          qty: 1,
          cost: 0.5,
          amount: 0.5,
        },
        {
          productId: 202,
          productName: "Beef Patty",
          barcode: "456789",
          unitId: 3,
          unitName: "Pcs",
          qty: 1,
          cost: 1.5,
          amount: 1.5,
        }
      ]
    };
  },

  createRecipe: async (payload: RecipePayload) => {
    console.log("DUMMY API: createRecipe payload:", payload);
    return { success: true, message: "Recipe created successfully" };
  },

  updateRecipe: async (transId: number, payload: RecipePayload) => {
    console.log("DUMMY API: updateRecipe id:", transId, "payload:", payload);
    return { success: true, message: "Recipe updated successfully" };
  },

  getRecipeList: async () => {
    return [
      { transId: 1, transDate: new Date().toISOString(), productName: "Special Burger", branchName: "Main Branch", totalAmount: 2.0 },
      { transId: 2, transDate: new Date().toISOString(), productName: "Classic Pizza", branchName: "Main Branch", totalAmount: 4.5 },
    ];
  },

  deleteRecipe: async (transId: number) => {
    console.log("DUMMY API: deleteRecipe id:", transId);
    return { success: true, message: "Recipe deleted successfully" };
  }
};

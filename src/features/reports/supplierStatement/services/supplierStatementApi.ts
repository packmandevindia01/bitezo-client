import axiosInstance from "../../../../api/axiosInstance";
import type { SupplierStatementParams, SupplierStatementResponse } from "../types";


export const fetchSupplierStatement = async (
    params: SupplierStatementParams
): Promise<SupplierStatementResponse> => {
    const response = await axiosInstance.get<SupplierStatementResponse>(
        "/reports/supplier-statement", { params }
    );
    return response.data;
}
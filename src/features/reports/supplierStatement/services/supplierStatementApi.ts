import axiosInstance from "../../../../api/axiosInstance";
import type { SupplierStatementParams, SupplierStatementResponse } from "../types";
import { assertReportSuccess } from "../../framework/reportResponse";


export const fetchSupplierStatement = async (
    params: SupplierStatementParams
): Promise<SupplierStatementResponse> => {
    const response = await axiosInstance.get<SupplierStatementResponse>(
        "/reports/supplier-statement", { params }
    );
    assertReportSuccess(response.data);
    return response.data;
}
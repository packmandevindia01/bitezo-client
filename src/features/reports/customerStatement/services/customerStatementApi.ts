import axiosInstance from "../../../../api/axiosInstance";
import type { CustomerStatementParams, CustomerStatementResponse } from "../types";


export const fetchCustomerStatement = async (
    params: CustomerStatementParams
): Promise<CustomerStatementResponse> => {
    const response = await axiosInstance.get<CustomerStatementResponse>(
        "/reports/customer-statement", { params }
    );
    return response.data;
}

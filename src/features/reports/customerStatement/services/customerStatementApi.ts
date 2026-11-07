import axiosInstance from "../../../../api/axiosInstance";
import type { CustomerStatementParams, CustomerStatementResponse } from "../types";
import { assertReportSuccess } from "../../framework/reportResponse";


export const fetchCustomerStatement = async (
    params: CustomerStatementParams
): Promise<CustomerStatementResponse> => {
    const response = await axiosInstance.get<CustomerStatementResponse>(
        "/reports/customer-statement", { params }
    );
    assertReportSuccess(response.data);
    return response.data;
}

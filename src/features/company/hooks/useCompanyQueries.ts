import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchCompanyMasterload, fetchCurrencyList, createCompany } from "../services/companyApi";
import type { CompanyFormValues } from "../schemas";

export const useCompanyMasterData = (clientDb: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["companyMasterData", clientDb],
    queryFn: async () => {
      const [masterData, currencyData] = await Promise.all([
        fetchCompanyMasterload(clientDb),
        fetchCurrencyList(clientDb)
      ]);
      return { masterData, currencyData };
    },
    enabled: enabled && !!clientDb,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useCreateCompany = () => {
  return useMutation({
    mutationFn: ({ data, clientDb, tempToken }: { data: CompanyFormValues; clientDb: string; tempToken: string }) => 
      createCompany(data, clientDb, tempToken),
  });
};

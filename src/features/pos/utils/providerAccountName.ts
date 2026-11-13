import { fetchProviderAccounts } from "../../general/provider/services/providerService";

/**
 * The name of a provider's post account (its customer on a provider order), e.g. 1 → "CASH CUSTOMER", 5 → "Rahul".
 * /menu/providers gives only the account id; GET /provider/account-list (readable with the POS login) gives the names.
 * The list is loaded once per page and kept; a failed load is retried next time.
 */
let accountsPromise: Promise<Map<number, string>> | null = null;

const loadAccounts = (): Promise<Map<number, string>> => {
  if (!accountsPromise) {
    accountsPromise = fetchProviderAccounts()
      .then((list) => new Map((list || []).map((a: any) => [Number(a.customerId ?? a.accountId ?? a.id), String(a.customerName ?? a.accountName ?? a.name ?? "")] as [number, string])))
      .catch(() => {
        accountsPromise = null;
        return new Map<number, string>();
      });
  }
  return accountsPromise;
};

export const providerAccountName = async (accountId?: number | null): Promise<string> => {
  const id = Number(accountId);
  if (!id) return "";
  return (await loadAccounts()).get(id) || "";
};

/** Tests only. */
export const resetProviderAccountNames = () => {
  accountsPromise = null;
};

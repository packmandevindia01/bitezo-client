// No imports needed

export const useBranchScope = () => {
  const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
  const globalBranchId = isBackofficeMode 
    ? sessionStorage.getItem("backoffice_activeBranchId") 
    : localStorage.getItem("activeBranchId");
  
  // The API returns 'All' branch with an ID of 1.
  // Any branch ID other than 1 means the scope is locked to a specific branch.
  const isBranchLocked = globalBranchId !== null && Number(globalBranchId) !== 1;
  const initialBranchId = globalBranchId !== null ? globalBranchId : "1";

  return { isBranchLocked, initialBranchId };
};

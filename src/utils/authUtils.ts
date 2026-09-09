export const clearAuthStorage = () => {
  sessionStorage.removeItem("backoffice_accessToken");
  sessionStorage.removeItem("backoffice_refreshToken");
  sessionStorage.removeItem("backoffice_userId");
  sessionStorage.removeItem("backoffice_userName");
  sessionStorage.removeItem("backoffice_isMaster");
  sessionStorage.removeItem("backoffice_branchId");
  sessionStorage.removeItem("backoffice_activeBranchId");
  sessionStorage.removeItem("backoffice_userRoles");
  sessionStorage.removeItem("backoffice_sessionExpiresAt");

  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("isMaster");
  localStorage.removeItem("branchId");
  localStorage.removeItem("activeBranchId");
  localStorage.removeItem("userRoles");
  localStorage.removeItem("sessionExpiresAt");
};

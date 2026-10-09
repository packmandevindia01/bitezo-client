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

export const isBackofficeMode = (): boolean => {
  const temp = sessionStorage.getItem("tempSystemType");
  const system = localStorage.getItem("systemType");
  if (temp === "backoffice" || system === "backoffice") return true;
  if (temp === "pos" || system === "pos") return false;
  return !!sessionStorage.getItem("backoffice_accessToken");
};

export const getStoredAccessToken = (): string | null => {
  const backoffice = isBackofficeMode();
  let token = backoffice
    ? sessionStorage.getItem("backoffice_accessToken")
    : localStorage.getItem("accessToken");

  if (!token) {
    token =
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("backoffice_accessToken") ||
      localStorage.getItem("backoffice_accessToken");
  }

  return token;
};

export const getStoredRefreshToken = (): string | null => {
  const backoffice = isBackofficeMode();
  let token = backoffice
    ? sessionStorage.getItem("backoffice_refreshToken")
    : localStorage.getItem("refreshToken");

  if (!token) {
    token =
      localStorage.getItem("refreshToken") ||
      sessionStorage.getItem("backoffice_refreshToken") ||
      localStorage.getItem("backoffice_refreshToken");
  }

  return token;
};

export const updateAuthTokens = ({
  accessToken,
  refreshToken,
  sessionExpiresAt,
}: {
  accessToken: string;
  refreshToken?: string;
  sessionExpiresAt?: string;
}) => {
  const backoffice = isBackofficeMode();

  if (backoffice) {
    sessionStorage.setItem("backoffice_accessToken", accessToken);
    if (refreshToken) {
      sessionStorage.setItem("backoffice_refreshToken", refreshToken);
    }
    if (sessionExpiresAt) {
      sessionStorage.setItem("backoffice_sessionExpiresAt", sessionExpiresAt);
    }
  } else {
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
    if (sessionExpiresAt) {
      localStorage.setItem("sessionExpiresAt", sessionExpiresAt);
    }
  }

  window.dispatchEvent(
    new CustomEvent("auth:token-refreshed", {
      detail: { accessToken, refreshToken, sessionExpiresAt },
    })
  );
};


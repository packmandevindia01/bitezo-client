export interface AppConfig {
  apiBaseUrl: string;
}

let config: AppConfig | null = null;

export const loadConfig = async (): Promise<AppConfig> => {
  if (config) return config;

  try {
    // Cache busting with a timestamp so the browser doesn't cache an old config
    const response = await fetch(`/config.json?t=${new Date().getTime()}`);
    if (!response.ok) {
      throw new Error("Failed to load runtime config");
    }
    config = await response.json();

    return config!;
  } catch (error) {
    console.error("[Config] Error loading config, falling back to env:", error);
    // Fallback to build-time env if the file is missing or broken
    config = {
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api"
    };
    return config;
  }
};

export const getConfig = (): AppConfig => {
  if (!config) {
    // This should theoretically not happen if main.tsx loads it first
    return {
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api"
    };
  }
  return config;
};

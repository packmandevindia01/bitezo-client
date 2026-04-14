import type { LoginResponse } from "../types";

export const loginApi = async (username: string, password: string, clientDb = "app_db") => {
  const res = await fetch(
    `http://84.255.173.131:8068/api/auth/login?clientDb=${encodeURIComponent(clientDb)}`,
    {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    }
  );

  if (!res.ok) {
    const message = (await res.text().catch(() => "")) || `HTTP error: ${res.status}`;
    throw new Error(message);
  }

  return (await res.json()) as LoginResponse;
};

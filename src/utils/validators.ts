// utils/validators.ts

export const isRequired = (value: string) =>
  value.trim() !== "";

export const isValidEmail = (email: string) =>
  /\S+@\S+\.\S+/.test(email);
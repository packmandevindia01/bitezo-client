export const isRequired = (value: string) =>
  value.trim() !== "";

export const isValidEmail = (email: string) =>
  /\S+@\S+\.\S+/.test(email);

export const isValidMobile = (value: string) =>
  /^[0-9]{7,15}$/.test(value);

export const isNumber = (value: string) =>
  !isNaN(Number(value));

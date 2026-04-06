export interface User {
  id: number;
  name: string;
  email: string;
  branch: string;
  active: boolean;
  isMaster: boolean;
}

export interface UserFormData {
  name: string;
  password: string;
  confirmPassword: string;
  email: string;
  branch: string;
  active: boolean;
  isMaster: boolean;
}


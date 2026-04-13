export interface EmployeeRecord {
  id: number;
  name: string;
  code: string;
  branch: string;
  branchId?: number;
  driver: boolean;
  active: boolean;
  isMaster: boolean;
}

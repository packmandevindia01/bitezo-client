// ─── Public surface of this module ──────────────────────────────────────

export { default } from './pages/EmployeePage';
export { employeeService } from './services/employeeService';
export { notifyEmployeesUpdated, subscribeToEmployeeUpdates } from './utils/employeeSync';
export type * from './types';

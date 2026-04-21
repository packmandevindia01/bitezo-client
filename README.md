# Bitezo - Modern POS & Enterprise Management Platform

![Bitezo Logo](/bitezo-logo-hq.png)

Bitezo is a state-of-the-art, high-performance **Point of Sale (POS)** and **Enterprise Resource Planning (ERP)** solution. Designed with a "Premium-First" aesthetic, it empowers businesses to manage complex restaurant operations, multi-branch inventories, and deep analytics through a unified, high-fidelity interface.

---

## 🚀 Technology Stack

Bitezo is built on a cutting-edge frontend architecture designed for 0ms latency and high scalability.

- **Foundational**: [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/) + [TypeScript 5.9](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Custom UI Design System)
- **State Architecture**: [Redux Toolkit](https://redux-toolkit.js.org/) + [React-Redux 9](https://react-redux.js.org/)
- **Routing**: [React Router v7](https://reactrouter.com/) (Standalone & Layout-driven)
- **Networking**: [Axios](https://axios-http.com/) (Centralized Multi-Tenant Instance)
- **Visualization**: [Recharts](https://recharts.org/) & [Lucide React](https://lucide.dev/)
- **Performance**: [React Virtual](https://tanstack.com/virtual/v3) for high-denisty data grids.

---

## ✨ Core Feature Modules

### 1. 🖥️ POS Terminal (The Heart of Operation)
A high-fidelity, full-screen terminal optimized for speed and operator precision.
- **Order Management**: Support for Dine-In, Takeaway, Drive-Thru, Delivery, and Provider modes.
- **Hardware Ready**: Native integration with Barcode Scanners and HID devices.
- **Keyboard Power**: Extensive hotkey support for clear-cart, hold-ticket, and fast-checkout.
- **Dynamic Calculation**: Real-time tax (VAT), discounting, and multi-tender type processing.

### 2. 🍽️ Order Master
A specialized suite of tools for fine-tuning dining experiences.
- **Floor Planning**: Manage Sections (Floors, VIP, Terrace) and Table allocations.
- **Menu Customization**: 
    - **Modifiers**: Add cooking instructions or set-menu variations.
    - **Extras**: Define add-ons (Extra Cheese, Side Salads) with inventory linkage.
- **Kitchen Flow**: Integration paths for KOT (Kitchen Order Ticket) series management.

### 3. 📦 Inventory & Logistics
Advanced control over global products and branch-specific variants.
- **Matrix Management**: Categories, Subcategories, Groups, and Units.
- **Product Master**: Manage base products with individual branch-level overrides.
- **Voucher Series**: Multi-tenant voucher sequencing for Sale, Purchase, Receipt, and Payment flows.
- **Taxation**: Localized VAT/Tax rule engine integrated into every transaction.

### 4. 👥 General Management
The foundational data layer of the enterprise.
- **HRM**: Detailed Employee profiles with role-based routing.
- **CRM**: Customer loyalty tracking and transaction history.
- **Financials**: Multi-mode Payment options (Cash, Card, Digital wallets).
- **Security**: Granular User permissions and Multi-tenant database isolation.

---

## 🏗️ Architecture: Feature-Sliced Design

The project follows a modular, domain-driven structure. Instead of technical grouping (e.g., all components in one folder), code is grouped by **Feature Areas**.

```text
src/
├── api/                  # Centralized Axios logic & Interceptors
├── app/                  # Redux Store, App Providers & Global Routes
├── components/           # High-Fidelity Design System (Modals, Tables, Forms)
├── features/             # Feature-Specific Contexts (The "Brain")
│   ├── pos/              # High-Performance Terminal Logic
│   ├── general/          # Users, Employees, Customers, Counter, Section
│   ├── inventory/        # Product Matrix, Branches, Voucher Series
│   └── company/          # Multi-tenant Onboarding & Identity
└── utils/                # Standardized Formatters & Logic Helpers
```

### Centralized API Pattern
Bitezo employs a unified `axiosInstance` that automatically handles:
- **Tenant Isolation**: Injects `clientDb` into every request based on the logged-in context.
- **Authorization**: Manages Bearer tokens and session refresh logic.
- **Error Handling**: Standardized unwrap functions for predictable API responses.

---

## 🛠️ Developer Setup

### Prerequisites
- **Node.js**: Version 20+ recommended.
- **Package Manager**: NPM (standard).

### Setup & Run
1. **Clone & Install**:
   ```bash
   npm install
   ```
2. **Launch Development**:
   ```bash
   npm run dev
   ```
   *Terminal local access: `http://localhost:5173`*

3. **Build for Production**:
   ```bash
   npm run build
   ```
4. **Enforce Standards (Lint/Typecheck)**:
   ```bash
   npm run lint
   npm run build  # Triggers full TSC check
   ```

---

## 🔒 Security & Performance
- **RegistrationGuard**: Ensures only registered devices can access sensitive POS data.
- **Deferred Searching**: Optimized `useDeferredValue` hooks to ensure 60FPS UI performance during large product index searches.
- **React 19 Concurrency**: Utilizes the latest React features for non-blocking UI transitions.

---

*© 2026 Bitezo Platform. High-Fidelity Enterprise Management.*

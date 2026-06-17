# Bitezo - Modern POS & Enterprise Management Platform

![Bitezo Logo](/bitezo-logo-hq.png)

Bitezo is a state-of-the-art, high-performance **Cloud-Based Point of Sale (POS)** and **Backoffice Management SaaS**. Designed with a "Premium-First" aesthetic and multi-tenant architecture, it empowers businesses to manage complex restaurant operations, multi-branch inventories, and deep analytics through a unified, high-fidelity interface.

---

## 🚀 Technology Stack

Bitezo is built on a cutting-edge frontend architecture designed for 0ms latency, high scalability, and robust enterprise usage.

- **Foundational**: [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/) + [TypeScript 5.9](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Custom UI Design System with strict POS-specific rules)
- **State Architecture**: [Redux Toolkit](https://redux-toolkit.js.org/) + [React-Redux 9](https://react-redux.js.org/)
- **Routing**: [React Router v7](https://reactrouter.com/) (Standalone & Layout-driven)
- **Networking**: [Axios](https://axios-http.com/) (Centralized Multi-Tenant Instance with JWT Interceptors)
- **Visualization & UI**: [Recharts](https://recharts.org/) & [Lucide React](https://lucide.dev/)
- **Performance**: [React Virtual](https://tanstack.com/virtual/v3) for high-density data grids.
- **Offline Capabilities**: [Vite PWA](https://vite-pwa-org.netlify.app/) for Service Workers and offline network awareness.

---

## ✨ Core SaaS Modules

### 1. 🖥️ POS Terminal (The Heart of Operation)
A high-fidelity, full-screen terminal optimized for speed and operator precision on touch-screen devices.
- **Order Management**: Support for Dine-In, Takeaway, Drive-Thru, Delivery, and Provider modes.
- **Hardware Ready**: Native integration with Barcode Scanners and HID devices.
- **Keyboard Power**: Extensive hotkey support and strictly managed `tabIndex` flows for fast-checkout.
- **Dynamic Calculation**: Real-time tax (VAT), discounting, and multi-tender type processing.

### 2. 🍽️ Master Data & Configuration
A specialized suite of tools for fine-tuning dining and retail experiences.
- **Floor Planning**: Manage Sections (Floors, VIP, Terrace) and Table allocations.
- **Menu Customization**: 
    - **Modifiers**: Add cooking instructions or set-menu variations.
    - **Extras**: Define add-ons (Extra Cheese, Side Salads) with inventory linkage.
- **System Configuration**: Advanced settings for branch-level overrides, receipt printing formatting, and day-end processes.

### 3. 📦 Inventory & Logistics
Advanced control over global products and branch-specific variants.
- **Matrix Management**: Categories, Subcategories, Groups, and Units.
- **Product Master**: Manage base products with individual branch-level overrides.
- **Voucher Series**: Multi-tenant voucher sequencing for Sale, Purchase, Receipt, and Payment flows.

### 4. 👥 Enterprise Administration
The foundational data layer of the SaaS platform.
- **System Registration**: Device-level registration and binding for secure POS access.
- **Company Onboarding**: Multi-tenant database isolation and setup.
- **HRM & CRM**: Detailed Employee profiles with role-based routing (`RoleGuard`) and Customer loyalty tracking.

---

## 🏗️ Architecture: Feature-Sliced Design

The project follows a strict, domain-driven structure. Instead of technical grouping (e.g., all components in one folder), code is grouped by **Feature Areas** to ensure high maintainability.

```text
src/
├── api/                  # Centralized Axios logic & Interceptors
├── app/                  # Redux Store, App Providers & Global Routes
├── components/           # High-Fidelity Design System (Modals, Tables, Forms)
├── features/             # Feature-Specific Contexts (The "Brain")
│   ├── auth/             # Login, OTP, and Identity Management
│   ├── pos/              # High-Performance Terminal & Lock Logic
│   ├── general/          # Users, Employees, Configuration, Suppliers
│   ├── inventory/        # Product Matrix & Stock Control
│   ├── systemRegistration/ # Device and Tenant Binding
│   ├── transaction/      # Financial Vouchers & Adjustments
│   └── company/          # Multi-tenant Onboarding & Identity
├── hooks/                # Global Reusable Logic
└── utils/                # Standardized Formatters (e.g., Dynamic Currency)
```

### Strict UI & UX Standards
The frontend enforces rigorous rules to ensure a flawless experience:
- **Numeric Fields**: All currency and quantity fields are strictly right-aligned with dynamic decimal formatting based on local configuration.
- **Autofocus**: Every modal and page immediately focuses the primary input.
- **Responsive Layouts**: Designed to perfectly fit standard 1024x768 POS terminal screens without unnecessary vertical scrolling, while scaling gracefully to larger desktop monitors.
- **Custom Hooks**: Business logic is always extracted into feature-specific hooks (e.g., `useConfigurationManager`, `usePosTerminal`), keeping the UI layer "dumb" and strictly presentational.

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
- **RegistrationGuard & RoleGuard**: Ensures only registered devices and authorized roles can access sensitive POS data and backoffice settings.
- **API Interceptors**: Seamlessly handles Bearer tokens and automatically injects tenant contextual headers.
- **Deferred Searching**: Optimized `useDeferredValue` hooks to ensure 60FPS UI performance during large product index searches.

---

*© 2026 Bitezo Platform. High-Fidelity Enterprise SaaS Management.*

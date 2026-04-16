# Bitezo Admin Dashboard

Bitezo Admin is a modern, high-performance Point of Sale (POS) and Enterprise Dashboard application built to manage company onboarding, complex inventory matrices, employee routing, and daily analytics.

## 🚀 Tech Stack

- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management:** [Redux Toolkit (RTK)](https://redux-toolkit.js.org/)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Icons:** [Lucide React](https://lucide.dev/)

## ✨ Key Features

- **Authentication & Onboarding:** Secure JWT-based login flows with device-based guards (`RegistrationGuard`) connecting multi-tenant databases.
- **Inventory & Product Master:** Advanced Excel-style data grids to manage generic products and their barcode-specific branch variations (Alternatives).
- **Global Master Data Caching:** High-speed Redux architecture that caches foundational options (Categories, Subcategories, Units, VAT) for 0ms form rendering latencies.
- **Internationalization Ready:** Built-in multi-lingual column support (e.g., Native Arabic text mapping via RTL inputs).
- **Responsive Layout:** Dynamic UI optimized across devices using a customized Tailwind design system.

## 📁 Project Architecture

The architecture follows a strict **Feature-Sliced Design**. Code is decoupled into specific domains rather than grouping by file type.

```text
src/
├── api/                  # Global Axios instances and interceptors
├── app/                  # App-wide providers, Redux `store`, `hooks`, and Route guards
├── components/           # Generic UI components (Buttons, Modals, Forms, Tables)
├── features/             # Domain-specific logic 
│   ├── auth/             # Login, OTP, Password Reset, Auth Slice
│   ├── branches/         # Branch creation and localized management
│   ├── company/          # Initial tenant setup and configuration
│   ├── dashboard/        # Analytics, Sales Charts, and KPI cards
│   ├── employee/         # Staff CRUD operations
│   └── inventory/        # Products, Categories, Units, Taxes (VAT)
└── utils/                # Global helpers, formatters, and validators
```

## 🧠 State Management (Redux)

This application uses Redux Toolkit to manage complex global states without prop-drilling:
1. **`authSlice`**: Tracks the user's cross-tenant login credentials (`accessToken`, `isMaster`, `tenantId`) and company settings (e.g., currency `decimals`).
2. **`masterDataSlice`**: Employs `createAsyncThunk` to fetch inventory metadata *once* per session, allowing all deep feature forms to populate dropdowns instantly without duplicating network requests.

## 🛠️ Getting Started

### Prerequisites
Make sure you have Node.js installed (v18+ recommended).

### Installation

1. Clone the repository and navigate to the project root.
2. Install the core dependencies:
   ```bash
   npm install
   ```

### Running the Application

To start the Vite development server:
```bash
npm run dev
```
The application will boot up at `http://localhost:5173`.

### Build & Lint
To build for production (outputs to `dist/`):
```bash
npm run build
```

To run ESLint and check for static typing errors:
```bash
npm run lint
```

## 🔒 Environment Variables
Ensure you have the appropriate API target environments hooked up in your Vite proxy or `.env` files to connect to the Bitezo backend servers successfully.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

src/
│
├── app/                         # App-level setup
│   ├── store.ts
│   ├── hooks.ts
│
├── assets/                      # images, icons, logos
│
├── components/                  # reusable UI (global)
│   ├── common/
│   │   FormInput.tsx
│   │   SelectInput.tsx
│   │   Button.tsx
│   │   Checkbox.tsx
│   │   Table.tsx
│   │   StatusBadge.tsx
│   │   Modal.tsx
│   │   Loader.tsx
│   │   EmptyState.tsx
│   │   Pagination.tsx
│   │   SearchBar.tsx
│   │
│   ├── layout/
│   │   Sidebar.tsx
│   │   SidebarItem.tsx
│   │   SidebarDropdown.tsx
│   │   Topbar.tsx
│   │   Navbar.tsx
│   │   MainLayout.tsx
│
├── features/                    # 🔥 DOMAIN-BASED STRUCTURE
│
│   ├── auth/                   # 🔐 AUTH MODULE
│   │   ├── pages/
│   │   │   LoginPage.tsx
│   │   │   ForgotPassword.tsx
│   │   │   VerifyOtp.tsx
│   │   │   ResetPassword.tsx
│   │   │
│   │   ├── components/
│   │   │   LoginForm.tsx
│   │   │   EmailForm.tsx        # reusable email input
│   │   │   OtpForm.tsx          # reusable OTP input
│   │   │   ResetPasswordForm.tsx
│   │   │
│   │   ├── services/
│   │   │   authApi.ts           # login / otp / reset
│   │   │
│   │   ├── hooks/              # (optional but powerful)
│   │   │   useAuth.ts
│   │   │
│   │   ├── types.ts
│   │   └── constants.ts
│   │
│   ├── company/
│   │   ├── pages/
│   │   │   CompanyRegistration.tsx
│   │   ├── components/
│   │   │   CompanyForm.tsx      # 🔥 move form here
│   │   ├── services/
│   │   │   companyApi.ts
│   │   └── types.ts
│   │
│   ├── user/
│   │   ├── pages/
│   │   │   UserCreation.tsx
│   │   │   UserList.tsx
│   │   ├── components/
│   │   │   UserForm.tsx         # 🔥 reusable
│   │   │   UserTable.tsx
│   │   ├── services/
│   │   │   userApi.ts
│   │   └── types.ts
│   │
│   ├── sales/
│   ├── purchase/
│   ├── reports/
│   └── inventory/
│
├── routes/
│   └── AppRoutes.tsx
│
├── services/
│   └── axiosInstance.ts
│
├── types/
│   └── index.ts
│
├── utils/
│   ├── constants.ts
│   ├── helpers.ts
│   └── validators.ts           # 🔥 important
│
├── App.tsx
├── main.tsx
└── index.css

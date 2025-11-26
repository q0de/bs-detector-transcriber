# Frontend Technical Documentation

## Overview

The frontend is a **React 18** single-page application (SPA) built with **Vite** and **HeroUI** component library. It provides a modern, accessible user interface for video transcription, fact-checking, and analysis services. The application uses HeroUI components styled with **Tailwind CSS v4**.

## Technology Stack

### Core Framework
- **React**: `^18.2.0` - UI library
- **React DOM**: `^18.2.0` - DOM rendering
- **React Router DOM**: `^6.20.0` - Client-side routing

### Build Tools
- **Vite**: `^5.4.0` - Build tool and development server
- **@vitejs/plugin-react**: `^4.3.0` - React plugin for Vite

### UI Framework
- **HeroUI**: `^2.8.0` - Component library (built on Tailwind)
- **Tailwind CSS**: `^4.0.0` - Utility-first CSS framework
- **@tailwindcss/postcss**: `^4.0.0` - PostCSS plugin for Tailwind v4
- **Framer Motion**: `^11.9.0` - Animation library (required by HeroUI)
- **@heroui/use-theme**: `^2.0.0` - Theme management hook

### Icons & Utilities
- **@iconify/react**: `^5.0.0` - Icon library (Iconify)
- **usehooks-ts**: `^3.0.0` - React hooks collection
- **recharts**: `^2.12.0` - Charting library

### Third-Party Services
- **Supabase**: `^2.39.0` - Authentication and user management
- **Stripe**: `^2.2.0` & `^2.4.0` - Payment processing
- **Axios**: `^1.6.0` - HTTP client for API requests

## Project Structure

```
frontend/
├── index.html              # HTML template (Vite entry point)
├── vite.config.js          # Vite configuration
├── postcss.config.js       # PostCSS configuration
├── hero.ts                 # HeroUI theme configuration
├── package.json            # Dependencies and scripts
├── public/                 # Static assets
└── src/
    ├── index.jsx           # Application entry point
    ├── index.css           # Global styles (Tailwind directives)
    ├── App.jsx             # Main application component
    ├── providers.jsx       # HeroUI Provider setup
    ├── hooks/
    │   └── useTheme.js     # Dark/light theme hook
    ├── components/         # Reusable UI components
    │   ├── FeedbackButton.jsx
    │   ├── Navbar.jsx
    │   ├── ProcessingStatus.jsx
    │   ├── ProtectedRoute.jsx
    │   ├── UsageIndicator.jsx
    │   └── VideoProcessor.jsx
    ├── pages/              # Page-level components
    │   ├── AuthCallbackPage.jsx
    │   ├── DashboardPage.jsx
    │   ├── FreeTrialResultPage.jsx
    │   ├── HistoryPage.jsx
    │   ├── HomePage.jsx
    │   ├── LoginPage.jsx
    │   ├── PricingPage.jsx
    │   ├── ProfilePage.jsx
    │   ├── SettingsPage.jsx
    │   └── SignUpPage.jsx
    └── services/           # API and service integrations
        ├── api.js          # Backend API client
        └── supabase.js     # Supabase client configuration
```

## Application Architecture

### Entry Point (`src/index.jsx`)

The application uses React 18's `createRoot` API with Vite's module system:

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### HeroUI Provider Setup (`src/providers.jsx`)

The HeroUIProvider **must be inside** BrowserRouter for routing to work:

```jsx
import { HeroUIProvider } from "@heroui/react";
import { useNavigate, useHref } from "react-router-dom";

export function Providers({ children }) {
  const navigate = useNavigate();

  return (
    <HeroUIProvider navigate={navigate} useHref={useHref}>
      {children}
    </HeroUIProvider>
  );
}
```

### Main App Component (`src/App.jsx`)

The `App` component sets up:
1. **BrowserRouter** - Client-side routing
2. **Providers** - HeroUI context (inside Router)
3. **Stripe Elements** - Payment processing (optional)
4. **Route Configuration** - All application routes

### Routing Structure

#### Public Routes
- `/` - HomePage (landing page with video processor)
- `/pricing` - PricingPage (subscription plans)
- `/login` - LoginPage (user authentication)
- `/signup` - SignUpPage (user registration)
- `/auth/callback` - AuthCallbackPage (OAuth callback handler)
- `/free-trial-result` - FreeTrialResultPage (anonymous user results)

#### Protected Routes (Require Authentication)
- `/dashboard` - DashboardPage (main user dashboard)
- `/history` - HistoryPage (video processing history)
- `/profile` - ProfilePage (user profile and billing)
- `/settings` - SettingsPage (account settings)

## Styling System

### Tailwind CSS v4 Configuration

Tailwind v4 uses a CSS-first configuration via `hero.ts`:

```typescript
import { heroui } from "@heroui/react";

export default heroui({
  defaultTheme: "light",
  themes: {
    light: {
      colors: {
        primary: { DEFAULT: "#667eea", foreground: "#ffffff" },
        secondary: { DEFAULT: "#764ba2", foreground: "#ffffff" },
        success: { DEFAULT: "#10b981", foreground: "#ffffff" },
        warning: { DEFAULT: "#f59e0b", foreground: "#ffffff" },
        danger: { DEFAULT: "#ef4444", foreground: "#ffffff" },
      },
    },
    dark: {
      colors: {
        primary: { DEFAULT: "#818cf8", foreground: "#000000" },
      },
    },
  },
});
```

### CSS Structure (`src/index.css`)

```css
@import "tailwindcss";
@plugin "../hero.ts";

@layer base {
  * {
    @apply border-divider;
  }
  
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
```

### HeroUI Components

All UI is built with HeroUI components. Key imports:

```jsx
import {
  // Layout
  Navbar, NavbarBrand, NavbarContent, NavbarItem,
  Card, CardHeader, CardBody, CardFooter,
  
  // Forms
  Input, Button, Checkbox, Switch, Select, SelectItem,
  
  // Feedback
  Progress, Spinner, Chip,
  
  // Overlays
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
  Popover, PopoverTrigger, PopoverContent,
  
  // Navigation
  Tabs, Tab, Pagination, Link,
  
  // Utilities
  Divider, Spacer, Accordion, AccordionItem,
} from "@heroui/react";
```

### Icons

All icons use Iconify:

```jsx
import { Icon } from "@iconify/react";

// Usage
<Icon icon="solar:home-linear" width={20} />
<Icon icon="solar:check-circle-bold" className="text-success" />
```

Common icon sets:
- `solar:*` - Solar icons (primary)
- `lucide:*` - Lucide icons
- `logos:*` - Brand logos

## Theme System

### Dark/Light Mode

Theme is managed via `useTheme` hook:

```jsx
import { useTheme } from "../hooks/useTheme";

function Component() {
  const { theme, toggleTheme, isDark } = useTheme();
  
  return (
    <Button onPress={toggleTheme}>
      <Icon icon={isDark ? "solar:sun-linear" : "solar:moon-linear"} />
    </Button>
  );
}
```

### HeroUI Color Tokens

Use semantic color names:
- `primary`, `secondary`, `success`, `warning`, `danger`
- `default`, `foreground`, `background`
- With modifiers: `primary-50`, `primary-100`, etc.

```jsx
<Button color="primary" variant="solid">Primary</Button>
<Chip color="success" variant="flat">Success</Chip>
<div className="bg-primary text-primary-foreground">...</div>
```

## Environment Variables

Create `.env` file in frontend directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

**Important**: Vite uses `VITE_` prefix (not `REACT_APP_`).

Access in code:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Build & Development

### Development
```bash
npm run dev
```
- Starts Vite dev server on `http://localhost:3000`
- Hot module replacement enabled
- Source maps for debugging

### Production Build
```bash
npm run build
```
- Creates optimized build in `dist/` directory
- Minified JavaScript and CSS
- Tree-shaking for smaller bundles

### Preview Production Build
```bash
npm run preview
```
- Preview production build locally

## Key Components

### VideoProcessor
Main video input component with:
- URL/file input tabs
- Analysis type selector (Summarize/Fact-Check)
- Video metadata preview
- Processing status
- Error handling

### Navbar
Global navigation with:
- Logo and branding
- Navigation links
- Theme toggle
- User dropdown (when authenticated)
- Mobile responsive menu

### UsageIndicator
Usage tracking popover showing:
- Minutes used/remaining
- Usage progress bar
- Upgrade prompt when low

### ProcessingStatus
Real-time processing feedback:
- Animated spinner
- Progress bar
- Status messages

## Authentication Flow

1. **Email/Password**: Via backend API + Supabase
2. **Google OAuth**: Supabase provider with callback handling
3. **Session Management**: Supabase session + localStorage sync
4. **Protected Routes**: `ProtectedRoute` component checks auth state

## API Integration

Centralized in `src/services/api.js`:

```javascript
export const authAPI = {
  signup, login, logout, resetPassword
};

export const videoAPI = {
  process, processFree, getHistory, getVideo, deleteVideo, exportVideo
};

export const userAPI = {
  getCurrentUser, getUsage, deleteAccount
};

export const paymentAPI = {
  createCheckoutSession, createPortalSession, cancelSubscription
};
```

## Dependencies Summary

### Production
- `react`, `react-dom` - UI framework
- `react-router-dom` - Routing
- `@heroui/react` - UI components
- `framer-motion` - Animations
- `@iconify/react` - Icons
- `@supabase/supabase-js` - Auth
- `@stripe/stripe-js`, `@stripe/react-stripe-js` - Payments
- `axios` - HTTP client

### Development
- `vite`, `@vitejs/plugin-react` - Build tooling
- `tailwindcss`, `@tailwindcss/postcss` - Styling

## Migration Notes

This project was migrated from Create React App to Vite + HeroUI. Key changes:
- `react-scripts` → `vite`
- Plain CSS → Tailwind CSS v4 + HeroUI
- `.js` files → `.jsx` for React components
- `REACT_APP_*` → `VITE_*` env variables
- `process.env` → `import.meta.env`

---

**Last Updated**: November 2025
**Version**: 2.0.0
**Framework**: React 18.2.0 + Vite 5.4.0 + HeroUI 2.8.0

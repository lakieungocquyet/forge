# Overview
Focused Repository for Genomic Exploration

This repository contains source code. The contents of this repository are 100% open source and released under the GPL-3.0 license (see [LICENSE.TXT](https://github.com/lakieungocquyet/forge/blob/main/LICENSE)).
<!--
my-frontend-app/
├── .github/               # CI/CD workflows and GitHub templates
├── public/                # Static assets served directly (e.g., favicon, robots.txt)
├── src/                   # Main application source code
│   ├── assets/            # Global static media (images, fonts, SVGs)
│   ├── components/        # Reusable, global UI building blocks (Buttons, Inputs)
│   ├── context/           # React Context / State providers (if applicable)
│   ├── features/          # Domain/Feature-driven modules (e.g., Auth, Dashboard)
│   │   └── auth/          # Self-contained feature block
│   │       ├── components/# Feature-specific components
│   │       ├── hooks/     # Feature-specific hooks
│   │       ├── services/  # Feature-specific API calls
│   │       └── index.ts   # Clean public API entry point for the feature
│   ├── hooks/             # Global, reusable custom hooks / composables
│   ├── layouts/           # Structural wrappers (e.g., AuthLayout, RootLayout)
│   ├── pages/             # Route-mapped page components (or /app for Next.js)
│   ├── services/          # Global API integration files (Axios clients, SDKs)
│   ├── store/             # Global state management configuration (Redux, Zustand)
│   ├── styles/            # Global design tokens, variables, and CSS overrides
│   ├── utils/             # Pure utility helper functions (formatters, validators)
│   ├── App.tsx            # Main application root component
│   └── main.tsx           # Framework entry point (binds app to DOM)
├── .env.example           # Mock environment variables template
├── .gitignore             # Tells Git which files to intentionally ignore
├── package.json           # Project dependencies and script declarations
├── tsconfig.json          # TypeScript compiler configuration configuration
└── vite.config.ts         # Bundler configuration file (e.g., Vite, Webpack)# project-a
my-frontend-app/
├── .github/               # CI/CD workflows and GitHub templates
├── public/                # Static assets served directly (e.g., favicon, robots.txt)
├── src/                   # Main application source code
│   ├── assets/            # Global static media (images, fonts, SVGs)
│   ├── components/        # Reusable, global UI building blocks (Buttons, Inputs)
│   ├── context/           # React Context / State providers (if applicable)
│   ├── features/          # Domain/Feature-driven modules (e.g., Auth, Dashboard)
│   │   └── auth/          # Self-contained feature block
│   │       ├── components/# Feature-specific components
│   │       ├── hooks/     # Feature-specific hooks
│   │       ├── services/  # Feature-specific API calls
│   │       └── index.ts   # Clean public API entry point for the feature
│   ├── hooks/             # Global, reusable custom hooks / composables
│   ├── layouts/           # Structural wrappers (e.g., AuthLayout, RootLayout)
│   ├── pages/             # Route-mapped page components (or /app for Next.js)
│   ├── services/          # Global API integration files (Axios clients, SDKs)
│   ├── store/             # Global state management configuration (Redux, Zustand)
│   ├── styles/            # Global design tokens, variables, and CSS overrides
│   ├── utils/             # Pure utility helper functions (formatters, validators)
│   ├── App.tsx            # Main application root component
│   └── main.tsx           # Framework entry point (binds app to DOM)
├── .env.example           # Mock environment variables template
├── .gitignore             # Tells Git which files to intentionally ignore
├── package.json           # Project dependencies and script declarations
├── tsconfig.json          # TypeScript compiler configuration configuration
└── vite.config.ts         # Bundler configuration file (e.g., Vite, Webpack)
-->
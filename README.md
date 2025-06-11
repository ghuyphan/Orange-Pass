<h1 align="center">Orange Pass 🍊</h1>

<p align="center">
  <strong>A modern, local-first mobile app to save, manage, and sync your QR codes.</strong>
</p>

<p align="center">
  <a href="https://github.com/ghuyphan/orange-pass/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ghuyphan/orange-pass" alt="License"></a>
  <a href="https://github.com/ghuyphan/orange-pass/issues"><img src="https://img.shields.io/github/issues/ghuyphan/orange-pass" alt="Issues"></a>
  <a href="https://github.com/ghuyphan/orange-pass/stargazers"><img src="https://img.shields.io/github/stars/ghuyphan/orange-pass" alt="Stars"></a>
</p>

**Orange Pass** helps you effortlessly manage all your important QR codes—from bank cards 💳 and e-wallets 📱 to loyalty programs 🛍️ and event tickets. It features a blazing-fast scanner that works offline by storing data locally, then seamlessly syncs across your devices when you're connected.

## ✨ Features

*   **⚡️ Blazing-Fast QR Scanning:** Capture QR code data in an instant using the device's camera.
*   **📴 Offline-First Access:** Your codes are always available, with or without an internet connection.
*   **☁️ Secure Cloud Sync:** Automatically back up and synchronize your data across devices using PocketBase.
*   **🎨 Light & Dark Modes:** A beautiful interface that adapts to your system's theme.
*   **🌍 Multi-Language Support:** Fully localized in English, Vietnamese, and Russian.
*   **🗂️ Versatile & Organized:** Cleanly manage codes from banks, e-wallets, loyalty cards, and more.

## 📸 Screenshots

| Light Mode                               | Dark Mode                                |
| ---------------------------------------- | ---------------------------------------- |
| <img src="" width="250" alt="App Light Mode"> | <img src="" width="250" alt="App Dark Mode">   |

## 🛠️ Tech Stack

*   **Framework:** React Native with Expo
*   **Language:** TypeScript
*   **Navigation:** Expo Router (File-based)
*   **State Management:** Redux Toolkit
*   **Backend & Sync:** PocketBase
*   **Local Storage:** React Native MMKV (High-performance key-value store)
*   **UI & Components:** React Native Paper (Material Design), Moti (Animations), Gorhom Bottom Sheet
*   **Camera & QR Scanning:** React Native Vision Camera & React Native ML Kit
*   **Form Handling:** Formik & Yup
*   **Package Manager:** Yarn

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing.

### Prerequisites

*   Node.js (LTS version recommended)
*   Yarn package manager (`npm install -g yarn`)
*   A physical iOS or Android device
*   The Expo Go app installed on your physical device

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ghuyphan/orange-pass.git
    cd orange-pass
    ```

2.  **Install dependencies:**
    ```bash
    yarn install
    ```

3.  **Start the development server:**
    ```bash
    yarn start
    ```

4.  **Run on your device:**
    Scan the QR code generated in the terminal using the Expo Go app on your phone.

> **⚠️ Important Note**
> This project uses `react-native-vision-camera` and `react-native-ml-kit` for QR code scanning, which rely on native device capabilities. Therefore, **it will not work on an iOS Simulator or Android Emulator.** You must run the app on a physical device.

## 📁 Project Structure

The project is structured using a feature-based approach with a clear separation of concerns, leveraging Expo's file-based routing system.

```
.
├── app/                # Main application source code (Expo Router)
│   ├── (auth)/         # Routes and layout for authenticated users
│   ├── (guest)/        # Routes and layout for guest users
│   ├── (public)/       # Public routes (e.g., onboarding)
│   ├── _layout.tsx     # Root layout for the entire app
│   └── +not-found.tsx  # Catch-all for unmatched routes
├── assets/             # Static assets (images, fonts, etc.)
├── components/         # Reusable React components
├── constants/          # App-wide constants (colors, styles, etc.)
├── context/            # React Context providers for global state
├── hooks/              # Custom React hooks for reusable logic
├── locales/            # Internationalization (i18n) files
├── services/           # Modules for external APIs or services
├── store/              # Global state management (Redux Toolkit)
├── types/              # TypeScript type definitions
└── utils/              # Utility helper functions
```

### Key Directories Explained

*   **`app/`**: This is the heart of the application, where all screens and navigation logic reside. It uses **Expo Router** for file-based routing.
    *   **Route Groups `(...)`**: Directories wrapped in parentheses, like `(auth)` and `(guest)`, are used to group routes under a specific layout without affecting the URL path. This is perfect for creating different experiences for authenticated vs. unauthenticated users.
    *   **`_layout.tsx`**: A special file that defines a shared UI shell or layout for all routes within the same directory. For example, `app/(auth)/_layout.tsx` might render a tab bar that is only visible to logged-in users.
    *   **`+not-found.tsx`**: A special file that automatically renders when no other route matches the requested URL, serving as a custom 404 page.

*   **`components/`**: Contains reusable UI components like buttons, inputs, cards, and modals. This keeps the code DRY (Don't Repeat Yourself) and makes the UI consistent.

*   **`constants/`**: Stores static, unchanging values used throughout the app, such as color palettes, API endpoints, or dimension guidelines.

*   **`store/`**: Manages the application's global state using **Redux Toolkit**, which provides a simple and powerful way to handle complex state logic.

*   **`hooks/`**: Home to custom React hooks that encapsulate and reuse stateful logic, such as fetching data or interacting with device APIs.

*   **`services/`**: Handles all external communication, such as making API requests to a backend server (PocketBase) or interacting with third-party services.

*   **`types/`**: Centralizes all TypeScript type and interface definitions, ensuring type safety across the entire project.

### Resetting the Project

This repository is set up as a starter template. If you want to start over from a clean slate, you can run the reset script. This will restore the original example code.

```bash
yarn reset-project
```

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix:
    ```bash
    git checkout -b feature/your-amazing-feature
    ```
3.  Make your changes and commit them with a clear message:
    ```bash
    git commit -m "feat: Add some amazing feature"
    ```
4.  Push your changes to your forked repository:
    ```bash
    git push origin feature/your-amazing-feature
    ```
5.  Open a Pull Request to the main repository.

Please open an issue first to discuss any significant changes you would like to make.

## 📚 Learn More

*   [React Native Documentation](https://reactnative.dev/docs/getting-started)
*   [Expo Documentation](https://docs.expo.dev/)
*   [Expo Router Documentation](https://expo.github.io/router/docs/)
*   [React Native Vision Camera](https://react-native-vision-camera.com/)
*   [PocketBase Documentation](https://pocketbase.io/docs/)

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
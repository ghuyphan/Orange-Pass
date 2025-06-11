<h1 align="center">Orange Pass 🍊</h1>

<p align="center">
  <strong>A modern, local-first mobile app to save, manage, and sync your QR codes.</strong>
</p>

<p align="center">
  <a href="https://github.com/ghuyphan/Orange2/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ghuyphan/Orange2" alt="License"></a>
  <a href="https://github.com/ghuyphan/Orange2/issues"><img src="https://img.shields.io/github/issues/ghuyphan/Orange2" alt="Issues"></a>
  <a href="https://github.com/ghuyphan/Orange2/stargazers"><img src="https://img.shields.io/github/stars/ghuyphan/Orange2" alt="Stars"></a>
</p>

**Orange⁺** helps you effortlessly manage all your important QR codes—from bank cards 💳 and e-wallets 📱 to loyalty programs 🛍️ and event tickets. It features a blazing-fast scanner that works offline by storing data locally, then seamlessly syncs across your devices when you're connected.

## ✨ Features

*   **⚡️ Blazing-Fast QR Scanning:** Capture QR code data in an instant.
*   **📴 Offline-First Access:** Your codes are always available, with or without an internet connection.
*   **☁️ Secure Cloud Sync:** Automatically back up and synchronize your data across devices.
*   **🗂️ Versatile & Organized:** A clean interface to manage codes from banks, e-wallets, loyalty cards, and more.
*   **🧭 Intuitive Navigation:** Built with Expo's file-based routing for a smooth and predictable user experience.

## 📸 Screenshots

*(Add your screenshots here!)*

| Light Mode                               | Dark Mode                                |
| ---------------------------------------- | ---------------------------------------- |
| <img src="" width="250" alt="App Light"> | <img src="" width="250" alt="App Dark">   |

## 🛠️ Tech Stack

*   **Framework:** React Native with Expo
*   **Language:** TypeScript
*   **Navigation:** Expo Router (File-based)
*   **QR Scanning:** `react-native-ml-kit`
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
    git clone https://github.com/ghuyphan/Orange2.git
    cd Orange2
    ```

2.  **Install dependencies:**
    ```bash
    yarn install
    ```

3.  **Start the development server:**
    ```bash
    yarn expo start
    ```

4.  **Run on your device:**
    Scan the QR code generated in the terminal using the Expo Go app on your phone.

> **⚠️ Important Note**
> This project uses `react-native-ml-kit` for QR code scanning, which relies on native device capabilities. Therefore, **it will not work on an iOS Simulator or Android Emulator.** You must run the app on a physical device.

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
├── store/              # Global state management (e.g., Zustand, Redux)
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

*   **`context/` & `store/`**: These directories manage the application's global state. `context` is likely used for React's built-in Context API (e.g., for theme or authentication state), while `store` might contain more complex state logic using a library like Zustand or Redux.

*   **`hooks/`**: Home to custom React hooks that encapsulate and reuse stateful logic, such as fetching data or interacting with device APIs.

*   **`services/`**: Handles all external communication, such as making API requests to a backend server or interacting with third-party services like Firebase.

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
*   [react-native-ml-kit](https://github.com/agencyenterprise/react-native-ml-kit)

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
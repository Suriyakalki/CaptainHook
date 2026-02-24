# ⚓ Captain Hook: PWA to Mobile App Guide

This guide explains how to host your project on GitHub and convert it into a fully functional Android App (.apk) or iOS App without writing any mobile code.

---

## 🚀 Step 1: Deploy to GitHub Pages

To turn your code into an app, it must be hosted online so the builder can see it.

1. **Initialize Git** (Only do this once):
   ```bash
   git init
   git add .
   git commit -m "App Ready"
   git branch -M main
   ```

2. **Connect to Your GitHub** (Replace `YOUR_USERNAME` with your real name):
   ```bash
   git remote add origin https://github.com/Suriyakalki/CaptainHook.git
   ```

3. **Push to GitHub**:
   ```bash
   git push -u origin main
   ```

4. **Future Updates** (Run these anytime you change your code):
   ```bash
   git add .
   git commit -m "update"
   git push
   ```
   *OR: Just drag and drop your updated files into the GitHub web interface.*
5. **Enable Hosting**:
    - On GitHub, go to **Settings > Pages**.
    - Under **Branch**, select `main` / `(root)` and click **Save**.
    - Your URL will look like: `https://YOUR_USERNAME.github.io/CaptainHook/`.

---

## 🛠️ Step 2: Convert to App via PWABuilder

1.  **Visit [PWABuilder.com](https://www.pwabuilder.com/)**.
2.  **Enter your URL**: Paste your GitHub Pages link and click **Start**.
3.  **Review Quality Score**:
    - I have already configured the `manifest.json` and `sw.js` for you.
    - It should show a high score and "App Installable."
4.  **Download App Package**:
    - Click **Build & Package**.
    - Choose **Android** for an APK or **iOS** for an Apple Store package.
5.  **Customize (Optional)**:
    - **Package ID**: `com.captainhook.streaming`
    - **App Name**: `Captain Hook`
6.  **Generate**: Click **Generate** and download the resulting `.zip` file.

---

## 📱 Step 3: Install on Your Phone

1.  **Extract the Zip**: Open the downloaded folder on your computer.
2.  **Find the APK**: Inside the `android` folder, find `app-release-unsigned.apk` (or similar).
3.  **Transfer & Install**:
    - Send the file to your phone (Email, Google Drive, etc.).
    - Tap the file on your phone to install.
    - *Note: You may need to "Allow apps from unknown sources" in your Android settings.*

---

## 🛠️ Troubleshooting

- **Old Version Loading**: If you click "Go Live" and see an old version, your browser is caching the old PWA. **Press `Ctrl + F5`** (Hard Refresh) or open in Incognito mode.
- **Blank Screen on Localhost**: If you open `index.html` directly from your folder (the URL starts with `file:///`), the UI will not show. You **MUST** run it through a server like VS Code's **Go Live** button.
- **Manifest Errors**: If the icons don't show up, ensure you've pushed the latest `manifest.json` to GitHub.
- **Updates**: Whenever you push code to GitHub, your installed app will automatically update the next time it's opened!

---
*Developed by Antigravity*

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";

const host = process.env.TAURI_DEV_HOST;
const appSource = fileURLToPath(new URL("./src", import.meta.url));
const stylesSource = fileURLToPath(new URL("./src/assets/styles", import.meta.url));

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [vue()],

  resolve: {
    alias: [
      { find: "@/styles", replacement: stylesSource },
      { find: "@/app", replacement: appSource },
      { find: "@", replacement: appSource },
    ],
  },

  css: {
    preprocessorOptions: {
      scss: {
        // Only variables and mixins: they emit no CSS, so every component can use them
        // without duplicating the global resets (loaded once by main.scss).
        additionalData: [
          '@use "@/styles/lib/variables" as *;',
          '@use "@/styles/lib/mixins" as *;',
        ].join(" "),
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));

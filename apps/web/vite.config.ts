import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const repoRoot = path.resolve(__dirname, "../..");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const publicSiteUrl = (
    env.VITE_PUBLIC_SITE_URL ||
    env.PUBLIC_SITE_URL ||
    "https://lg.livegrid.ru"
  ).replace(/\/+$/, "");

  return {
    envDir: repoRoot,
    define: {
      /** Время сборки фронта — в подвале админки, чтобы отличить старый dist на сервере */
      __LG_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      "import.meta.env.VITE_PUBLIC_SITE_URL": JSON.stringify(publicSiteUrl),
    },
    server: {
      host: "::",
      port: 5173,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3000",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://127.0.0.1:3000",
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

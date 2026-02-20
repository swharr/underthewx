import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "child_process";

function getBuildMeta() {
  try {
    const commit = execSync("git rev-parse --short HEAD", { cwd: process.cwd() })
      .toString()
      .trim();
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: process.cwd() })
      .toString()
      .trim();
    return { commit, branch };
  } catch {
    return { commit: "dev", branch: "local" };
  }
}

const { commit, branch } = getBuildMeta();
const buildTime = new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(commit),
    __BUILD_BRANCH__: JSON.stringify(branch),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:7071",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});

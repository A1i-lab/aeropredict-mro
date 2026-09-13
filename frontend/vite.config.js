import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "local-aircraft-static",
      configureServer(server) {
        server.middlewares.use(
          "/app/static/models/a350-900.glb.gz",
          (_req, res) => {
            res.setHeader("Content-Type", "application/octet-stream");
            fs.createReadStream(
              path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                "../static/models/a350-900.glb.gz",
              ),
            ).pipe(res);
          },
        );
      },
    },
  ],
  build: {
    assetsInlineLimit: 10000000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

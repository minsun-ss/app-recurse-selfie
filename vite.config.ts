import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
// import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    // basicSsl(),
    {
      name: "request-logger",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          console.log(`${req.method} ${req.url}`);
          next();
        });
      },
    },
  ],
  // server: {
  //   host: "0.0.0.0",
  //   proxy: {
  //     "/receipt": {
  //       target: "http://receipt.local:8000",
  //       changeOrigin: true,
  //     },
  //   },
  // },
  // preview: {
  //   port: 8080,
  //   host: "0.0.0.0",
  // },
});

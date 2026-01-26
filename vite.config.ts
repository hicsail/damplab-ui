import { defineConfig } from 'vite';
import { reactRouter } from "@react-router/dev/vite";

export default defineConfig(() => {
  return {
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    esbuild: {
      target: 'esnext',
    },
    plugins: [reactRouter()],
    define: {
      'global': 'globalThis',
      'process.env': {},
    },
    resolve: {
      alias: {
        buffer: 'buffer',
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
  };
});

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
    server: {
      proxy: {
        '/graphql': 'http://localhost:5100',
      },
    },
    define: {
      'global': 'globalThis',
      'process.env': {},
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
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

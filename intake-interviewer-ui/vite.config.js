import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteRawPlugin from 'vite-plugin-raw';

export default defineConfig({
  plugins: [
    react(),
    viteRawPlugin({
      fileRegex: /\.md$/,
    }),
  ],
}); 
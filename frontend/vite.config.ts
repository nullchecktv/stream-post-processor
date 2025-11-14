import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, '..'),
      ],
    },
  },
  resolve: {
    alias: {
      '@schemas': path.resolve(__dirname, '../schemas')
    }
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'react-core';
            }
            if (id.includes('react-router')) {
              return 'react-router';
            }
            if (id.includes('aws-amplify')) {
              if (id.includes('auth')) return 'aws-auth';
              return 'aws-amplify';
            }
            if (id.includes('@aws-sdk')) {
              return 'aws-sdk';
            }
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'form-vendor';
            }
            if (id.includes('zod')) {
              return 'zod';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('react-markdown') || id.includes('remark')) {
              return 'markdown';
            }
            if (id.includes('mermaid')) {
              return 'mermaid';
            }
            if (id.includes('@gomomento')) {
              return 'momento';
            }
            if (id.includes('google-protobuf')) {
              return 'protobuf';
            }
          }

          if (id.includes('/src/pages/')) {
            const pageName = id.split('/pages/')[1].split('.')[0];
            return `page-${pageName}`;
          }

          if (id.includes('/src/components/')) {
            if (id.includes('/components/episodes/')) return 'components-episodes';
            if (id.includes('/components/auth/')) return 'components-auth';
            if (id.includes('/components/common/')) return 'components-common';
            if (id.includes('/components/layout/')) return 'components-layout';
            if (id.includes('/components/onboarding/')) return 'components-onboarding';
            return 'components';
          }

          if (id.includes('/src/api/')) {
            return 'api';
          }

          if (id.includes('/src/contexts/')) {
            return 'contexts';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})

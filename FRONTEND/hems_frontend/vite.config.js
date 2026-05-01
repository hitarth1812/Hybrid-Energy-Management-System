import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        // Bundle size analyzer - generates report on build
        visualizer({
            filename: './dist/stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // Enable minification for better compression
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console logs in prod
                drop_debugger: true,
            },
        },
        // Optimize chunks for better caching
        rollupOptions: {
            output: {
                manualChunks: {
                    // Vendor chunks for better caching strategy
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-ui': ['framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-label', '@radix-ui/react-select', '@radix-ui/react-slot', '@radix-ui/react-tabs'],
                    'vendor-charts': ['recharts'],
                    'vendor-utils': ['axios', 'date-fns', 'class-variance-authority', 'clsx', 'tailwind-merge'],
                    'vendor-icons': ['lucide-react', 'cobe'],
                },
                // Optimize chunk names for better debugging
                chunkFileNames: 'js/[name]-[hash].js',
                entryFileNames: 'js/[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    const info = assetInfo.name.split('.')
                    const ext = info[info.length - 1]
                    if (/png|jpe?g|gif|svg|webp/i.test(ext)) {
                        return `images/[name]-[hash][extname]`
                    }
                    return `assets/[name]-[hash][extname]`
                },
            },
        },
        // Target modern browsers
        target: 'es2020',
        // CSS code splitting
        cssCodeSplit: true,
        // Report compressed size
        reportCompressedSize: true,
        // Chunk size warnings
        chunkSizeWarningLimit: 500,
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/forecast': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/analytics': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
})

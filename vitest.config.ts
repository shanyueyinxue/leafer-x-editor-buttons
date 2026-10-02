import { defineConfig } from 'vitest/config'

export default defineConfig({
    // 保留软链接，避免 vite 在 windows 下额外调用 `net use` 探测网络盘
    resolve: { preserveSymlinks: true },
    test: {
        environment: 'node',
        include: ['__tests__/**/*.test.ts'],
    },
})

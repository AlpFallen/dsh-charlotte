/**
 * 共享类型定义。
 *
 * 刻意不依赖 cordis：除 index.ts 外的模块只依赖本文件的最小接口
 * （如 Logger），让扫描/映射逻辑可以在 vitest 里脱离宿主直接测试。
 */
export {};

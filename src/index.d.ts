import type { Plugin } from '@vuepress/core';

/**
 * 插件配置选项
 */
interface CopyPlusPluginOptions {
  /** 要处理的文件扩展名列表 */
  fileExtensions?: string[];
  /** 忽略的文件模式 */
  ignorePatterns?: (string | RegExp)[];
}

/**
 * 复制增强插件
 * @param options - 插件配置选项
 * @returns VuePress 插件对象
 * @example
 * ```
 * // .vuepress/config.js
 * import { copyPlusPlugin } from 'vuepress-plugin-copy-plus'
 *
 * export default {
 *   plugins: [
 *     copyPlusPlugin({
 *       fileExtensions: ['pdf', 'txt', 'mp4'],
 *       ignorePatterns: ['/temp/', /\.git\//]
 *     })
 *   ]
 * }
 * ```
 */
export declare const copyPlusPlugin: (options?: CopyPlusPluginOptions) => Plugin;
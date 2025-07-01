# VuePress Plugin Copy Plus

这是一个为 [VuePress 2.x](https://v2.vuepress.vuejs.org/) 设计的增强型文件复制插件。它可以在开发模式下监视文件的更改，并在构建时将指定类型的文件从源目录复制到输出目录。

## 安装

```bash
pnpm add -D vuepress-plugin-copy-plus
# 或者
npm install vuepress-plugin-copy-plus
```

## 使用方法

在您的 VuePress 项目的配置文件 (`.vuepress/config.ts` 或 `.vuepress/config.js`) 中，导入并使用此插件：

```ts
import { copyPlusPlugin } from 'vuepress-plugin-copy-plus'

export default {
  plugins: [
    copyPlusPlugin({
      // 可选配置
      fileExtensions: ['pdf', 'docx', 'xlsx']
    })
  ]
}
```
## log

dev server log
```log
pnpm run docs:dev

> vuepress-theme-hope-template@2.0.0 docs:dev C:\Users\UserName\Desktop\test\docs
> vuepress-vite dev src

⠹ Initializing and preparing data
CopyPlus Plugin initialized.

CopyPlus Plugin Running in Dev Server.
✔ Initializing and preparing data - done in 450ms
Watcher is ready and monitoring files.

  vite v6.3.5 dev server running at:

  ➜  Local:   http://localhost:8080/
  ➜  Network: http://198.18.0.1:8080/
  ➜  Network: http://192.168.0.46:8080/
  ➜  Network: http://192.168.179.1:8080/
  ➜  Network: http://192.168.17.1:8080/
  ➜  Network: http://172.24.80.1:8080/

```


build log

```log
pnpm run docs:build

> vuepress-theme-hope-template@2.0.0 docs:build C:\Users\UserName\Desktop\test\docs
> vuepress-vite build src

⠴ Initializing and preparing data
CopyPlus Plugin initialized.

CopyPlus Plugin Running in Build Server.
✔ Initializing and preparing data - done in 963ms
✔ Compiling with vite - done in 5.29s
✔ Rendering 14 pages - done in 518ms
@vuepress/plugin-seo:  ✔ Generating robots.txt
@vuepress/plugin-sitemap:  ✔ Generating sitemap to sitemap.xml
@vuepress/plugin-sitemap:  ✔ Appending sitemap path to robots.txt
@vuepress/plugin-redirect:  ✔ Generating redirect files
Build process finished, starting file copy...
Successfully copied 1 files
success VuePress build completed in 8.03s!
```
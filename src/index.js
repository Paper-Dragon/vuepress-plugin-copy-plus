import { watch } from "chokidar";
import fs from "fs-extra";
import pathLib from "path";

/**
 * 文件监听器类
 */
class FileWatcher {
  /**
   * @param {Object} app - VuePress应用对象
   * @param {RegExp} fileExtensionsPatterns - 文件扩展名正则
   * @param {Array} ignorePatterns - 忽略模式
   */
  constructor(app, fileExtensionsPatterns, ignorePatterns) {
    this.app = app;
    this.watchOptions = {
      persistent: true,
      followSymlinks: true,
      ignored: ignorePatterns
    };
    this.watchPath = `${app.dir.source()}/**/*${fileExtensionsPatterns.source}`;
    this.watcher = null;
  }

  /**
   * 初始化文件监听
   */
  init() {
    if (!this.app.env.isDev) return;

    this.watcher = watch(this.watchPath, this.watchOptions);
    this.watcher
      .on('add', path => this.handleFileEvent(path))
      .on('change', path => this.handleFileChange(path))
      .on('error', error => this.handleError(error))
      .on('ready', () => console.log('CopyPlus Plugin Watcher ready'));
  }

  /**
   * 处理文件添加事件
   * @param {string} filePath - 文件路径
   */
  handleFileEvent(filePath) {
    const tempFilePath = this.getTempPath(filePath);
    FileCopier.copy(filePath, tempFilePath);
  }

  /**
   * 处理文件变更事件
   * @param {string} filePath - 文件路径
   */
  handleFileChange(filePath) {
    console.log('CopyPlus Plugin File Change:', filePath);
    this.handleFileEvent(filePath);
  }

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   */
  handleError(error) {
    console.error('Watcher error:', error);
  }

  /**
   * 获取临时文件路径
   * @param {string} sourcePath - 源文件路径
   * @returns {string} 临时文件路径
   */
  getTempPath(sourcePath) {
    return pathLib.join(
      this.app.dir.temp(),
      'pages',
      pathLib.relative(this.app.dir.source(), sourcePath)
    );
  }
}

/**
 * 文件复制器类
 */
class FileCopier {
  /**
   * 复制文件
   * @param {string} source - 源路径
   * @param {string} destination - 目标路径
   */
  static async copy(source, destination) {
    try {
      const targetDir = pathLib.dirname(destination);
      if (!(await fs.pathExists(targetDir))) {
        await fs.mkdirp(targetDir);
      }
      await fs.copy(source, destination, { overwrite: true });
    } catch (error) {
      console.error(`Error copying ${source}:`, error);
    }
  }

  /**
   * 批量复制文件
   * @param {Array} files - 文件列表
   * @param {string} destDir - 目标目录
   */
  static async batchCopy(files, destDir) {
    await Promise.all(files.map(async sourceFilePath => {
      const destFilePath = pathLib.join(
        destDir,
        pathLib.relative(destDir, sourceFilePath)
      );
      await this.copy(sourceFilePath, destFilePath);
    }));
  }

  /**
   * 遍历目录获取文件列表
   * @param {string} dir - 目录路径
   * @param {RegExp} pattern - 文件匹配模式
   * @returns {Promise<Array>} 文件路径列表
   */
  static async walkDirectory(dir, pattern) {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      return (await Promise.all(files.map(async file => {
        const filePath = pathLib.join(dir, file.name);
        if (file.isDirectory() && !filePath.includes('.vuepress')) {
          return this.walkDirectory(filePath, pattern);
        }
        return file.isFile() && pattern.test(filePath) ? [filePath] : [];
      }))).flat();
    } catch (error) {
      console.error(`Error walking ${dir}:`, error);
      return [];
    }
  }
}

/**
 * 主插件
 */
export const copyPlusPlugin = (config = {}) => {
  // 定义插件配置结构
  const pluginConfig = {
    fileExtensions: [
      'pdf', 'zip', 'rar', 'tar', 'gz', 'bz2', 'tgz', '7z',
      'txt', 'py', 'c', 'cpp', 'h', 'hpp', 'sh', 'mp4',
      'ttf', 'otf', 'ttc', 'reg'
    ],
    ignorePatterns: [],
    ...config
  };

  const fileExtensionsPatterns = new RegExp(
    `\.(${pluginConfig.fileExtensions.join('|')})`
  );

  return {
    name: "vuepress-plugin-copy-plus",

    onPrepared: (app) => {
      console.log(`\nCopyPlus Plugin ${app.env.isDev ? "Dev" : "Build"} Server initialized.`);

      const ignorePatterns = [
        ...pluginConfig.ignorePatterns,
        /(^|[\/\\])\../,
        `${app.dir.source()}/.vuepress/**/*`
      ];

      if (!fs.existsSync(app.dir.source())) {
        console.error("Source directory missing:", app.dir.source());
        return;
      }
      const watcher = new FileWatcher(
        app,
        fileExtensionsPatterns,
        ignorePatterns
      );

      setTimeout(() => watcher.init(), 1000);
    },

    onGenerated: async (app) => {
      console.log("Build finished, starting file copy...");

      const files = await FileCopier.walkDirectory(
        app.dir.source(),
        fileExtensionsPatterns
      );

      await FileCopier.batchCopy(files, app.dir.dest());
      console.log(`CopyPlus Plugin Copied ${files.length} files`);
    }
  };
};

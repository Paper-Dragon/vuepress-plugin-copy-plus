import { watch } from "chokidar";
import fs from "fs-extra";
import pathLib from "path";
import { glob } from "glob";

/**
 * 文件监听器类
 */
class FileWatcher {
  /**
   * @param {Object} app - VuePress应用对象
   * @param {string} fileGlob - 文件的glob模式
   * @param {Array} ignoreGlobPattern - 忽略的文件glob模式
   */
    constructor(app, fileGlob, ignoreGlobPattern) {
    this.app = app;
    this.watchOptions = {
      persistent: true,
      followSymlinks: true,
      ignored: ignoreGlobPattern
    };
    // console.log(`输入参数 fileGlob: ${fileGlob} ignoreGlobPattern: ${ignoreGlobPattern}`)
    this.watchPath = pathLib.join(app.dir.source(), '**', fileGlob);
    // console.log(`输入进监视器的路径 ${this.watchPath}`)
    this.watcher = null;
  }

  /**
   * 初始化文件监听
   */
  init() {
    if (!this.app.env.isDev) return;

    let isSilent = true;

    this.watcher = watch(this.watchPath, this.watchOptions);
    this.watcher
      .on('add', filePath => this.handleFileEvent(filePath, "add", isSilent))
      .on('change', filePath => this.handleFileEvent(filePath, "change", isSilent))
      .on('error', error => this.handleError(error))
      .on('ready', () => {
        console.log('CopyPlus Plugin Watcher ready');
        isSilent = false;
      });
  }

  /**
   * 处理文件添加事件
   * @param {string} filePath - 文件路径
   * @param {string} event - add,change 事件
   * @param {boolean} isSilent - 是否显示大量日志
   */
  async handleFileEvent(filePath, event = "add", isSilent = true) {
    if (!isSilent) {
      console.log(`CopyPlus Plugin File [${event === "add" ? "Add" : "Change"}] :`, filePath);
    }
    const tempFilePath = this.getTempPath(filePath);
    await FileCopier.copy(filePath, tempFilePath);
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
    return getDestPath(
      sourcePath,
      this.app.dir.source(),
      pathLib.join(this.app.dir.temp(), 'pages')
    );
  }

  /**
   * 关闭文件监听
   */
  close() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('CopyPlus Plugin Watcher closed');
    }
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
      destination = pathLib.normalize(destination);

      // Ensure the destination directory exists
      const destDir = pathLib.dirname(destination);
      await fs.ensureDir(destDir);

      await fs.copy(source, destination, { overwrite: true });
    } catch (error) {
      console.error(`Error copying ${source}:`, error);
    }
  }

  /**
   * 批量复制文件
   * @param {Array} files - 文件列表
   * @param {string} baseDir - 项目的根目录
   * @param {string} destDir - 目标目录
   */
  static async batchCopy(files, baseDir, destDir) {
    await Promise.all(files.map(async sourceFilePath => {
      const destFilePath = getDestPath(sourceFilePath, baseDir, destDir);
      await this.copy(sourceFilePath, destFilePath);
    }));
  }

  /**
   * 遍历目录获取文件列表
   * @param {string} dir - 目录路径
   * @param {string} fileGlobPattern - 文件匹配glob模式
   * @param {string} ignoreGlobPattern - 忽略的文件 glob格式
   * @returns {Promise<Array>} 文件路径列表
   */
  static async walkDirectory(dir, fileGlobPattern, ignoreGlobPattern) {
    // Debug logs can be enabled with a debug flag if needed
    console.log("ignorePatterns", ignoreGlobPattern)
    console.log("fileGlobPattern", fileGlobPattern)
    console.log("dir", dir)

    try {
      const files = await glob(`**/${fileGlobPattern}`, {
        cwd: dir,
        // ignore: ignoreGlobPattern,
        nodir: true
      });
      return files.map(file => pathLib.join(dir, file));
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

  // const fileGlob = `*.(${pluginConfig.fileExtensions.join('|')})`;
  // const fileGlob = `*.{${pluginConfig.fileExtensions.join(',')}}`;

  // Store the watcher instance
  let watcher = null;

  return {
    name: "vuepress-plugin-copy-plus",

    onPrepared: (app) => {
      console.log("");
      console.log(`CopyPlus Plugin ${app.env.isDev ? "Dev" : "Build"} Server initialized.`);

      const ignoreGlobPattern = [
        `${app.dir.source()}/.vuepress/**`,
        ...(pluginConfig.ignorePatterns || [])
      ];
      const fileGlob = `*.(${pluginConfig.fileExtensions.join('|')})`;
      watcher = new FileWatcher(app, fileGlob, ignoreGlobPattern);

      setTimeout(() => watcher.init(), 1000);
    },

    onGenerated: async (app) => {
      console.log("Build finished, starting file copy...");

      // Close the watcher if it exists
      if (watcher) {
        watcher.close();
        watcher = null;
      }

      const ignoreGlobPattern = [
        `${app.dir.source()}/.vuepress/**`,
        ...(pluginConfig.ignorePatterns || [])
      ];

      const fileGlob = `*.{${pluginConfig.fileExtensions.join(',')}}`;
      const files = await FileCopier.walkDirectory(
        app.dir.source(),
        fileGlob,
        ignoreGlobPattern
      );
      await FileCopier.batchCopy(files, app.dir.source(), app.dir.dest());
      console.log(`CopyPlus Plugin Copied ${files.length} files`);
    }
  };
};

function getDestPath(sourcePath, baseDir, destDir) {
  const relativePath = pathLib.relative(baseDir, sourcePath);
  return pathLib.join(destDir, relativePath);
}


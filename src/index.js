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
   * @param {Array} ignorePatterns - 忽略模式
   */
  constructor(app, fileGlob, ignorePatterns) {
    this.app = app;
    this.watchOptions = {
      persistent: true,
      followSymlinks: true,
      ignored: ignorePatterns
    };
    this.watchPath = `${app.dir.source()}/**/${fileGlob}`;
    this.watcher = null;
  }

  /**
   * 初始化文件监听
   */
  init() {
    if (!this.app.env.isDev) return;

    this.watcher = watch(this.watchPath, this.watchOptions);
    this.watcher
      .on('add', this.handleFileEvent.bind(this))
      .on('change', this.handleFileEvent.bind(this))
      .on('error', error => this.handleError(error))
      .on('ready', () => console.log('CopyPlus Plugin Watcher ready'));
  }

  /**
   * 处理文件添加事件
   * @param {string} filePath - 文件路径
   */
  handleFileEvent(filePath) {
    // console.log('CopyPlus Plugin File Change:', filePath);
    const tempFilePath = this.getTempPath(filePath);
    FileCopier.copy(filePath, tempFilePath);
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
  static async batchCopy(files, baseDir, destDir) {
    await Promise.all(files.map(async sourceFilePath => {
      const destFilePath = getDestPath(sourceFilePath, baseDir, destDir);
      await this.copy(sourceFilePath, destFilePath);
    }));
  }

  /**
   * 遍历目录获取文件列表
   * @param {string} dir - 目录路径
   * @param {string} globPattern - 文件匹配glob模式
   * @returns {Promise<Array>} 文件路径列表
   */
  static async walkDirectory(dir, globPattern, ignorePatterns) {
    console.log("ignorePatterns", ignorePatterns)
    console.log("globPattern", globPattern)
    console.log("dir", dir)

    try {
      const files = await glob(`**/${globPattern}`, {
        cwd: dir,
        ignore: ignorePatterns,
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

  const fileGlob = `*.{${pluginConfig.fileExtensions.join(',')}}`;


  return {
    name: "vuepress-plugin-copy-plus",

    onPrepared: (app) => {
      console.log(`\nCopyPlus Plugin ${app.env.isDev ? "Dev" : "Build"} Server initialized.`);

      if (!fs.existsSync(app.dir.source())) {
        console.error("Source directory missing:", app.dir.source());
        return;
      }
      const ignorePatterns = [

        `${app.dir.source()}/.vuepress/**`
      ];
      const watcher = new FileWatcher(app, fileGlob, ignorePatterns);

      setTimeout(() => watcher.init(), 1000);
    },

    onGenerated: async (app) => {
      console.log("Build finished, starting file copy...");

      const ignorePatterns = [
        `${app.dir.source()}/.vuepress/**`
      ];

      const files = await FileCopier.walkDirectory(
        app.dir.source(),
        fileGlob,
        ignorePatterns
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

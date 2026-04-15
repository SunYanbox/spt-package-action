/**
 * 核心数据结构类型定义
 */

/**
 * 项目信息
 */
export interface ProjectInfo {
  /** 项目名称（csproj 文件名，不含扩展名） */
  name: string
  /** 项目版本（从 csproj 的 Version 节点提取） */
  version: string
  /** 项目根路径（csproj 文件所在目录） */
  path: string
  /** csproj 文件完整路径 */
  csprojPath: string
}

/**
 * Action 输入参数
 */
export interface ActionInputs {
  /** 指定项目路径列表（每行一个路径，可以是目录或 .csproj 文件） */
  projectPaths: string[]
  /** 排除目录模式列表 */
  excludePatterns: string[]
  /** 最大检索深度 */
  maxDepth: number
  /** 模组文件夹名称（可选，默认使用项目名称） */
  modFolderName?: string
  /** 资源文件路径列表 */
  resourcePaths: string[]
  /** 是否包含源码文件 */
  includeSourceFiles: boolean
  /** 是否替换默认值（而非追加） */
  replaceDefaults: boolean
}

/**
 * 打包结果
 */
export interface PackageResult {
  /** 打包成功的项目名称 */
  projectName: string
  /** 项目版本 */
  version: string
  /** 生成的 zip 文件路径 */
  zipPath: string
  /** artifact 名称 */
  artifactName: string
}

/**
 * 默认排除模式
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
  'Test',
  'test',
  'node_modules',
  '.venv'
]

/**
 * 默认资源路径
 */
export const DEFAULT_RESOURCE_PATHS = ['db', 'data', 'wwwroot', 'res']

/**
 * 源码文件扩展名（默认排除）
 */
export const SOURCE_FILE_EXTENSIONS = [
  '.cs',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.vue',
  '.svelte',
  '.py',
  '.java',
  '.cpp',
  '.c',
  '.h',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.swift',
  '.kt',
  '.scala'
]

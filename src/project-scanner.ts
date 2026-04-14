/**
 * 项目扫描模块
 * 在指定目录中检索 csproj 文件，支持排除模式和深度限制
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ProjectInfo } from './types.js'
import { parseCsproj, isValidCsprojPath } from './csproj-parser.js'

/**
 * 扫描选项
 */
export interface ScanOptions {
  /** 基础路径（仓库根目录） */
  basePath: string
  /** 排除模式列表 */
  excludePatterns: string[]
  /** 最大检索深度 */
  maxDepth: number
}

/**
 * 扫描项目，返回所有找到的项目信息
 * @param options 扫描选项
 * @returns 项目信息数组
 */
export async function scanProjects(
  options: ScanOptions
): Promise<ProjectInfo[]> {
  const { basePath, excludePatterns, maxDepth } = options

  // 搜索所有 csproj 文件
  const files = await findCsprojFiles(basePath, maxDepth)

  // 过滤排除模式
  const filteredFiles = filterExcludePatterns(files, basePath, excludePatterns)

  // 解析每个 csproj 文件
  const projectInfos: ProjectInfo[] = []
  for (const filePath of filteredFiles) {
    if (!isValidCsprojPath(filePath)) {
      continue
    }
    try {
      const info = await parseCsproj(filePath)
      projectInfos.push(info)
    } catch (error) {
      // 记录错误但继续处理其他文件
      console.warn(`Failed to parse ${filePath}: ${error}`)
    }
  }

  return projectInfos
}

/**
 * 递归查找 csproj 文件
 * @param dir 目录路径
 * @param maxDepth 最大深度
 * @param currentDepth 当前深度
 * @returns csproj 文件路径列表
 */
async function findCsprojFiles(
  dir: string,
  maxDepth: number,
  currentDepth: number = 0
): Promise<string[]> {
  const files: string[] = []

  // 检查深度限制
  if (currentDepth > maxDepth) {
    return files
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        // 递归搜索子目录
        const subFiles = await findCsprojFiles(
          fullPath,
          maxDepth,
          currentDepth + 1
        )
        files.push(...subFiles)
      } else if (entry.isFile() && entry.name.endsWith('.csproj')) {
        files.push(fullPath)
      }
    }
  } catch {
    // 目录不存在或无法访问，返回空数组
    return files
  }

  return files
}

/**
 * 过滤排除模式的路径
 * @param filePaths 文件路径列表
 * @param basePath 基础路径
 * @param excludePatterns 排除模式列表
 * @returns 过滤后的文件路径列表
 */
export function filterExcludePatterns(
  filePaths: string[],
  basePath: string,
  excludePatterns: string[]
): string[] {
  return filePaths.filter((filePath) => {
    // 计算相对路径
    const relativePath = path.relative(basePath, filePath)

    // 检查是否匹配任何排除模式
    for (const pattern of excludePatterns) {
      if (matchesExcludePattern(relativePath, pattern)) {
        return false
      }
    }

    return true
  })
}

/**
 * 检查路径是否匹配排除模式
 * @param relativePath 相对路径
 * @param pattern 排除模式
 * @returns 是否匹配
 */
function matchesExcludePattern(relativePath: string, pattern: string): boolean {
  // 将路径分割为部分
  const parts = relativePath.split(/[/\\]/)

  // 检查路径的任何部分是否匹配排除模式
  for (const part of parts) {
    // 支持大小写敏感和不敏感的匹配
    if (part === pattern || part.toLowerCase() === pattern.toLowerCase()) {
      return true
    }
  }

  return false
}

/**
 * 查找指定路径的 csproj 文件
 * @param projectPath 项目路径（可以是目录或 csproj 文件）
 * @returns 项目信息或 null
 */
export async function findProject(
  projectPath: string
): Promise<ProjectInfo | null> {
  let csprojPath: string

  if (projectPath.endsWith('.csproj')) {
    csprojPath = projectPath
  } else {
    // 假设是目录，查找目录下的 csproj 文件
    const files = await findCsprojFiles(projectPath, 0)

    if (files.length === 0) {
      return null
    }

    // 如果有多个，取第一个（按名称排序）
    csprojPath = files.sort()[0]
  }

  if (!isValidCsprojPath(csprojPath)) {
    return null
  }

  try {
    return await parseCsproj(csprojPath)
  } catch {
    return null
  }
}

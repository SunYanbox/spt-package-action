/**
 * 打包模块
 * 处理 DLL 文件查找、资源文件收集和目录结构创建
 */
import * as io from '@actions/io'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ProjectInfo, PackageResult } from './types.js'
import { SOURCE_FILE_EXTENSIONS, DEFAULT_RESOURCE_PATHS } from './types.js'

/**
 * 打包选项
 */
export interface PackageOptions {
  /** 项目信息 */
  projectInfo: ProjectInfo
  /** 模组文件夹名称（可选，默认使用项目名称） */
  modFolderName?: string
  /** 资源路径列表 */
  resourcePaths: string[]
  /** 是否包含源码文件 */
  includeSourceFiles: boolean
  /** 输出目录 */
  outputDir: string
}

/**
 * 查找项目的 DLL 文件
 * @param projectPath 项目路径
 * @param projectName 项目名称
 * @returns DLL 文件路径，找不到返回 null
 */
export async function findDllFile(
  projectPath: string,
  projectName: string
): Promise<string | null> {
  // 检查 bin/Release 目录
  const releaseDir = path.join(projectPath, 'bin', 'Release')

  // 可能的 DLL 路径
  const possiblePaths = [
    path.join(releaseDir, 'net6.0', `${projectName}.dll`),
    path.join(releaseDir, 'net7.0', `${projectName}.dll`),
    path.join(releaseDir, 'net8.0', `${projectName}.dll`),
    path.join(releaseDir, `${projectName}.dll`)
  ]

  // 递归搜索 bin/Release 目录下的所有 DLL 文件
  const dllFiles = await findFiles(releaseDir, '.dll')

  // 查找匹配项目名称的 DLL
  const targetDll = `${projectName}.dll`
  for (const dllFile of dllFiles) {
    if (path.basename(dllFile) === targetDll) {
      return dllFile
    }
  }

  // 也检查预定义路径
  for (const possiblePath of possiblePaths) {
    try {
      await fs.access(possiblePath)
      return possiblePath
    } catch {
      // 文件不存在，继续检查下一个
    }
  }

  return null
}

/**
 * 收集资源文件
 * @param projectPath 项目路径
 * @param resourcePaths 资源路径列表
 * @param includeSourceFiles 是否包含源码文件
 * @returns 资源文件路径列表
 */
export async function collectResourceFiles(
  projectPath: string,
  resourcePaths: string[],
  includeSourceFiles: boolean
): Promise<string[]> {
  const resourceFiles: string[] = []

  for (const resourcePath of resourcePaths) {
    const fullPath = path.join(projectPath, resourcePath)

    try {
      const stats = await fs.stat(fullPath)

      if (stats.isDirectory()) {
        // 递归收集目录下的所有文件
        const files = await collectFilesRecursive(fullPath, includeSourceFiles)
        resourceFiles.push(...files)
      } else if (stats.isFile()) {
        // 单个文件
        if (includeSourceFiles || !isSourceFile(fullPath)) {
          resourceFiles.push(fullPath)
        }
      }
    } catch {
      // 路径不存在，跳过
    }
  }

  return resourceFiles
}

/**
 * 递归收集目录下的文件
 */
async function collectFilesRecursive(
  dir: string,
  includeSourceFiles: boolean
): Promise<string[]> {
  const files: string[] = []

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        const subFiles = await collectFilesRecursive(
          fullPath,
          includeSourceFiles
        )
        files.push(...subFiles)
      } else if (entry.isFile()) {
        if (includeSourceFiles || !isSourceFile(fullPath)) {
          files.push(fullPath)
        }
      }
    }
  } catch {
    // 目录无法访问，返回空数组
  }

  return files
}

/**
 * 判断文件是否为源码文件
 */
function isSourceFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return SOURCE_FILE_EXTENSIONS.includes(ext)
}

/**
 * 递归查找指定扩展名的文件
 */
async function findFiles(dir: string, ext: string): Promise<string[]> {
  const files: string[] = []

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        const subFiles = await findFiles(fullPath, ext)
        files.push(...subFiles)
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        files.push(fullPath)
      }
    }
  } catch {
    // 目录不存在，返回空数组
  }

  return files
}

/**
 * 创建打包结构并复制文件
 * @param options 打包选项
 * @returns 打包结果
 */
export async function createPackage(
  options: PackageOptions
): Promise<PackageResult> {
  const {
    projectInfo,
    modFolderName,
    resourcePaths,
    includeSourceFiles,
    outputDir
  } = options

  // 确定模组文件夹名称
  const modName = modFolderName || projectInfo.name

  // 创建 SPT 目录结构
  const sptDir = path.join(outputDir, 'SPT')
  const modsParentDir = path.join(sptDir, 'user', 'mods')
  const modsDir = path.join(modsParentDir, modName)

  // 清理已存在的模组目录，避免残留文件
  try {
    await io.rmRF(modsParentDir)
  } catch {
    // 目录不存在，忽略错误
  }

  await io.mkdirP(modsDir)

  // 查找并复制 DLL 文件
  const dllPath = await findDllFile(projectInfo.path, projectInfo.name)
  if (!dllPath) {
    throw new Error(
      `DLL file not found for project "${projectInfo.name}" in ${projectInfo.path}/bin/Release`
    )
  }

  const dllDestPath = path.join(modsDir, `${projectInfo.name}.dll`)
  await io.cp(dllPath, dllDestPath)

  // 收集并复制资源文件
  const allResourcePaths = [...DEFAULT_RESOURCE_PATHS, ...resourcePaths]
  const resourceFiles = await collectResourceFiles(
    projectInfo.path,
    allResourcePaths,
    includeSourceFiles
  )

  for (const resourceFile of resourceFiles) {
    // 计算相对路径，保持目录结构
    const relativePath = path.relative(projectInfo.path, resourceFile)
    const destPath = path.join(modsDir, relativePath)

    // 创建目标目录
    await io.mkdirP(path.dirname(destPath))

    // 复制文件
    await io.cp(resourceFile, destPath)
  }

  // 生成 zip 文件名和 artifact 名称
  const artifactName = `${projectInfo.name}-${projectInfo.version}`
  const zipPath = path.join(outputDir, `${artifactName}.zip`)

  return {
    projectName: projectInfo.name,
    version: projectInfo.version,
    zipPath,
    artifactName
  }
}

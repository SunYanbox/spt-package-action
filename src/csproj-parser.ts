/**
 * csproj 文件解析模块
 * 解析 .csproj XML 文件，提取项目名称和版本信息
 */
import { XMLParser } from 'fast-xml-parser'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ProjectInfo } from './types.js'

/**
 * 解析 csproj 文件，提取项目信息
 * @param csprojPath csproj 文件的完整路径
 * @returns 项目信息对象
 */
export async function parseCsproj(csprojPath: string): Promise<ProjectInfo> {
  // 读取文件内容
  const content = await fs.readFile(csprojPath, 'utf-8')

  // 解析 XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  })
  const result = parser.parse(content)

  // 提取项目名称（文件名，不含扩展名）
  const name = path.basename(csprojPath, '.csproj')

  // 提取项目路径（文件所在目录）
  const projectPath = path.dirname(csprojPath)

  // 提取版本号
  let version = extractVersion(result)

  // 如果版本不存在，使用默认值并警告
  if (!version) {
    version = '1.0.0'
  }

  return {
    name,
    version,
    path: projectPath,
    csprojPath
  }
}

/**
 * 从解析的 XML 对象中提取版本号
 * .csproj 文件中的版本通常在 <Project><PropertyGroup><Version> 节点
 */
function extractVersion(parsedXml: Record<string, unknown>): string | null {
  const project = parsedXml.Project as Record<string, unknown> | undefined
  if (!project) {
    return null
  }

  // PropertyGroup 可能是数组或单个对象
  const propertyGroup = project.PropertyGroup
  if (!propertyGroup) {
    return null
  }

  // 处理数组情况
  if (Array.isArray(propertyGroup)) {
    for (const group of propertyGroup) {
      if (group && typeof group === 'object' && 'Version' in group) {
        const version = (group as Record<string, unknown>).Version
        if (typeof version === 'string') {
          return version
        }
      }
    }
    return null
  }

  // 处理单个对象情况
  if (typeof propertyGroup === 'object') {
    const version = (propertyGroup as Record<string, unknown>).Version
    if (typeof version === 'string') {
      return version
    }
  }

  return null
}

/**
 * 验证路径是否为有效的 csproj 文件
 * @param filePath 文件路径
 * @returns 是否为有效的 csproj 文件路径
 */
export function isValidCsprojPath(filePath: string): boolean {
  return filePath.endsWith('.csproj') && !filePath.includes('..')
}

/**
 * 从项目路径中提取项目名称
 * @param csprojPath csproj 文件路径
 * @returns 项目名称
 */
export function extractProjectName(csprojPath: string): string {
  return path.basename(csprojPath, '.csproj')
}

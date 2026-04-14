/**
 * 产物上传模块
 * 将打包好的 zip 文件上传到 GitHub Artifacts
 */
import artifactClient from '@actions/artifact'
import path from 'node:path'

/**
 * 上传选项
 */
export interface UploadOptions {
  /** 要上传的文件路径 */
  filePath: string
  /** artifact 名称 */
  artifactName: string
  /** 保留天数（可选，默认 90 天） */
  retentionDays?: number
}

/**
 * 上传结果
 */
export interface UploadResult {
  /** artifact 名称 */
  artifactName: string
  /** artifact ID */
  artifactId: number
  /** 文件大小（字节） */
  size: number
}

/**
 * 上传文件到 GitHub Artifacts
 * @param options 上传选项
 * @returns 上传结果
 */
export async function uploadArtifact(
  options: UploadOptions
): Promise<UploadResult> {
  const { filePath, artifactName, retentionDays = 90 } = options

  // 获取文件所在目录
  const rootDirectory = path.dirname(filePath)

  // 上传文件
  const response = await artifactClient.uploadArtifact(
    artifactName,
    [filePath],
    rootDirectory,
    {
      retentionDays
    }
  )

  // 检查上传是否成功
  if (response.failedItems.length > 0) {
    throw new Error(
      `Failed to upload artifact: ${response.failedItems.join(', ')}`
    )
  }

  return {
    artifactName: response.artifactName,
    artifactId: response.artifactId ?? 0,
    size: response.size ?? 0
  }
}

/**
 * 生成 artifact 名称
 * @param projectName 项目名称
 * @param version 版本号
 * @returns artifact 名称
 */
export function generateArtifactName(
  projectName: string,
  version: string
): string {
  // 替换版本号中的特殊字符
  const safeVersion = version.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${projectName}-${safeVersion}`
}

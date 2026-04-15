/**
 * 产物上传模块
 * 将打包好的 zip 文件上传到 GitHub Artifacts
 */
import {
  DefaultArtifactClient,
  UploadArtifactResponse
} from '@actions/artifact'
import path from 'node:path'

/**
 * 上传选项
 */
export interface UploadOptions {
  /** 要上传的文件路径 */
  filePath: string
  /** artifact 名称 */
  artifactName: string
  /** 保留天数（可选，默认 3 天） */
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
  const { filePath, artifactName, retentionDays = 3 } = options

  // 获取文件所在目录
  const rootDirectory = path.dirname(filePath)

  const artifactClient = new DefaultArtifactClient()

  let response: UploadArtifactResponse | null = null

  // 上传文件
  try {
    response = await artifactClient.uploadArtifact(
      artifactName,
      [filePath],
      rootDirectory,
      { retentionDays }
    )

    console.log(`Artifact ${response.id} uploaded successfully`)
    console.log(`ID: ${response.id}, Size: ${response.size} bytes`)
  } catch (error) {
    console.error('Failed to upload artifact:', error)
  }

  if (response == null || response.digest == undefined) {
    throw new Error(`Failed to upload artifact: ${options}`)
  }

  // 检查上传是否成功
  if (response.digest.length > 0) {
    throw new Error(`Failed to upload artifact: ${response.id}`)
  }

  return {
    artifactName: options.artifactName,
    artifactId: response.id ?? 0,
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

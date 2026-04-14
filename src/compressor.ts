/**
 * 压缩模块
 * 将目录压缩为 zip 文件
 */
import archiver from 'archiver'
import { createWriteStream, promises as fs } from 'node:fs'
import path from 'node:path'
import fss from 'fs'

/**
 * 压缩目录为 zip 文件
 * @param sourceDir 源目录路径
 * @param outputPath 输出 zip 文件路径
 * @returns Promise，完成时返回 zip 文件路径
 */
export async function createZip(
  sourceDir: string,
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 确保输出目录存在
    const outputDir = path.dirname(outputPath)

    if (!fss.existsSync(outputDir)) {
      fss.mkdirSync(outputDir, { recursive: true })
    }

    // 创建输出流
    const output = createWriteStream(outputPath)
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    })

    // 监听事件
    output.on('close', () => {
      resolve(outputPath)
    })

    output.on('error', (err) => {
      reject(err)
    })

    archive.on('error', (err) => {
      reject(err)
    })

    // 管道输出
    archive.pipe(output)

    // 添加目录内容
    archive.directory(sourceDir, path.basename(sourceDir))

    // 完成压缩
    archive.finalize()
  })
}

/**
 * 验证 zip 文件是否有效
 * @param zipPath zip 文件路径
 * @returns 是否为有效的 zip 文件
 */
export async function validateZip(zipPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(zipPath)

    if (!stats.isFile()) {
      return false
    }

    // 检查文件大小（至少 22 字节，空 zip 的最小大小）
    if (stats.size < 22) {
      return false
    }

    // 检查 zip 文件头（PK\x03\x04 或 PK\x05\x06）
    const fd = await fs.open(zipPath, 'r')
    const buffer = Buffer.alloc(4)
    await fd.read(buffer, 0, 4, 0)
    await fd.close()

    // 检查是否为有效的 zip 文件头
    const zipHeader = buffer.toString('binary')
    return zipHeader.startsWith('PK')
  } catch {
    return false
  }
}

/**
 * 获取 zip 文件大小
 * @param zipPath zip 文件路径
 * @returns 文件大小（字节）
 */
export async function getZipSize(zipPath: string): Promise<number> {
  const stats = await fs.stat(zipPath)
  return stats.size
}

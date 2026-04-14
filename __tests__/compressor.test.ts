/**
 * compressor.ts 单元测试
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createZip, validateZip, getZipSize } from '../src/compressor.js'

// 创建临时测试目录
const TEST_DIR = path.join(process.cwd(), '__test_temp_compressor__')
const SOURCE_DIR = path.join(TEST_DIR, 'source')
const OUTPUT_DIR = path.join(TEST_DIR, 'output')
const ZIP_PATH = path.join(OUTPUT_DIR, 'test.zip')

describe('compressor.ts', () => {
  beforeEach(async () => {
    // 创建临时目录结构
    await fs.mkdir(SOURCE_DIR, { recursive: true })
    await fs.mkdir(OUTPUT_DIR, { recursive: true })

    // 创建测试文件
    await fs.writeFile(path.join(SOURCE_DIR, 'file1.txt'), 'Hello World')
    await fs.writeFile(path.join(SOURCE_DIR, 'file2.json'), '{"key": "value"}')

    // 创建子目录
    const subDir = path.join(SOURCE_DIR, 'subdir')
    await fs.mkdir(subDir, { recursive: true })
    await fs.writeFile(path.join(subDir, 'file3.txt'), 'Nested file')
  })

  afterEach(async () => {
    // 清理临时目录
    await fs.rm(TEST_DIR, { recursive: true, force: true })
  })

  describe('createZip', () => {
    it('should create a zip file from directory', async () => {
      const result = await createZip(SOURCE_DIR, ZIP_PATH)

      expect(result).toBe(ZIP_PATH)

      // 验证文件已创建
      const stats = await fs.stat(ZIP_PATH)
      expect(stats.isFile()).toBe(true)
      expect(stats.size).toBeGreaterThan(0)
    })

    it('should create zip with correct structure', async () => {
      await createZip(SOURCE_DIR, ZIP_PATH)

      // 验证 zip 文件有效
      const isValid = await validateZip(ZIP_PATH)
      expect(isValid).toBe(true)
    })

    it('should handle empty directory', async () => {
      const emptyDir = path.join(TEST_DIR, 'empty')
      const emptyZip = path.join(OUTPUT_DIR, 'empty.zip')
      await fs.mkdir(emptyDir, { recursive: true })

      const result = await createZip(emptyDir, emptyZip)

      expect(result).toBe(emptyZip)
      const isValid = await validateZip(emptyZip)
      expect(isValid).toBe(true)
    })
  })

  describe('validateZip', () => {
    it('should return true for valid zip file', async () => {
      await createZip(SOURCE_DIR, ZIP_PATH)

      const isValid = await validateZip(ZIP_PATH)
      expect(isValid).toBe(true)
    })

    it('should return false for non-existent file', async () => {
      const isValid = await validateZip('/nonexistent/path.zip')
      expect(isValid).toBe(false)
    })

    it('should return false for non-zip file', async () => {
      const txtPath = path.join(OUTPUT_DIR, 'notzip.txt')
      await fs.writeFile(txtPath, 'This is not a zip file')

      const isValid = await validateZip(txtPath)
      expect(isValid).toBe(false)
    })

    it('should return false for directory', async () => {
      const isValid = await validateZip(SOURCE_DIR)
      expect(isValid).toBe(false)
    })
  })

  describe('getZipSize', () => {
    it('should return the size of zip file', async () => {
      await createZip(SOURCE_DIR, ZIP_PATH)

      const size = await getZipSize(ZIP_PATH)
      expect(size).toBeGreaterThan(0)
      expect(typeof size).toBe('number')
    })

    it('should throw error for non-existent file', async () => {
      await expect(getZipSize('/nonexistent/path.zip')).rejects.toThrow()
    })
  })
})

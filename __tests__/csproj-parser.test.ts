/**
 * csproj-parser.ts 单元测试
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  parseCsproj,
  isValidCsprojPath,
  extractProjectName
} from '../src/csproj-parser.js'
import {
  VALID_CSPROJ_WITH_VERSION,
  VALID_CSPROJ_WITHOUT_VERSION,
  VALID_CSPROJ_MULTIPLE_PROPERTY_GROUPS,
  INVALID_XML
} from '../__fixtures__/csproj-parser.js'

// 创建临时测试目录
const TEST_DIR = path.join(process.cwd(), '__test_temp__')
const TEST_CSPROJ_PATH = path.join(TEST_DIR, 'TestProject.csproj')
const TEST_CSPROJ_NO_VERSION_PATH = path.join(TEST_DIR, 'NoVersion.csproj')
const TEST_CSPROJ_MULTIPLE_PATH = path.join(TEST_DIR, 'Multiple.csproj')
const TEST_INVALID_PATH = path.join(TEST_DIR, 'Invalid.csproj')

describe('csproj-parser.ts', () => {
  beforeEach(async () => {
    // 创建临时目录和测试文件
    await fs.mkdir(TEST_DIR, { recursive: true })
    await fs.writeFile(TEST_CSPROJ_PATH, VALID_CSPROJ_WITH_VERSION, 'utf-8')
    await fs.writeFile(
      TEST_CSPROJ_NO_VERSION_PATH,
      VALID_CSPROJ_WITHOUT_VERSION,
      'utf-8'
    )
    await fs.writeFile(
      TEST_CSPROJ_MULTIPLE_PATH,
      VALID_CSPROJ_MULTIPLE_PROPERTY_GROUPS,
      'utf-8'
    )
    await fs.writeFile(TEST_INVALID_PATH, INVALID_XML, 'utf-8')
  })

  afterEach(async () => {
    // 清理临时目录
    await fs.rm(TEST_DIR, { recursive: true, force: true })
  })

  describe('parseCsproj', () => {
    it('should parse csproj file and extract version', async () => {
      const result = await parseCsproj(TEST_CSPROJ_PATH)

      expect(result.name).toBe('TestProject')
      expect(result.version).toBe('2.1.3')
      expect(result.path).toBe(TEST_DIR)
      expect(result.csprojPath).toBe(TEST_CSPROJ_PATH)
    })

    it('should return default version when Version element is missing', async () => {
      const result = await parseCsproj(TEST_CSPROJ_NO_VERSION_PATH)

      expect(result.name).toBe('NoVersion')
      expect(result.version).toBe('1.0.0') // 默认版本
    })

    it('should parse csproj with multiple PropertyGroup elements', async () => {
      const result = await parseCsproj(TEST_CSPROJ_MULTIPLE_PATH)

      expect(result.name).toBe('Multiple')
      expect(result.version).toBe('3.0.0-beta')
    })

    it('should handle invalid XML content gracefully', async () => {
      // 无效 XML 不应该抛出错误，而是返回默认版本
      const result = await parseCsproj(TEST_INVALID_PATH)
      expect(result.name).toBe('Invalid')
      // 版本可能是 null 或默认值
    })

    it('should throw error when file does not exist', async () => {
      const nonExistentPath = path.join(TEST_DIR, 'NonExistent.csproj')
      await expect(parseCsproj(nonExistentPath)).rejects.toThrow()
    })
  })

  describe('isValidCsprojPath', () => {
    it('should return true for valid csproj paths', () => {
      expect(isValidCsprojPath('/path/to/MyProject.csproj')).toBe(true)
      expect(isValidCsprojPath('./MyProject.csproj')).toBe(true)
      expect(isValidCsprojPath('MyProject.csproj')).toBe(true)
    })

    it('should return false for invalid csproj paths', () => {
      expect(isValidCsprojPath('/path/to/MyProject.txt')).toBe(false)
      expect(isValidCsprojPath('/path/to/MyProject')).toBe(false)
      expect(isValidCsprojPath('/path/../other/MyProject.csproj')).toBe(false)
    })
  })

  describe('extractProjectName', () => {
    it('should extract project name from csproj path', () => {
      expect(extractProjectName('/path/to/MyProject.csproj')).toBe('MyProject')
      expect(extractProjectName('Simple.csproj')).toBe('Simple')
      expect(extractProjectName('./relative/Path/To/ProjectName.csproj')).toBe(
        'ProjectName'
      )
    })

    it('should handle paths with dots in name', () => {
      expect(extractProjectName('/path/to/My.Project.Name.csproj')).toBe(
        'My.Project.Name'
      )
    })
  })
})

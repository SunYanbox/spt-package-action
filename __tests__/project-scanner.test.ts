/**
 * project-scanner.ts 单元测试
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  scanProjects,
  filterExcludePatterns,
  findProject
} from '../src/project-scanner.js'
import {
  VALID_CSPROJ_WITH_VERSION,
  VALID_CSPROJ_WITHOUT_VERSION
} from '../__fixtures__/csproj-parser.js'

// 创建临时测试目录结构
const TEST_DIR = path.join(process.cwd(), '__test_temp_scanner__')
const PROJECT1_DIR = path.join(TEST_DIR, 'Project1')
const PROJECT2_DIR = path.join(TEST_DIR, 'Project2')
const TEST_DIR_EXCLUDED = path.join(TEST_DIR, 'Test')
const NODE_MODULES_DIR = path.join(TEST_DIR, 'node_modules', 'some-package')

describe('project-scanner.ts', () => {
  beforeEach(async () => {
    // 创建临时目录结构
    await fs.mkdir(PROJECT1_DIR, { recursive: true })
    await fs.mkdir(PROJECT2_DIR, { recursive: true })
    await fs.mkdir(TEST_DIR_EXCLUDED, { recursive: true })
    await fs.mkdir(NODE_MODULES_DIR, { recursive: true })

    // 创建 csproj 文件
    await fs.writeFile(
      path.join(PROJECT1_DIR, 'Project1.csproj'),
      VALID_CSPROJ_WITH_VERSION,
      'utf-8'
    )
    await fs.writeFile(
      path.join(PROJECT2_DIR, 'Project2.csproj'),
      VALID_CSPROJ_WITHOUT_VERSION,
      'utf-8'
    )
    // 排除目录中的项目
    await fs.writeFile(
      path.join(TEST_DIR_EXCLUDED, 'TestProject.csproj'),
      VALID_CSPROJ_WITH_VERSION,
      'utf-8'
    )
    await fs.writeFile(
      path.join(NODE_MODULES_DIR, 'Package.csproj'),
      VALID_CSPROJ_WITH_VERSION,
      'utf-8'
    )
  })

  afterEach(async () => {
    // 清理临时目录
    await fs.rm(TEST_DIR, { recursive: true, force: true })
  })

  describe('scanProjects', () => {
    it('should find all csproj files in the directory', async () => {
      const result = await scanProjects({
        basePath: TEST_DIR,
        excludePatterns: [],
        maxDepth: 3
      })

      expect(result.length).toBe(4) // 包括 Test 和 node_modules 中的
    })

    it('should exclude Test directory', async () => {
      const result = await scanProjects({
        basePath: TEST_DIR,
        excludePatterns: ['Test'],
        maxDepth: 3
      })

      expect(result.length).toBe(3)
      expect(result.find((p) => p.name === 'TestProject')).toBeUndefined()
    })

    it('should exclude node_modules directory', async () => {
      const result = await scanProjects({
        basePath: TEST_DIR,
        excludePatterns: ['node_modules'],
        maxDepth: 3
      })

      expect(result.length).toBe(3)
      expect(result.find((p) => p.name === 'Package')).toBeUndefined()
    })

    it('should exclude multiple patterns', async () => {
      const result = await scanProjects({
        basePath: TEST_DIR,
        excludePatterns: ['Test', 'node_modules'],
        maxDepth: 3
      })

      expect(result.length).toBe(2)
      const names = result.map((p) => p.name)
      expect(names).toContain('Project1')
      expect(names).toContain('Project2')
    })

    it('should respect maxDepth parameter', async () => {
      // 创建更深层级的目录
      const deepDir = path.join(PROJECT1_DIR, 'subdir', 'deep')
      await fs.mkdir(deepDir, { recursive: true })
      await fs.writeFile(
        path.join(deepDir, 'Deep.csproj'),
        VALID_CSPROJ_WITH_VERSION,
        'utf-8'
      )

      // 深度为 1 应该找不到深层文件
      const result = await scanProjects({
        basePath: TEST_DIR,
        excludePatterns: ['Test', 'node_modules'],
        maxDepth: 1
      })

      // 应该找不到 Deep.csproj (深度为3)
      expect(result.find((p) => p.name === 'Deep')).toBeUndefined()
    })

    it('should return empty array when no csproj files found', async () => {
      const emptyDir = path.join(TEST_DIR, 'empty')
      await fs.mkdir(emptyDir, { recursive: true })

      const result = await scanProjects({
        basePath: emptyDir,
        excludePatterns: [],
        maxDepth: 5
      })

      expect(result).toEqual([])
    })
  })

  describe('filterExcludePatterns', () => {
    it('should filter paths matching exclude patterns', () => {
      const filePaths = [
        '/root/Project1/Project1.csproj',
        '/root/Test/TestProject.csproj',
        '/root/node_modules/pkg/package.csproj',
        '/root/Project2/Project2.csproj'
      ]

      const result = filterExcludePatterns(filePaths, '/root', [
        'Test',
        'node_modules'
      ])

      expect(result).toHaveLength(2)
      expect(result).toContain('/root/Project1/Project1.csproj')
      expect(result).toContain('/root/Project2/Project2.csproj')
    })

    it('should handle case-insensitive matching', () => {
      const filePaths = [
        '/root/test/project.csproj', // 小写 test
        '/root/TEST/project.csproj', // 大写 TEST
        '/root/Project/project.csproj'
      ]

      const result = filterExcludePatterns(filePaths, '/root', ['Test'])

      expect(result).toHaveLength(1)
      expect(result).toContain('/root/Project/project.csproj')
    })

    it('should return all paths when no exclude patterns', () => {
      const filePaths = ['/root/a.csproj', '/root/b.csproj']

      const result = filterExcludePatterns(filePaths, '/root', [])

      expect(result).toEqual(filePaths)
    })
  })

  describe('findProject', () => {
    it('should find project by csproj file path', async () => {
      const csprojPath = path.join(PROJECT1_DIR, 'Project1.csproj')
      const result = await findProject(csprojPath)

      expect(result).not.toBeNull()
      expect(result?.name).toBe('Project1')
      expect(result?.version).toBe('2.1.3')
    })

    it('should find project by directory path', async () => {
      const result = await findProject(PROJECT1_DIR)

      expect(result).not.toBeNull()
      expect(result?.name).toBe('Project1')
    })

    it('should return null when project not found', async () => {
      const result = await findProject('/nonexistent/path')

      expect(result).toBeNull()
    })

    it('should return null for invalid csproj path', async () => {
      const result = await findProject('/path/to/invalid.txt')

      expect(result).toBeNull()
    })
  })
})

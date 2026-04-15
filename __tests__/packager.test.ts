/**
 * packager.ts 单元测试
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  findDllFile,
  collectResourceFiles,
  createPackage
} from '../src/packager.js'
import { VALID_CSPROJ_WITH_VERSION } from '../__fixtures__/csproj-parser.js'
import type { ProjectInfo } from '../src/types.js'

// 创建临时测试目录
const TEST_DIR = path.join(process.cwd(), '__test_temp_packager__')
const PROJECT_DIR = path.join(TEST_DIR, 'TestProject')
const BIN_RELEASE_DIR = path.join(PROJECT_DIR, 'bin', 'Release', 'net6.0')
const OUTPUT_DIR = path.join(TEST_DIR, 'output')

// 创建测试项目信息
const testProjectInfo: ProjectInfo = {
  name: 'TestProject',
  version: '1.0.0',
  path: PROJECT_DIR,
  csprojPath: path.join(PROJECT_DIR, 'TestProject.csproj')
}

describe('packager.ts', () => {
  beforeEach(async () => {
    // 创建临时目录结构
    await fs.mkdir(BIN_RELEASE_DIR, { recursive: true })
    await fs.mkdir(OUTPUT_DIR, { recursive: true })

    // 创建测试 DLL 文件
    await fs.writeFile(
      path.join(BIN_RELEASE_DIR, 'TestProject.dll'),
      'DLL content'
    )

    // 创建资源文件
    const dbDir = path.join(PROJECT_DIR, 'db')
    await fs.mkdir(dbDir, { recursive: true })
    await fs.writeFile(path.join(dbDir, 'data.json'), '{"key": "value"}')
    await fs.writeFile(path.join(dbDir, 'config.xml'), '<config/>')

    // 创建源码文件（应该被排除）
    await fs.writeFile(path.join(dbDir, 'script.cs'), 'public class Script {}')

    // 创建 csproj 文件
    await fs.writeFile(
      path.join(PROJECT_DIR, 'TestProject.csproj'),
      VALID_CSPROJ_WITH_VERSION,
      'utf-8'
    )
  })

  afterEach(async () => {
    // 清理临时目录
    await fs.rm(TEST_DIR, { recursive: true, force: true })
  })

  describe('findDllFile', () => {
    it('should find DLL file in bin/Release directory', async () => {
      const result = await findDllFile(PROJECT_DIR, 'TestProject')

      expect(result).not.toBeNull()
      expect(result).toContain('TestProject.dll')
    })

    it('should return null when DLL file not found', async () => {
      const result = await findDllFile(PROJECT_DIR, 'NonExistentProject')

      expect(result).toBeNull()
    })

    it('should search in different framework directories', async () => {
      // 创建 net7.0 目录下的 DLL
      const net7Dir = path.join(PROJECT_DIR, 'bin', 'Release', 'net7.0')
      await fs.mkdir(net7Dir, { recursive: true })
      await fs.writeFile(path.join(net7Dir, 'Net7Project.dll'), 'DLL content')

      const result = await findDllFile(PROJECT_DIR, 'Net7Project')

      expect(result).not.toBeNull()
      expect(result).toContain('Net7Project.dll')
    })
  })

  describe('collectResourceFiles', () => {
    it('should collect resource files from specified directories', async () => {
      const result = await collectResourceFiles(PROJECT_DIR, ['db'], false)

      expect(result.length).toBeGreaterThan(0)
      const fileNames = result.map((f) => path.basename(f))
      expect(fileNames).toContain('data.json')
      expect(fileNames).toContain('config.xml')
    })

    it('should exclude source files by default', async () => {
      const result = await collectResourceFiles(PROJECT_DIR, ['db'], false)

      const fileNames = result.map((f) => path.basename(f))
      expect(fileNames).not.toContain('script.cs')
    })

    it('should include source files when flag is true', async () => {
      const result = await collectResourceFiles(PROJECT_DIR, ['db'], true)

      const fileNames = result.map((f) => path.basename(f))
      expect(fileNames).toContain('script.cs')
    })

    it('should return empty array when directory does not exist', async () => {
      const result = await collectResourceFiles(
        PROJECT_DIR,
        ['nonexistent'],
        false
      )

      expect(result).toEqual([])
    })

    it('should handle nested directories', async () => {
      // 创建嵌套目录
      const nestedDir = path.join(PROJECT_DIR, 'data', 'nested', 'deep')
      await fs.mkdir(nestedDir, { recursive: true })
      await fs.writeFile(path.join(nestedDir, 'deep.json'), '{}')

      const result = await collectResourceFiles(PROJECT_DIR, ['data'], false)

      const fileNames = result.map((f) => path.basename(f))
      expect(fileNames).toContain('deep.json')
    })
  })

  describe('createPackage', () => {
    it('should create package structure and copy files', async () => {
      const result = await createPackage({
        projectInfo: testProjectInfo,
        resourcePaths: [],
        includeSourceFiles: false,
        outputDir: OUTPUT_DIR
      })

      expect(result.projectName).toBe('TestProject')
      expect(result.version).toBe('1.0.0')
      expect(result.artifactName).toBe('TestProject-1.0.0')
      expect(result.zipPath).toContain('TestProject-1.0.0.zip')

      // 验证 SPT 目录结构已创建
      const sptDir = path.join(OUTPUT_DIR, 'SPT', 'user', 'mods', 'TestProject')
      const stats = await fs.stat(sptDir)
      expect(stats.isDirectory()).toBe(true)

      // 验证 DLL 已复制
      const dllPath = path.join(sptDir, 'TestProject.dll')
      const dllStats = await fs.stat(dllPath)
      expect(dllStats.isFile()).toBe(true)
    })

    it('should use custom mod folder name', async () => {
      const result = await createPackage({
        projectInfo: testProjectInfo,
        modFolderName: 'CustomMod',
        resourcePaths: [],
        includeSourceFiles: false,
        outputDir: OUTPUT_DIR
      })

      console.debug(`打包结果: ${result}`)

      // 验证自定义模组目录已创建
      const sptDir = path.join(OUTPUT_DIR, 'SPT', 'user', 'mods', 'CustomMod')
      const stats = await fs.stat(sptDir)
      expect(stats.isDirectory()).toBe(true)
    })

    it('should throw error when DLL not found', async () => {
      const projectInfoWithoutDll: ProjectInfo = {
        name: 'NonExistentProject',
        version: '1.0.0',
        path: PROJECT_DIR,
        csprojPath: path.join(PROJECT_DIR, 'NonExistent.csproj')
      }

      await expect(
        createPackage({
          projectInfo: projectInfoWithoutDll,
          resourcePaths: [],
          includeSourceFiles: false,
          outputDir: OUTPUT_DIR
        })
      ).rejects.toThrow('DLL file not found')
    })

    it('should copy resource files to mod directory', async () => {
      await createPackage({
        projectInfo: testProjectInfo,
        resourcePaths: ['db'],
        includeSourceFiles: false,
        outputDir: OUTPUT_DIR
      })

      // 验证资源文件已复制
      const sptDir = path.join(OUTPUT_DIR, 'SPT', 'user', 'mods', 'TestProject')
      const dataJson = path.join(sptDir, 'db', 'data.json')
      const configXml = path.join(sptDir, 'db', 'config.xml')

      const dataStats = await fs.stat(dataJson)
      const configStats = await fs.stat(configXml)

      expect(dataStats.isFile()).toBe(true)
      expect(configStats.isFile()).toBe(true)
    })
  })
})

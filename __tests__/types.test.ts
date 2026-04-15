/**
 * 类型定义模块测试
 */
import { describe, it, expect } from '@jest/globals'
import {
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_RESOURCE_PATHS,
  SOURCE_FILE_EXTENSIONS,
  type ProjectInfo,
  type ActionInputs,
  type PackageResult
} from '../src/types.js'

describe('types.ts', () => {
  describe('DEFAULT_EXCLUDE_PATTERNS', () => {
    it('should contain expected default exclude patterns', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('Test')
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('test')
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('node_modules')
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('.venv')
    })

    it('should have 4 default patterns', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toHaveLength(4)
    })
  })

  describe('DEFAULT_RESOURCE_PATHS', () => {
    it('should contain expected default resource paths', () => {
      expect(DEFAULT_RESOURCE_PATHS).toContain('db')
      expect(DEFAULT_RESOURCE_PATHS).toContain('data')
      expect(DEFAULT_RESOURCE_PATHS).toContain('wwwroot')
      expect(DEFAULT_RESOURCE_PATHS).toContain('res')
    })

    it('should have 4 default paths', () => {
      expect(DEFAULT_RESOURCE_PATHS).toHaveLength(4)
    })
  })

  describe('SOURCE_FILE_EXTENSIONS', () => {
    it('should contain common source file extensions', () => {
      expect(SOURCE_FILE_EXTENSIONS).toContain('.cs')
      expect(SOURCE_FILE_EXTENSIONS).toContain('.ts')
      expect(SOURCE_FILE_EXTENSIONS).toContain('.js')
      expect(SOURCE_FILE_EXTENSIONS).toContain('.py')
    })

    it('should not contain non-source extensions', () => {
      expect(SOURCE_FILE_EXTENSIONS).not.toContain('.json')
      expect(SOURCE_FILE_EXTENSIONS).not.toContain('.xml')
      expect(SOURCE_FILE_EXTENSIONS).not.toContain('.dll')
    })
  })

  describe('ProjectInfo interface', () => {
    it('should allow valid ProjectInfo object', () => {
      const projectInfo: ProjectInfo = {
        name: 'MyProject',
        version: '1.0.0',
        path: '/path/to/project',
        csprojPath: '/path/to/project/MyProject.csproj'
      }
      expect(projectInfo.name).toBe('MyProject')
      expect(projectInfo.version).toBe('1.0.0')
    })
  })

  describe('ActionInputs interface', () => {
    it('should allow valid ActionInputs object with all fields', () => {
      const inputs: ActionInputs = {
        projectPath: '/path/to/project.csproj',
        excludePatterns: ['Test', 'node_modules'],
        maxDepth: 5,
        modFolderName: 'MyMod',
        resourcePaths: ['db', 'data'],
        includeSourceFiles: false
      }
      expect(inputs.maxDepth).toBe(5)
      expect(inputs.includeSourceFiles).toBe(false)
    })

    it('should allow ActionInputs with optional fields omitted', () => {
      const inputs: ActionInputs = {
        excludePatterns: [],
        maxDepth: 5,
        resourcePaths: [],
        includeSourceFiles: false
      }
      expect(inputs.projectPath).toBeUndefined()
      expect(inputs.modFolderName).toBeUndefined()
    })
  })

  describe('PackageResult interface', () => {
    it('should allow valid PackageResult object', () => {
      const result: PackageResult = {
        projectName: 'MyProject',
        version: '1.0.0',
        zipPath: '/output/MyProject-1.0.0.zip',
        artifactName: 'MyProject-1.0.0'
      }
      expect(result.projectName).toBe('MyProject')
      expect(result.zipPath).toContain('.zip')
    })
  })
})

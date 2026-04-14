/**
 * main.ts 单元测试
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)

// Mock @actions/io
const mockMkdirP = jest.fn()
jest.unstable_mockModule('@actions/io', () => ({
  mkdirP: mockMkdirP
}))

// Mock project-scanner
const mockScanProjects = jest.fn()
const mockFindProject = jest.fn()
jest.unstable_mockModule('../src/project-scanner.js', () => ({
  scanProjects: mockScanProjects,
  findProject: mockFindProject
}))

// Mock packager
const mockCreatePackage = jest.fn()
jest.unstable_mockModule('../src/packager.js', () => ({
  createPackage: mockCreatePackage
}))

// Mock compressor
const mockCreateZip = jest.fn()
jest.unstable_mockModule('../src/compressor.js', () => ({
  createZip: mockCreateZip
}))

// Mock artifact-uploader
const mockUploadArtifact = jest.fn()
jest.unstable_mockModule('../src/artifact-uploader.js', () => ({
  uploadArtifact: mockUploadArtifact
}))

// The module being tested should be imported dynamically.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks()

    // 默认输入值
    core.getInput.mockImplementation((name: string) => {
      const defaults: Record<string, string> = {
        'project-path': '',
        'exclude-patterns': '',
        'max-depth': '5',
        'mod-folder-name': '',
        'resource-paths': '',
        'include-source-files': 'false'
      }
      return defaults[name] || ''
    })

    core.getBooleanInput.mockImplementation((name: string) => {
      return name === 'include-source-files' ? false : false
    })

    mockMkdirP.mockResolvedValue(undefined)
  })

  describe('successful execution', () => {
    it('should complete full workflow with auto-detected project', async () => {
      // 设置扫描返回单个项目
      mockScanProjects.mockResolvedValueOnce([
        {
          name: 'TestProject',
          version: '1.0.0',
          path: '/workspace/TestProject',
          csprojPath: '/workspace/TestProject/TestProject.csproj'
        }
      ])

      // 设置打包返回
      mockCreatePackage.mockResolvedValueOnce({
        projectName: 'TestProject',
        version: '1.0.0',
        zipPath: '/workspace/spt-output/TestProject-1.0.0.zip',
        artifactName: 'TestProject-1.0.0'
      })

      // 设置压缩返回
      mockCreateZip.mockResolvedValueOnce(
        '/workspace/spt-output/TestProject-1.0.0.zip'
      )

      // 设置上传返回
      mockUploadArtifact.mockResolvedValueOnce({
        artifactName: 'TestProject-1.0.0',
        artifactId: 12345,
        size: 1024
      })

      await run()

      // 验证核心方法调用
      expect(mockScanProjects).toHaveBeenCalled()
      expect(mockCreatePackage).toHaveBeenCalled()
      expect(mockCreateZip).toHaveBeenCalled()
      expect(mockUploadArtifact).toHaveBeenCalled()

      // 验证输出设置
      expect(core.setOutput).toHaveBeenCalledWith(
        'artifact-name',
        'TestProject-1.0.0'
      )
      expect(core.setOutput).toHaveBeenCalledWith('project-name', 'TestProject')
      expect(core.setOutput).toHaveBeenCalledWith('project-version', '1.0.0')
    })

    it('should complete workflow with specified project path', async () => {
      // 设置指定项目路径
      core.getInput.mockImplementation((name: string) => {
        const values: Record<string, string> = {
          'project-path': '/workspace/MyProject/MyProject.csproj',
          'exclude-patterns': '',
          'max-depth': '5',
          'mod-folder-name': '',
          'resource-paths': '',
          'include-source-files': 'false'
        }
        return values[name] || ''
      })

      // 设置查找项目返回
      mockFindProject.mockResolvedValueOnce({
        name: 'MyProject',
        version: '2.0.0',
        path: '/workspace/MyProject',
        csprojPath: '/workspace/MyProject/MyProject.csproj'
      })

      // 设置打包返回
      mockCreatePackage.mockResolvedValueOnce({
        projectName: 'MyProject',
        version: '2.0.0',
        zipPath: '/workspace/spt-output/MyProject-2.0.0.zip',
        artifactName: 'MyProject-2.0.0'
      })

      mockCreateZip.mockResolvedValueOnce(
        '/workspace/spt-output/MyProject-2.0.0.zip'
      )

      mockUploadArtifact.mockResolvedValueOnce({
        artifactName: 'MyProject-2.0.0',
        artifactId: 67890,
        size: 2048
      })

      await run()

      expect(mockFindProject).toHaveBeenCalled()
      expect(mockScanProjects).not.toHaveBeenCalled()
      expect(core.setOutput).toHaveBeenCalledWith('project-name', 'MyProject')
    })
  })

  describe('error handling', () => {
    it('should fail when no projects found', async () => {
      mockScanProjects.mockResolvedValueOnce([])

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'No .csproj files found in the repository'
      )
    })

    it('should fail when multiple projects found', async () => {
      mockScanProjects.mockResolvedValueOnce([
        {
          name: 'Project1',
          version: '1.0.0',
          path: '/p1',
          csprojPath: '/p1/p1.csproj'
        },
        {
          name: 'Project2',
          version: '1.0.0',
          path: '/p2',
          csprojPath: '/p2/p2.csproj'
        }
      ])

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('Multiple projects found')
      )
    })

    it('should fail when specified project not found', async () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'project-path') return '/nonexistent/project.csproj'
        return ''
      })

      mockFindProject.mockResolvedValueOnce(null)

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('Project not found')
      )
    })

    it('should handle errors gracefully', async () => {
      mockScanProjects.mockRejectedValueOnce(new Error('Scan failed'))

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Scan failed')
    })
  })
})

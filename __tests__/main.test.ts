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

      // 验证输出设置（JSON 数组格式）
      expect(core.setOutput).toHaveBeenCalledWith(
        'artifact-name',
        JSON.stringify(['TestProject-1.0.0'])
      )
      expect(core.setOutput).toHaveBeenCalledWith(
        'project-name',
        JSON.stringify(['TestProject'])
      )
      expect(core.setOutput).toHaveBeenCalledWith(
        'project-version',
        JSON.stringify(['1.0.0'])
      )
    })

    it('should complete workflow with specified project path', async () => {
      // 设置指定项目路径（单行输入）
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
      // 验证输出为 JSON 数组格式
      expect(core.setOutput).toHaveBeenCalledWith(
        'project-name',
        JSON.stringify(['MyProject'])
      )
    })

    it('should package multiple projects from specified paths', async () => {
      // 设置多个项目路径（多行输入）
      core.getInput.mockImplementation((name: string) => {
        const values: Record<string, string> = {
          'project-path':
            '/workspace/ProjectA/ProjectA.csproj\n/workspace/ProjectB/ProjectB.csproj',
          'exclude-patterns': '',
          'max-depth': '5',
          'mod-folder-name': '',
          'resource-paths': '',
          'include-source-files': 'false'
        }
        return values[name] || ''
      })

      // 设置查找项目返回
      mockFindProject
        .mockResolvedValueOnce({
          name: 'ProjectA',
          version: '1.0.0',
          path: '/workspace/ProjectA',
          csprojPath: '/workspace/ProjectA/ProjectA.csproj'
        })
        .mockResolvedValueOnce({
          name: 'ProjectB',
          version: '2.0.0',
          path: '/workspace/ProjectB',
          csprojPath: '/workspace/ProjectB/ProjectB.csproj'
        })

      // 设置打包返回
      mockCreatePackage
        .mockResolvedValueOnce({
          projectName: 'ProjectA',
          version: '1.0.0',
          zipPath: '/workspace/spt-output/ProjectA-1.0.0.zip',
          artifactName: 'ProjectA-1.0.0'
        })
        .mockResolvedValueOnce({
          projectName: 'ProjectB',
          version: '2.0.0',
          zipPath: '/workspace/spt-output/ProjectB-2.0.0.zip',
          artifactName: 'ProjectB-2.0.0'
        })

      mockCreateZip.mockResolvedValue('/workspace/spt-output/test.zip')

      mockUploadArtifact
        .mockResolvedValueOnce({
          artifactName: 'ProjectA-1.0.0',
          artifactId: 111,
          size: 1024
        })
        .mockResolvedValueOnce({
          artifactName: 'ProjectB-2.0.0',
          artifactId: 222,
          size: 2048
        })

      await run()

      // 验证调用了两次 findProject
      expect(mockFindProject).toHaveBeenCalledTimes(2)
      expect(mockScanProjects).not.toHaveBeenCalled()

      // 验证输出为 JSON 数组格式（多个项目）
      expect(core.setOutput).toHaveBeenCalledWith(
        'project-name',
        JSON.stringify(['ProjectA', 'ProjectB'])
      )
      expect(core.setOutput).toHaveBeenCalledWith(
        'project-version',
        JSON.stringify(['1.0.0', '2.0.0'])
      )
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

    it('should warn and continue when more than 3 projects found', async () => {
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
        },
        {
          name: 'Project3',
          version: '1.0.0',
          path: '/p3',
          csprojPath: '/p3/p3.csproj'
        },
        {
          name: 'Project4',
          version: '1.0.0',
          path: '/p4',
          csprojPath: '/p4/p4.csproj'
        }
      ])

      // 设置打包返回
      mockCreatePackage.mockResolvedValue({
        projectName: 'TestProject',
        version: '1.0.0',
        zipPath: '/workspace/spt-output/TestProject-1.0.0.zip',
        artifactName: 'TestProject-1.0.0'
      })

      mockCreateZip.mockResolvedValue(
        '/workspace/spt-output/TestProject-1.0.0.zip'
      )

      mockUploadArtifact.mockResolvedValue({
        artifactName: 'TestProject-1.0.0',
        artifactId: 12345,
        size: 1024
      })

      await run()

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Found 4 projects')
      )
      expect(core.setFailed).not.toHaveBeenCalled()
    })

    it('should skip non-existent project paths and continue', async () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'project-path') {
          return '/nonexistent/project.csproj\n/workspace/existing.csproj'
        }
        return ''
      })

      mockFindProject
        .mockResolvedValueOnce(null) // 第一个路径不存在
        .mockResolvedValueOnce({
          // 第二个路径存在
          name: 'ExistingProject',
          version: '1.0.0',
          path: '/workspace',
          csprojPath: '/workspace/existing.csproj'
        })

      mockCreatePackage.mockResolvedValueOnce({
        projectName: 'ExistingProject',
        version: '1.0.0',
        zipPath: '/workspace/spt-output/ExistingProject-1.0.0.zip',
        artifactName: 'ExistingProject-1.0.0'
      })

      mockCreateZip.mockResolvedValueOnce(
        '/workspace/spt-output/ExistingProject-1.0.0.zip'
      )

      mockUploadArtifact.mockResolvedValueOnce({
        artifactName: 'ExistingProject-1.0.0',
        artifactId: 12345,
        size: 1024
      })

      await run()

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Project not found')
      )
      expect(core.setOutput).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      mockScanProjects.mockRejectedValueOnce(new Error('Scan failed'))

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Scan failed')
    })
  })
})

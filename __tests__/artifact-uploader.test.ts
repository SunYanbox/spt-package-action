/**
 * artifact-uploader.ts 单元测试
 */
import { jest } from '@jest/globals'
import * as artifactMock from '../__fixtures__/artifact.js'

// Mock @actions/artifact
jest.unstable_mockModule('@actions/artifact', () => artifactMock)

const { mockUploadArtifact } = artifactMock

// 动态导入被测试模块
const { uploadArtifact, generateArtifactName } =
  await import('../src/artifact-uploader.js')

describe('artifact-uploader.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('uploadArtifact', () => {
    it('should upload artifact successfully', async () => {
      // 设置 mock 返回值
      mockUploadArtifact.mockResolvedValueOnce({
        id: 12345,
        size: 1024,
        digest: 'sha256:abc123'
      })

      const result = await uploadArtifact({
        filePath: '/output/TestProject-1.0.0.zip',
        artifactName: 'TestProject-1.0.0',
        retentionDays: 3
      })

      expect(result.artifactName).toBe('TestProject-1.0.0')
      expect(result.artifactId).toBe(12345)
      expect(result.size).toBe(1024)

      // 验证 mock 调用
      expect(mockUploadArtifact).toHaveBeenCalledWith(
        'TestProject-1.0.0',
        ['/output/TestProject-1.0.0.zip'],
        '/output',
        { retentionDays: 3, skipArchive: true }
      )
    })

    it('should use default retention days', async () => {
      mockUploadArtifact.mockResolvedValueOnce({
        id: 1,
        size: 100,
        digest: 'sha256:def456'
      })

      await uploadArtifact({
        filePath: '/output/test.zip',
        artifactName: 'Test'
      })

      expect(mockUploadArtifact).toHaveBeenCalledWith(
        'Test',
        ['/output/test.zip'],
        '/output',
        { retentionDays: 3, skipArchive: true }
      )
    })

    it('should throw error when upload fails (no digest)', async () => {
      mockUploadArtifact.mockResolvedValueOnce({
        id: 0,
        size: 0
      })

      await expect(
        uploadArtifact({
          filePath: '/output/test.zip',
          artifactName: 'Test'
        })
      ).rejects.toThrow('Failed to upload artifact')
    })

    it('should throw error when digest is empty', async () => {
      mockUploadArtifact.mockResolvedValueOnce({
        id: 1,
        size: 100,
        digest: ''
      })

      await expect(
        uploadArtifact({
          filePath: '/output/test.zip',
          artifactName: 'Test'
        })
      ).rejects.toThrow('Failed to upload artifact')
    })

    it('should handle custom retention days', async () => {
      mockUploadArtifact.mockResolvedValueOnce({
        id: 1,
        size: 100,
        digest: 'sha256:xyz789'
      })

      await uploadArtifact({
        filePath: '/output/test.zip',
        artifactName: 'Test',
        retentionDays: 30
      })

      expect(mockUploadArtifact).toHaveBeenCalledWith(
        'Test',
        ['/output/test.zip'],
        '/output',
        { retentionDays: 30, skipArchive: true }
      )
    })

    it('should pass skipArchive option when set to true', async () => {
      mockUploadArtifact.mockResolvedValueOnce({
        id: 1,
        size: 100,
        digest: 'sha256:xyz789'
      })

      await uploadArtifact({
        filePath: '/output/test.zip',
        artifactName: 'Test'
      })

      expect(mockUploadArtifact).toHaveBeenCalledWith(
        'Test',
        ['/output/test.zip'],
        '/output',
        { retentionDays: 3, skipArchive: true }
      )
    })
  })

  describe('generateArtifactName', () => {
    it('should generate artifact name from project and version', () => {
      const result = generateArtifactName('MyProject', '1.0.0')
      expect(result).toBe('MyProject-1.0.0')
    })

    it('should handle version with special characters', () => {
      const result = generateArtifactName('MyProject', '1.0.0-beta+build')
      expect(result).toBe('MyProject-1.0.0-beta_build')
    })

    it('should handle version with spaces', () => {
      const result = generateArtifactName('MyProject', '1.0.0 beta')
      expect(result).toBe('MyProject-1.0.0_beta')
    })
  })
})

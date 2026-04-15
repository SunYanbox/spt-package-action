import { jest } from '@jest/globals'

export const mockUploadArtifact = jest.fn()

export class DefaultArtifactClient {
  uploadArtifact = mockUploadArtifact
}

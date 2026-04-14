/**
 * SPT Package Action 主逻辑
 * 整合所有模块，完成模组打包流程
 */
import * as core from '@actions/core'
import * as io from '@actions/io'
import path from 'node:path'
import {
  DEFAULT_EXCLUDE_PATTERNS,
  // DEFAULT_RESOURCE_PATHS,
  type ActionInputs
} from './types.js'
import { scanProjects, findProject } from './project-scanner.js'
import { createPackage } from './packager.js'
import { createZip } from './compressor.js'
import { uploadArtifact } from './artifact-uploader.js'

/**
 * 解析多行文本输入为数组
 */
function parseMultilineInput(input: string): string[] {
  if (!input || input.trim() === '') {
    return []
  }
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * 获取 Action 输入参数
 */
function getInputs(): ActionInputs {
  const projectPath = core.getInput('project-path') || undefined
  const excludeInput = core.getInput('exclude-patterns')
  const maxDepth = parseInt(core.getInput('max-depth') || '5', 10)
  const modFolderName = core.getInput('mod-folder-name') || undefined
  const resourceInput = core.getInput('resource-paths')
  const includeSourceFiles = core.getBooleanInput('include-source-files')

  // 解析排除模式（追加到默认值）
  const excludePatterns = [
    ...DEFAULT_EXCLUDE_PATTERNS,
    ...parseMultilineInput(excludeInput)
  ]

  // 解析资源路径（追加到默认值）
  const resourcePaths = parseMultilineInput(resourceInput)

  return {
    projectPath,
    excludePatterns,
    maxDepth,
    modFolderName,
    resourcePaths,
    includeSourceFiles
  }
}

/**
 * 主运行函数
 */
export async function run(): Promise<void> {
  try {
    core.info('Starting SPT Package Action...')

    // 获取输入参数
    const inputs = getInputs()
    core.info(`Max depth: ${inputs.maxDepth}`)
    core.info(`Exclude patterns: ${inputs.excludePatterns.join(', ')}`)

    // 获取工作目录
    const workDir = process.cwd()
    core.info(`Working directory: ${workDir}`)

    // 创建输出目录
    const outputDir = path.join(workDir, 'spt-output')
    await io.mkdirP(outputDir)
    core.info(`Output directory: ${outputDir}`)

    // 查找项目
    let projectInfo
    if (inputs.projectPath) {
      // 使用指定的项目路径
      core.info(`Using specified project path: ${inputs.projectPath}`)
      const absoluteProjectPath = path.isAbsolute(inputs.projectPath)
        ? inputs.projectPath
        : path.join(workDir, inputs.projectPath)

      projectInfo = await findProject(absoluteProjectPath)
      if (!projectInfo) {
        core.setFailed(`Project not found at: ${inputs.projectPath}`)
        return
      }
    } else {
      // 自动扫描项目
      core.info('Scanning for projects...')
      const projects = await scanProjects({
        basePath: workDir,
        excludePatterns: inputs.excludePatterns,
        maxDepth: inputs.maxDepth
      })

      if (projects.length === 0) {
        core.setFailed('No .csproj files found in the repository')
        return
      }

      if (projects.length > 1) {
        const projectNames = projects.map((p) => p.name).join(', ')
        core.setFailed(
          `Multiple projects found: ${projectNames}. Please specify project-path input.`
        )
        return
      }

      projectInfo = projects[0]
    }

    core.info(`Found project: ${projectInfo.name} v${projectInfo.version}`)

    // 创建打包结构
    core.info('Creating package structure...')
    const packageResult = await createPackage({
      projectInfo,
      modFolderName: inputs.modFolderName,
      resourcePaths: inputs.resourcePaths,
      includeSourceFiles: inputs.includeSourceFiles,
      outputDir
    })
    core.info(`Package created: ${packageResult.artifactName}`)

    // 压缩 SPT 目录
    core.info('Compressing package...')
    const sptDir = path.join(outputDir, 'SPT')
    await createZip(sptDir, packageResult.zipPath)
    core.info(`Zip file created: ${packageResult.zipPath}`)

    // 上传 artifact
    core.info('Uploading artifact...')
    const uploadResult = await uploadArtifact({
      filePath: packageResult.zipPath,
      artifactName: packageResult.artifactName,
      retentionDays: 90
    })
    core.info(
      `Artifact uploaded: ${uploadResult.artifactName} (ID: ${uploadResult.artifactId})`
    )

    // 设置输出
    core.setOutput('artifact-name', uploadResult.artifactName)
    core.setOutput('artifact-path', packageResult.zipPath)
    core.setOutput('project-name', projectInfo.name)
    core.setOutput('project-version', projectInfo.version)

    core.info('SPT Package Action completed successfully!')
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}

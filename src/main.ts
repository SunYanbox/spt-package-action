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
  type ActionInputs,
  type ProjectInfo
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
  const projectPathInput = core.getInput('project-path')
  const excludeInput = core.getInput('exclude-patterns')
  const maxDepth = parseInt(core.getInput('max-depth') || '5', 10)
  const modFolderName = core.getInput('mod-folder-name') || undefined
  const resourceInput = core.getInput('resource-paths')
  const includeSourceFiles = core.getBooleanInput('include-source-files')

  // 解析项目路径（多行输入）
  const projectPaths = parseMultilineInput(projectPathInput)

  // 解析排除模式（追加到默认值）
  const excludePatterns = [
    ...DEFAULT_EXCLUDE_PATTERNS,
    ...parseMultilineInput(excludeInput)
  ]

  // 解析资源路径（追加到默认值）
  const resourcePaths = parseMultilineInput(resourceInput)

  return {
    projectPaths,
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

    // 获取工作目录（优先使用 GITHUB_WORKSPACE 环境变量）
    const workDir = process.env.GITHUB_WORKSPACE || process.cwd()
    core.info(`Working directory: ${workDir}`)

    // 创建输出目录
    const outputDir = path.join(workDir, 'spt-output')
    await io.mkdirP(outputDir)
    core.info(`Output directory: ${outputDir}`)

    // 收集项目信息
    let projects: ProjectInfo[]

    if (inputs.projectPaths.length > 0) {
      // 使用指定的项目路径列表
      core.info(
        `Using specified project paths: ${inputs.projectPaths.join(', ')}`
      )
      projects = []
      for (const projectPath of inputs.projectPaths) {
        const absoluteProjectPath = path.isAbsolute(projectPath)
          ? projectPath
          : path.join(workDir, projectPath)

        const projectInfo = await findProject(absoluteProjectPath)
        if (projectInfo) {
          projects.push(projectInfo)
        } else {
          core.warning(`Project not found at: ${projectPath}, skipping...`)
        }
      }
    } else {
      // 自动扫描项目
      core.info('Scanning for projects...')
      projects = await scanProjects({
        basePath: workDir,
        excludePatterns: inputs.excludePatterns,
        maxDepth: inputs.maxDepth
      })
    }

    // 检查找到的项目数量
    if (projects.length === 0) {
      core.setFailed('No .csproj files found in the repository')
      return
    }

    // 超过 3 个项目时警告
    if (projects.length > 3) {
      const projectNames = projects.map((p) => p.name).join(', ')
      core.warning(
        `Found ${projects.length} projects: ${projectNames}. Consider specifying project-path for better control.`
      )
    }

    // 打包结果收集
    const results: {
      projectName: string
      version: string
      artifactName: string
      artifactPath: string
    }[] = []

    // 遍历每个项目进行打包
    for (const projectInfo of projects) {
      core.info(
        `Processing project: ${projectInfo.name} v${projectInfo.version}`
      )

      try {
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

        let uploadResult = null
        // 上传 artifact
        if (!process.env.SKIP_ARTIFACT_UPLOAD) {
          core.info('Uploading artifact...')
          uploadResult = await uploadArtifact({
            filePath: packageResult.zipPath,
            artifactName: packageResult.artifactName,
            retentionDays: 90
          })
          core.info(
            `Artifact uploaded: ${uploadResult.artifactName} (ID: ${uploadResult.artifactId})`
          )
        } else {
          // 跳过打包
          core.info('artifact skiped by env')
        }

        results.push({
          projectName: projectInfo.name,
          version: projectInfo.version,
          artifactName: uploadResult?.artifactName || '<Skip Artifact>',
          artifactPath: packageResult.zipPath
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        core.warning(
          `Failed to package project ${projectInfo.name}: ${errorMessage}`
        )
      }
    }

    // 检查是否有成功打包的项目
    if (results.length === 0) {
      core.setFailed('No projects were successfully packaged')
      return
    }

    // 设置输出（JSON 数组格式）
    const projectNames = results.map((r) => r.projectName)
    const versions = results.map((r) => r.version)
    const artifactNames = results.map((r) => r.artifactName)
    const artifactPaths = results.map((r) => r.artifactPath)

    core.setOutput('project-name', JSON.stringify(projectNames))
    core.setOutput('project-version', JSON.stringify(versions))
    core.setOutput('artifact-name', JSON.stringify(artifactNames))
    core.setOutput('artifact-path', JSON.stringify(artifactPaths))

    core.info(
      `SPT Package Action completed successfully! Packaged ${results.length} project(s)`
    )
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}

# AGENTS.md - 项目上下文说明

## 项目概述

这是一个 **GitHub Action TypeScript 项目**，用于打包 SPT (Single Player
Tarkov) 游戏模组。项目使用 TypeScript 编写，通过 Rollup 打包成单个 JavaScript 文件，可在 GitHub
Actions 工作流中使用。

### 核心功能

- 自动扫描或手动指定 .csproj 项目文件
- 解析项目信息（名称、版本号）
- 查找编译输出的 DLL 文件
- 收集资源文件（db、data、wwwroot、res 等）
- 创建符合 SPT 模组结构的 ZIP 压缩包
- 上传产物到 GitHub Artifacts
- 支持多项目批量打包

## 技术栈

| 技术          | 版本/说明         |
| ------------- | ----------------- |
| Node.js       | >= 24.14.0        |
| TypeScript    | 5.9.x             |
| 打包工具      | Rollup            |
| 测试框架      | Jest (ts-jest)    |
| 代码检查      | ESLint + Prettier |
| Action 运行时 | node24            |

## 项目结构

```txt
spt-package-action/
├── src/                       # 源代码目录
│   ├── index.ts              # 入口文件，调用 main.ts 的 run()
│   ├── main.ts               # 主逻辑，协调各模块完成打包流程
│   ├── types.ts              # 核心类型定义（ProjectInfo, ActionInputs 等）
│   ├── project-scanner.ts    # 项目扫描，检索 .csproj 文件
│   ├── csproj-parser.ts      # csproj XML 解析，提取项目信息
│   ├── packager.ts           # 打包逻辑，处理 DLL 和资源文件
│   ├── compressor.ts         # ZIP 压缩模块
│   ├── artifact-uploader.ts  # GitHub Artifacts 上传
│   └── wait.ts               # 工具函数（等待）
├── __tests__/                # Jest 测试文件
│   ├── main.test.ts          # 主逻辑测试
│   ├── types.test.ts         # 类型定义测试
│   ├── project-scanner.test.ts
│   ├── csproj-parser.test.ts
│   ├── packager.test.ts
│   ├── compressor.test.ts
│   ├── artifact-uploader.test.ts
│   └── wait.test.ts
├── __fixtures__/             # 测试 mock 文件
│   ├── core.ts               # @actions/core 的 mock
│   ├── artifact.ts           # @actions/artifact 的 mock
│   ├── csproj-parser.ts      # csproj 解析的 mock
│   └── wait.ts               # wait 函数的 mock
├── dist/                     # 编译输出目录 (git tracked)
├── .github/workflows/        # CI/CD 工作流配置
├── action.yml                # Action 元数据定义
├── package.json              # 项目配置和脚本
├── tsconfig.json             # TypeScript 配置
├── jest.config.js            # Jest 测试配置
├── rollup.config.ts          # Rollup 打包配置
└── eslint.config.mjs         # ESLint 配置 (flat config)
```

## 关键命令

### 开发命令

```bash
# 安装依赖
npm install

# 格式化代码
npm run format:write

# 检查代码格式
npm run format:check

# 代码检查 (ESLint)
npm run lint

# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run coverage

# 打包 (Rollup)
npm run package

# 打包并监听文件变化
npm run package:watch
```

### 组合命令

```bash
# 格式化 + 打包
npm run bundle

# 完整开发流程：格式化 → lint → 测试 → 覆盖率 → 打包
npm run all
```

### 本地测试

```bash
# 使用 @github/local-action 本地运行 Action
npm run local-action

# 或手动指定参数
npx @github/local-action . src/main.ts .env
```

## Action 配置 (action.yml)

### 输入参数

| 参数                   | 类型   | 必需 | 默认     | 描述                   |
| ---------------------- | ------ | ---- | -------- | ---------------------- |
| `project-path`         | string | 否   | `''`     | .csproj 路径，空则自动 |
| `exclude-patterns`     | string | 否   | `''`     | 排除模式，追加默认值   |
| `max-depth`            | string | 否   | `'5'`    | 扫描最大深度           |
| `mod-folder-name`      | string | 否   | `''`     | 模组文件夹名，默认项目 |
| `resource-paths`       | string | 否   | `''`     | 资源目录，追加默认值   |
| `include-source-files` | string | 否   | `'false'`| 包含源码 (.cs, .ts)    |

### 输出参数

| 参数              | 描述                         |
| ----------------- | ---------------------------- |
| `artifact-name`   | 上传的压缩包名称（JSON）     |
| `artifact-path`   | 生成的压缩包文件路径（JSON） |
| `project-name`    | 打包的项目名称（JSON）       |
| `project-version` | 项目版本号（JSON）           |

### 默认配置

- **默认排除模式**: `Test`, `test`, `node_modules`, `.venv`
- **默认资源路径**: `db`, `data`, `wwwroot`, `res`
- **输出结构**: `SPT/user/mods/{mod-folder-name}/`

## 模块架构

```txt
main.ts (主控制器)
    │
    ├── project-scanner.ts    → 扫描/查找 .csproj 文件
    │       └── csproj-parser.ts → 解析 XML 提取项目信息
    │
    ├── packager.ts           → 创建打包目录结构
    │       ├── 查找 DLL 文件 (bin/Release/*.dll)
    │       └── 收集资源文件
    │
    ├── compressor.ts         → 压缩为 ZIP 文件
    │
    └── artifact-uploader.ts  → 上传到 GitHub Artifacts
```

## 开发规范

### TypeScript 规范

- 目标版本: ES2022
- 模块系统: NodeNext (ESM)
- 严格模式已启用 (`strict: true`)
- 未使用的变量会报错 (`noUnusedLocals: true`)

### 测试规范

- 使用 Jest + ts-jest 进行单元测试
- 测试文件命名: `*.test.ts`
- Mock 文件放在 `__fixtures__/` 目录
- 使用 `jest.unstable_mockModule` 进行 ESM 模块 mock
- 测试覆盖范围: `src/**` 目录

### 代码风格

- 使用 Prettier 进行代码格式化
- 使用 ESLint 进行代码检查
- 配置文件: `eslint.config.mjs` (flat config)

### 导入规范

- ESM 模块导入需要添加 `.js` 扩展名

  ```typescript
  // 正确
  import { wait } from './wait.js'

  // 错误
  import { wait } from './wait'
  ```

## CI/CD 工作流

| 工作流文件            | 触发条件        | 用途                |
| --------------------- | --------------- | ------------------- |
| `ci.yml`              | PR/push to main | 持续集成测试        |
| `check-dist.yml`      | PR/push to main | 检查 dist/ 是否同步 |
| `linter.yml`          | PR/push to main | 代码检查            |
| `codeql-analysis.yml` | 定时/PR/push    | 安全分析            |
| `licensed.yml`        | 手动触发        | 依赖许可证检查      |

## 依赖说明

### 生产依赖

| 依赖                | 用途                      |
| ------------------- | ------------------------- |
| `@actions/core`     | GitHub Actions 核心工具库 |
| `@actions/artifact` | Artifacts 上传/下载       |
| `@actions/glob`     | 文件模式匹配              |
| `@actions/io`       | 文件系统操作              |
| `archiver`          | ZIP 压缩                  |
| `fast-xml-parser`   | XML 解析（解析 .csproj）  |

### 开发依赖

- TypeScript 工具链: `typescript`, `ts-jest`
- 打包工具: `rollup`, 相关插件
- 测试工具: `jest`, `@jest/globals`
- 代码检查: `eslint`, `prettier`, 相关插件

## 发布流程

1. 创建发布分支: `git checkout -b releases/v1`
2. 修改 `src/` 中的代码
3. 添加测试到 `__tests__/`
4. 运行完整流程: `npm run all`
5. 本地测试: `npm run local-action`
6. 提交并推送更改
7. 创建 PR 并合并到 main
8. 使用 `script/release` 脚本创建版本标签

## 注意事项

1. **dist/ 目录**: 编译后的 `dist/index.js` 需要提交到 Git，因为 GitHub
   Actions 会直接运行此文件

2. **Node.js 版本**: 项目要求 Node.js >= 24.14.0，`.node-version`
   文件定义了具体版本

3. **本地调试**: 使用 `.env` 文件设置环境变量，参考 `.env.example`
   - 设置 `SKIP_ARTIFACT_UPLOAD=true` 可跳过 artifact 上传

4. **多项目打包**: 支持同时打包多个项目，输出参数为 JSON 数组格式

5. **ESM 模块**: 项目使用 ESM 模块系统，Jest 测试需要启用
   `--experimental-vm-modules`

6. **DLL 查找逻辑**: 在项目的 `bin/Release` 目录下递归搜索与项目同名的 `.dll`
   文件

# SPT Package Action

![Linter](https://github.com/SunYanbox/spt-package-action/actions/workflows/linter.yml/badge.svg)
![CI](https://github.com/SunYanbox/spt-package-action/actions/workflows/ci.yml/badge.svg)
![Check dist/](https://github.com/SunYanbox/spt-package-action/actions/workflows/check-dist.yml/badge.svg)
![CodeQL](https://github.com/SunYanbox/spt-package-action/actions/workflows/codeql-analysis.yml/badge.svg)
![Coverage](./badges/coverage.svg)

一个用于将 SPT（单机版塔科夫）模组打包成可分发的 zip 文件的 GitHub Action。

[English](README.md) / 中文

## 功能特性

- 自动扫描 `.csproj` 文件或使用指定的项目路径
- 从 `.csproj` 文件中提取项目名称和版本号
- 在 `bin/Release` 目录中查找编译好的 DLL 文件
- 收集资源文件（db、data、wwwroot、res 等）
- 创建正确的 SPT 模组文件夹结构（`SPT/user/mods/{模组名称}/`）
- 压缩成可分发的 zip 文件
- 将工件上传到 GitHub，保留 3 天
- 支持一次运行中打包多个项目

## 使用方法

### 基本用法

```yaml
name: Package SPT Mod

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'

      - name: Build
        run: dotnet build -c Release

      - name: Package SPT Mod
        id: package
        uses: SunYanbox/spt-package-action@v1

      - name: Print Output
        run: |
          echo "Project: ${{ steps.package.outputs.project-name }}"
          echo "Version: ${{ steps.package.outputs.project-version }}"
          echo "Artifact: ${{ steps.package.outputs.artifact-name }}"
```

### 带自定义选项

```yaml
- name: Package SPT Mod
  uses: SunYanbox/spt-package-action@v1
  with:
    project-path: |
      MyMod/MyMod.csproj
    mod-folder-name: MyCustomMod
    resource-paths: |
      assets
      config
    exclude-patterns: |
      Build
      temp
    max-depth: '3'
    include-source-files: 'false'
```

### 多个项目

该操作支持同时打包多个项目：

```yaml
- name: Package Multiple SPT Mods
  uses: SunYanbox/spt-package-action@v1
  with:
    project-path: |
      ModA/ModA.csproj
      ModB/ModB.csproj
```

输出将是包含所有项目值的 JSON 数组。

## 输入参数

| 输入                   | 描述                       | 必需 | 默认      |
| ---------------------- | -------------------------- | ---- | --------- |
| `project-path`         | .csproj 路径，空则自动检测 | 否   | `''`      |
| `exclude-patterns`     | 排除模式，追加到默认值     | 否   | `''`      |
| `max-depth`            | 扫描最大深度               | 否   | `'5'`     |
| `mod-folder-name`      | 模组文件夹名，默认项目名称 | 否   | `''`      |
| `resource-paths`       | 资源目录，追加到默认值     | 否   | `''`      |
| `include-source-files` | 包含源码文件 (.cs, .ts)    | 否   | `'false'` |

## 输出参数

| 输出              | 描述                             |
| ----------------- | -------------------------------- |
| `artifact-name`   | 压缩包名称(多项目时为 JSON 数组) |
| `artifact-path`   | 压缩包路径(多项目时为 JSON 数组) |
| `project-name`    | 项目名称(多项目时为 JSON 数组)   |
| `project-version` | 项目版本(多项目时为 JSON 数组)   |

## 输出结构

该操作在打包前会创建以下目录结构：

```txt
SPT/
└── user/
    └── mods/
        └── {模组文件夹名称}/
            ├── {项目名称}.dll
            ├── db/
            ├── data/
            ├── wwwroot/
            └── res/
```

然后，此结构会被压缩成一个名为 `{项目名称}-{版本号}.zip` 的 zip 文件。

## 工作原理

1. **项目检测**：扫描仓库中的 `.csproj` 文件或使用指定的路径
2. **项目解析**：从每个 `.csproj` 文件中提取项目名称和版本号
3. **DLL 查找**：在 `bin/Release` 目录中查找编译好的 DLL（支持 .NET 6/7/8）
4. **资源收集**：从默认路径和指定路径收集资源文件
5. **打包创建**：创建 SPT 模组文件夹结构并复制所有文件
6. **压缩**：将 `SPT` 目录压缩成 zip 文件
7. **工件上传**：将 zip 文件作为 GitHub 工件上传

## 环境要求

- 在运行此操作之前，必须使用 `dotnet build -c Release` 构建项目
- 编译好的 DLL 文件应位于 `bin/Release` 目录中
- `.csproj` 文件必须在 `<PropertyGroup>` 中包含 `<Version>` 元素

`.csproj` 示例：

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Version>1.0.0</Version>
  </PropertyGroup>
</Project>
```

## 开发

### 安装

```bash
npm install
```

### 构建

```bash
npm run bundle
```

### 测试

```bash
npm test
```

### 本地测试

使用 `@github/local-action` 工具进行本地测试：

```bash
npx @github/local-action . src/main.ts .env
```

## 许可证

本项目根据 [LICENSE](LICENSE) 文件中指定的条款进行许可。

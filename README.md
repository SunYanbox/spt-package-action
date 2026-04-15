# SPT Package Action

![Linter](https://github.com/SunYanbox/spt-package-action/actions/workflows/linter.yml/badge.svg)
![CI](https://github.com/SunYanbox/spt-package-action/actions/workflows/ci.yml/badge.svg)
![Check dist/](https://github.com/SunYanbox/spt-package-action/actions/workflows/check-dist.yml/badge.svg)
![CodeQL](https://github.com/SunYanbox/spt-package-action/actions/workflows/codeql-analysis.yml/badge.svg)
![Coverage](./badges/coverage.svg)

A GitHub Action that packages SPT (Single Player Tarkov) mods into distributable
zip files.

English / [中文](README_ZH.md)

## Features

- Automatically scans for `.csproj` files or uses specified project paths
- Extracts project name and version from `.csproj` files
- Finds compiled DLL files in `bin/Release` directory
- Collects resource files (db, data, wwwroot, res, etc.)
- Creates proper SPT mod folder structure (`SPT/user/mods/{mod-name}/`)
- Compresses into distributable zip files
- Uploads artifacts to GitHub with 3-day retention
- Supports multiple projects in a single run

## Usage

### Basic Usage

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

### With Custom Options

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

### Multiple Projects

The action supports packaging multiple projects simultaneously:

```yaml
- name: Package Multiple SPT Mods
  uses: SunYanbox/spt-package-action@v1
  with:
    project-path: |
      ModA/ModA.csproj
      ModB/ModB.csproj
```

Outputs will be JSON arrays containing values for all projects.

## Inputs

| Input                  | Description                                                                                                                        | Required | Default                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------ |
| `project-path`         | Path(s) to `.csproj` file(s), one per line. If not specified, auto-detects `.csproj` files.                                        | No       | `''`                     |
| `exclude-patterns`     | Additional directory patterns to exclude from scanning (one per line). Default exclusions: `Test`, `test`, `node_modules`, `.venv` | No       | `''`                     |
| `max-depth`            | Maximum depth to scan for `.csproj` files                                                                                          | No       | `'5'`                    |
| `mod-folder-name`      | Custom name for the mod folder. Output path: `SPT/user/mods/{mod-folder-name}/`                                                    | No       | `''` (uses project name) |
| `resource-paths`       | Additional resource directories to include (one per line). Default: `db`, `data`, `wwwroot`, `res`                                 | No       | `''`                     |
| `include-source-files` | Whether to include source code files (`.cs`, `.ts`, etc.) in the package                                                           | No       | `'false'`                |

## Outputs

| Output            | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `artifact-name`   | Name of the uploaded artifact (JSON array for multiple projects)   |
| `artifact-path`   | Path to the generated zip file (JSON array for multiple projects)  |
| `project-name`    | Name of the packaged project (JSON array for multiple projects)    |
| `project-version` | Version of the packaged project (JSON array for multiple projects) |

## Output Structure

The action creates the following directory structure before packaging:

```
SPT/
└── user/
    └── mods/
        └── {mod-folder-name}/
            ├── {project-name}.dll
            ├── db/
            ├── data/
            ├── wwwroot/
            └── res/
```

This structure is then compressed into a zip file named
`{project-name}-{version}.zip`.

## How It Works

1. **Project Detection**: Scans the repository for `.csproj` files or uses
   specified paths
2. **Project Parsing**: Extracts project name and version from each `.csproj`
   file
3. **DLL Discovery**: Finds the compiled DLL in `bin/Release` directory
   (supports .NET 6/7/8)
4. **Resource Collection**: Collects resource files from default and specified
   paths
5. **Package Creation**: Creates the SPT mod folder structure and copies all
   files
6. **Compression**: Compresses the `SPT` directory into a zip file
7. **Artifact Upload**: Uploads the zip file as a GitHub artifact

## Requirements

- Your project must be built with `dotnet build -c Release` before running this
  action
- The compiled DLL should be in the `bin/Release` directory
- `.csproj` file must contain a `<Version>` element in a `<PropertyGroup>`

Example `.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Version>1.0.0</Version>
  </PropertyGroup>
</Project>
```

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run bundle
```

### Test

```bash
npm test
```

### Local Testing

Use the `@github/local-action` utility to test locally:

```bash
npx @github/local-action . src/main.ts .env
```

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE)
file.

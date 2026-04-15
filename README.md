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

| Input                  | Description                        | Required | Default   |
| ---------------------- | ---------------------------------- | -------- | --------- |
| `project-path`         | .csproj path(s), empty = auto      | No       | `''`      |
| `exclude-patterns`     | Exclude patterns (append/replace)  | No       | `''`      |
| `max-depth`            | Max depth to scan .csproj          | No       | `'5'`     |
| `mod-folder-name`      | Custom mod folder name             | No       | `''`      |
| `resource-paths`       | Resource dirs (append/replace)     | No       | `''`      |
| `include-source-files` | Include source files (.cs,.ts)     | No       | `'false'` |
| `replace-defaults`     | Replace defaults instead of append | No       | `'false'` |

## Outputs

| Output            | Description                              |
| ----------------- | ---------------------------------------- |
| `artifact-name`   | Uploaded artifact (JSON array if multi)  |
| `artifact-path`   | artifact file path (JSON array if multi) |
| `project-name`    | Project name (JSON array if multi)       |
| `project-version` | Project version (JSON array if multi)    |

## Output Structure

The action creates the following directory structure before packaging:

```txt
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

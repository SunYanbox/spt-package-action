/**
 * csproj 解析器测试 fixtures
 * 提供测试用的 XML 内容和模拟函数
 */

/**
 * 有效的 csproj XML 内容（包含版本）
 */
export const VALID_CSPROJ_WITH_VERSION = `<?xml version="1.0" encoding="utf-8"?>
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <Version>2.1.3</Version>
    <AssemblyName>MyTestProject</AssemblyName>
  </PropertyGroup>
</Project>`

/**
 * 有效的 csproj XML 内容（不包含版本）
 */
export const VALID_CSPROJ_WITHOUT_VERSION = `<?xml version="1.0" encoding="utf-8"?>
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <AssemblyName>MyTestProject</AssemblyName>
  </PropertyGroup>
</Project>`

/**
 * 有效的 csproj XML 内容（多个 PropertyGroup）
 */
export const VALID_CSPROJ_MULTIPLE_PROPERTY_GROUPS = `<?xml version="1.0" encoding="utf-8"?>
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
  </PropertyGroup>
  <PropertyGroup>
    <Version>3.0.0-beta</Version>
  </PropertyGroup>
</Project>`

/**
 * 无效的 XML 内容
 */
export const INVALID_XML = 'This is not valid XML'

/**
 * 空 XML 内容
 */
export const EMPTY_XML = ''

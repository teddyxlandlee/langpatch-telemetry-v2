# 自动更新地理位置数据库

本项目包含一个自动更新地理位置数据库的工作流，该工作流每周一运行，用于自动下载、解压并上传最新的地理位置数据库。

## 工作流概述

- **触发时间**: 每周一凌晨 2 点 UTC 时间
- **功能**: 从指定 URL 下载 `Country.mmdb.gz` 文件，解压后上传到腾讯云 COS
- **文件路径**: `.github/workflows/update-geo-data.yml`

## 需要配置的 GitHub Secrets (加密)

### GEO_COS_SECRET_ID
- **用途**: 腾讯云 COS 访问 ID，用于上传地理位置数据库
- **说明**: 用于认证并上传解压后的 Country.mmdb 文件到 COS

### GEO_COS_SECRET_KEY
- **用途**: 腾讯云 COS 访问密钥，用于上传地理位置数据库
- **说明**: 用于认证并上传解压后的 Country.mmdb 文件到 COS

## 需要配置的 GitHub Variables (非加密)

### GEO_DATA_URL
- **用途**: 地理位置数据库文件的下载 URL
- **说明**: 指定压缩的 Country.mmdb.gz 文件的下载地址

### GEO_COS_BUCKET
- **用途**: 存储地理位置数据库的 COS 存储桶名称
- **说明**: 上传解压后的 Country.mmdb 文件的目标存储桶

### GEO_COS_REGION
- **用途**: 存储地理位置数据库的 COS 存储桶所在区域
- **默认值**: `ap-hongkong`
- **说明**: COS 存储桶所在的地理区域

### GEO_COS_FILE_KEY
- **用途**: 存储在 COS 中的地理位置数据库文件的键名
- **默认值**: `Country.mmdb`
- **说明**: 上传到 COS 后的文件名

## 配置步骤

1. 在 GitHub 仓库设置中添加上述 Secrets
2. 在 GitHub 仓库设置中添加上述 Variables
3. 确保腾讯云账户具有相应的 COS 读写权限
4. 工作流将在每周一自动运行，也可以手动触发

## 注意事项

- 确保 GEO_DATA_URL 指向有效的、可公开访问的 Country.mmdb.gz 文件
- 确保腾讯云账户有权限向指定的 COS 存储桶上传文件
- 工作流运行需要足够的权限，确保已在仓库设置中启用
- 如果需要立即更新，可以手动触发工作流运行

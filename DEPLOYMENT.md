# 部署到腾讯云 SCF

此项目包含一个 GitHub Actions 工作流，用于自动构建并将应用部署到腾讯云 Serverless Cloud Function (SCF)。

## 需要设置的 GitHub Secrets

在仓库设置中，需要配置以下 Secrets（加密变量）：

- `TENCENT_SECRET_ID`：腾讯云账户的 SecretId
- `TENCENT_SECRET_KEY`：腾讯云账户的 SecretKey

## 可选的 GitHub Variables（非加密）

- `TENCENT_REGION`：部署区域，默认为 `ap-hongkong`
- `SCF_FUNCTION_NAME`：SCF 函数名称

## 如何获取腾讯云凭证

1. 登录腾讯云控制台
2. 进入访问管理 -> 访问密钥 -> API 密钥管理
3. 创建新的密钥对，复制 SecretId 和 SecretKey
4. 在 GitHub 仓库设置中添加上述 Secrets

## 部署流程

当推送到主分支时，工作流将自动执行以下步骤：

1. 检出代码
2. 安装 Node.js 依赖
3. 使用 esbuild 构建项目
4. 将 dist 目录打包成 zip 文件
5. 使用腾讯云 SDK 将代码上传到 SCF

## 手动触发部署

您也可以通过 GitHub Actions 页面手动触发部署工作流。

## 注意事项

- 确保您的腾讯云账户有调用 SCF API 的权限
- zip 包大小不能超过 50MB
- 函数需要预先在腾讯云控制台创建
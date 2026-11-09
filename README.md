# 星核耀火Hub · Nova Tale Hub

星核耀火网页版前端演示，独立整理自新版交付提交 `7fabad7`。

[公开在线预览](https://yaweizhaofg-beep.github.io/nova-tale-hub-web/)

首页可直接浏览。进入创作、画布或资产功能时，可填写任意非空邮箱和密码进行演示登录。支付、生成任务和客服反馈均为演示流程。

本地运行需要 Node.js 22.12 或以上及 npm 10 或以上。

```sh
npm ci
npm run dev
```

生产构建使用 `npm run build`。运行 `npm run lint` 和 `npm test` 可检查代码与业务规则。首次执行浏览器回归时，先运行 `npx playwright install chromium`，构建后再运行 `npm run test:browser`。版本详情见 [交付说明](docs/latest-delivery.md)。

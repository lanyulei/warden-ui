/**
 * @name 代理的配置
 * @see 在生产环境 代理是无法生效的，所以这里没有生产环境的配置
 * -------------------------------
 * The agent cannot take effect in the production environment
 * so there is no configuration of the production environment
 * For details, please see
 * https://pro.ant.design/docs/deploy
 *
 * @doc https://umijs.org/docs/guides/proxy
 */
export default {
  // 如果需要自定义本地开发服务器  请取消注释按需调整
  dev: {
    // 流式 API 专用配置 - 禁用缓冲以支持 SSE
    '/api/v1/assistant/chat/stream': {
      target: 'http://127.0.0.1:9527',
      changeOrigin: true,
      // 关闭代理缓冲，支持 SSE 流式响应
      onProxyReq: (proxyReq: any) => {
        // 移除压缩请求头，防止服务器返回压缩内容
        proxyReq.removeHeader('Accept-Encoding');
        // 设置请求头以支持 SSE
        proxyReq.setHeader('Accept', 'text/event-stream');
        proxyReq.setHeader('Cache-Control', 'no-cache');
        proxyReq.setHeader('Connection', 'keep-alive');
      },
      onProxyRes: (proxyRes: any) => {
        // 删除所有压缩相关的响应头，确保不压缩
        delete proxyRes.headers['content-encoding'];
        delete proxyRes.headers['Content-Encoding'];
        // 设置响应头以支持 SSE
        proxyRes.headers['Cache-Control'] = 'no-cache';
        proxyRes.headers['Connection'] = 'keep-alive';
        proxyRes.headers['X-Accel-Buffering'] = 'no';
      },
    },
    // localhost:8000/api/** -> https://preview.pro.ant.design/api/**
    '/api/': {
      // 要代理的地址
      target: 'http://127.0.0.1:9527',
      // 配置了这个可以从 http 代理到 https
      // 依赖 origin 的功能可能需要这个，比如 cookie
      changeOrigin: true,
    },
  },
  /**
   * @name 详细的代理配置
   * @doc https://github.com/chimurai/http-proxy-middleware
   */
  test: {
    // localhost:8000/api/** -> https://preview.pro.ant.design/api/**
    '/api/': {
      target: 'https://proapi.azurewebsites.net',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
  pre: {
    '/api/': {
      target: 'your pre url',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
};

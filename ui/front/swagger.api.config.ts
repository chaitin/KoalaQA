const config = {
  url: 'http://10.9.35.17:8090/swagger/doc.json',
  authorizationToken: 'Basic Y3liZXI6Y3liZXI4OA==',
  generateClient: true,
  // 使用自定义模板生成，保留手动优化的 httpClient.ts
  templates: './api-templates',
};

export default config;

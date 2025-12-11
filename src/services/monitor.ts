import { request } from '@umijs/max';

// 数据源管理接口

// 数据源信息类型
export interface DatasourceItem {
  id: string;
  name: string;
  url: string;
  description?: string;
  status: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

// 数据源列表响应
export interface DatasourceListResponse {
  list: DatasourceItem[];
  total: number;
  page: number;
  size: number;
}

// 测试连接响应
export interface TestConnectionResponse {
  success: boolean;
  message?: string;
  latency?: number;
}

// 获取数据源列表
export async function queryDatasourceList(params: {
  page?: number;
  size?: number;
  name?: string;
  status?: boolean;
}) {
  return request<{
    code: number;
    message: string;
    data: DatasourceListResponse;
  }>('/api/v1/monitor/datasource', {
    method: 'GET',
    params,
  });
}

// 获取数据源详情
export async function getDatasource(id: string) {
  return request<{
    code: number;
    message: string;
    data: DatasourceItem;
  }>(`/api/v1/monitor/datasource/${id}`, {
    method: 'GET',
  });
}

// 创建数据源
export async function createDatasource(data: {
  name: string;
  url: string;
  description?: string;
  status?: boolean;
}) {
  return request<{
    code: number;
    message: string;
    data: DatasourceItem;
  }>('/api/v1/monitor/datasource', {
    method: 'POST',
    data,
  });
}

// 更新数据源
export async function updateDatasource(
  id: string,
  data: Partial<Omit<DatasourceItem, 'id' | 'is_default' | 'created_at' | 'updated_at'>>,
) {
  return request<{
    code: number;
    message: string;
    data: DatasourceItem;
  }>(`/api/v1/monitor/datasource/${id}`, {
    method: 'PUT',
    data: {
      id,
      ...data,
    },
  });
}

// 删除数据源
export async function deleteDatasource(id: string) {
  return request<{
    code: number;
    message: string;
  }>(`/api/v1/monitor/datasource/${id}`, {
    method: 'DELETE',
  });
}

// 设置为默认数据源
export async function setDefaultDatasource(id: string) {
  return request<{
    code: number;
    message: string;
    data: DatasourceItem;
  }>(`/api/v1/monitor/datasource/${id}/set-default`, {
    method: 'POST',
  });
}

// 测试数据源连接
export async function testDatasourceConnection(id: string) {
  return request<{
    code: number;
    message: string;
    data: TestConnectionResponse;
  }>(`/api/v1/monitor/datasource/${id}/test`, {
    method: 'POST',
  });
}

// Prometheus 代理接口

// Prometheus 查询结果类型
export interface PrometheusMetric {
  __name__?: string;
  [key: string]: string | undefined;
}

export interface PrometheusVectorResult {
  metric: PrometheusMetric;
  value: [number, string]; // [timestamp, value]
}

export interface PrometheusMatrixResult {
  metric: PrometheusMetric;
  values: [number, string][]; // [[timestamp, value], ...]
}

export interface PrometheusQueryResponse {
  status: string;
  data: {
    resultType: 'vector' | 'matrix' | 'scalar' | 'string';
    result: PrometheusVectorResult[] | PrometheusMatrixResult[];
  };
  errorType?: string;
  error?: string;
}

export interface ProxyResponse {
  code: number;
  message: string;
  data: PrometheusQueryResponse;
}

// 即时查询参数
export interface InstantQueryParams {
  query: string;
  time?: string;
  timeout?: string;
}

// 范围查询参数
export interface RangeQueryParams {
  query: string;
  start: string; // RFC3339 格式或 Unix 时间戳
  end: string;   // RFC3339 格式或 Unix 时间戳
  step: string;  // 查询步长，如 '15s', '1m', '5m', '1h'
  timeout?: string;
}

// Prometheus 即时查询
export async function prometheusInstantQuery(
  datasourceId: string,
  params: InstantQueryParams,
) {
  return request<ProxyResponse>(`/api/v1/monitor/proxy/${datasourceId}/query`, {
    method: 'GET',
    params,
  });
}

// Prometheus 范围查询
export async function prometheusRangeQuery(
  datasourceId: string,
  params: RangeQueryParams,
) {
  return request<ProxyResponse>(`/api/v1/monitor/proxy/${datasourceId}/query_range`, {
    method: 'GET',
    params,
  });
}

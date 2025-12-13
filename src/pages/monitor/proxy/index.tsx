import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, Input, Button, Select, DatePicker, Space, Tabs, message, Spin } from 'antd';
import { SearchOutlined, ReloadOutlined, TableOutlined, LineChartOutlined } from '@ant-design/icons';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { PrometheusVectorResult, PrometheusMatrixResult, DatasourceItem } from '@/services/monitor';
import { prometheusInstantQuery, prometheusRangeQuery, queryDatasourceList } from '@/services/monitor';
import QueryResultTable from './components/QueryResultTable';
import QueryResultGraph from './components/QueryResultGraph';

const { TextArea } = Input;

// 查询结果类型
interface QueryResult {
  resultType: 'vector' | 'matrix' | 'scalar' | 'string';
  result: PrometheusVectorResult[] | PrometheusMatrixResult[];
  queryTime: number; // 查询耗时（毫秒）
}

const PrometheusProxyPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [graphLoading, setGraphLoading] = useState(false);
  const [datasources, setDatasources] = useState<DatasourceItem[]>([]);
  const [datasourceLoading, setDatasourceLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [graphResult, setGraphResult] = useState<{
    resultType: 'vector' | 'matrix' | 'scalar' | 'string';
    result: PrometheusVectorResult[] | PrometheusMatrixResult[];
    queryTime: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('table');
  const [tableQueryTime, setTableQueryTime] = useState<Dayjs>(dayjs());

  // 加载数据源列表
  const loadDatasources = useCallback(async () => {
    setDatasourceLoading(true);
    try {
      const res = await queryDatasourceList({ page: 1, size: 100 });
      if (res.code === 20000) {
        setDatasources(res.data?.list || []);
        // 设置默认数据源
        const defaultDs = res.data?.list?.find((ds) => ds.is_default);
        if (defaultDs) {
          form.setFieldValue('datasourceId', defaultDs.id);
        } else if (res.data?.list?.length > 0) {
          form.setFieldValue('datasourceId', res.data.list[0].id);
        }
      }
    } catch (error) {
      message.error('加载数据源列表失败');
    } finally {
      setDatasourceLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadDatasources();
  }, [loadDatasources]);

  // 执行查询（支持自定义时间参数）
  const handleQuery = useCallback(async (customTime?: Dayjs) => {
    try {
      const values = await form.validateFields();
      const { datasourceId, query } = values;

      if (!query?.trim()) {
        message.warning('请输入 PromQL 查询表达式');
        return;
      }

      setLoading(true);
      const startTime = Date.now();

      const params: { query: string; time?: string; timeout?: string } = {
        query: query.trim(),
      };

      // 格式化时间参数
      const timeToUse = customTime || tableQueryTime;
      if (timeToUse) {
        params.time = timeToUse.toISOString();
      }

      const res = await prometheusInstantQuery(datasourceId, params);
      const endTime = Date.now();

      if (res.code === 20000 && res.data?.status === 'success') {
        setQueryResult({
          resultType: res.data.data.resultType,
          result: res.data.data.result as PrometheusVectorResult[],
          queryTime: endTime - startTime,
        });
        message.success(`查询成功，耗时 ${endTime - startTime}ms`);
      } else {
        const errorMsg = res.data?.error || res.message || '查询失败';
        message.error(errorMsg);
        setQueryResult(null);
      }
    } catch (error: any) {
      message.error(error?.message || '查询执行失败');
      setQueryResult(null);
    } finally {
      setLoading(false);
    }
  }, [form, tableQueryTime]);

  // 处理 Table 时间选择变化
  const handleTableTimeChange = useCallback((time: Dayjs) => {
    setTableQueryTime(time);
    handleQuery(time);
  }, [handleQuery]);

  // 处理 Graph 范围查询
  const handleGraphRangeQuery = useCallback(async (startTime: Dayjs, endTime: Dayjs, step: string) => {
    try {
      const values = await form.validateFields();
      const { datasourceId, query } = values;

      if (!query?.trim()) {
        message.warning('请输入 PromQL 查询表达式');
        return;
      }

      setGraphLoading(true);
      const queryStartTime = Date.now();

      const params = {
        query: query.trim(),
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        step,
      };

      const res = await prometheusRangeQuery(datasourceId, params);
      const queryEndTime = Date.now();

      if (res.code === 20000 && res.data?.status === 'success') {
        setGraphResult({
          resultType: res.data.data.resultType,
          result: res.data.data.result as PrometheusVectorResult[] | PrometheusMatrixResult[],
          queryTime: queryEndTime - queryStartTime,
        });
        message.success(`范围查询成功，耗时 ${queryEndTime - queryStartTime}ms`);
      } else {
        const errorMsg = res.data?.error || res.message || '范围查询失败';
        message.error(errorMsg);
        setGraphResult(null);
      }
    } catch (error: any) {
      message.error(error?.message || '范围查询执行失败');
      setGraphResult(null);
    } finally {
      setGraphLoading(false);
    }
  }, [form]);

  // 清空结果
  const handleClear = useCallback(() => {
    form.resetFields(['query', 'time', 'timeout']);
    setQueryResult(null);
    setGraphResult(null);
  }, [form]);

  // 超时选项
  const timeoutOptions = [
    { label: '10 秒', value: '10s' },
    { label: '30 秒', value: '30s' },
    { label: '1 分钟', value: '1m' },
    { label: '5 分钟', value: '5m' },
  ];

  // Tab 项配置
  const tabItems = [
    {
      key: 'table',
      label: 'Table',
      children: (
        <QueryResultTable
          data={(queryResult?.result as PrometheusVectorResult[]) || []}
          loading={loading}
          onTimeChange={handleTableTimeChange}
          queryInfo={queryResult ? { count: queryResult.result.length, time: queryResult.queryTime } : undefined}
        />
      ),
    },
    {
      key: 'graph',
      label: 'Graph',
      children: (
        <QueryResultGraph
          data={graphResult?.result || []}
          loading={graphLoading}
          resultType={graphResult?.resultType}
          onRangeQuery={handleGraphRangeQuery}
          queryInfo={graphResult ? { count: graphResult.result.length, time: graphResult.queryTime } : undefined}
        />
      ),
    },
  ];

  return (
    <PageContainer content="执行 Prometheus 即时查询（instant query），支持 Table 和 Graph 两种展示方式。">
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            timeout: '30s',
          }}
        >
          {/* 第一行：数据源和 PromQL 表达式 */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <Form.Item
              name="query"
              label="PromQL 表达式"
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input
                placeholder="请输入 PromQL 查询表达式，例如：up, rate(http_requests_total[5m])"
                style={{ fontFamily: 'Monaco, Menlo, Consolas, monospace', width: '100%' }}
                allowClear
                onPressEnter={() => handleQuery()}
              />
            </Form.Item>
            <Form.Item
              name="datasourceId"
              label="数据源"
              style={{ flex: '0 0 280px', marginBottom: 0 }}
            >
              <Select
                placeholder="请选择数据源"
                loading={datasourceLoading}
                showSearch
                optionFilterProp="label"
                options={datasources.map((ds) => ({
                  label: `${ds.name}${ds.is_default ? ' (默认)' : ''}`,
                  value: ds.id,
                }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card styles={{ body: { paddingTop: 5, paddingBottom: 8 } }}>
        <Spin spinning={loading}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </Spin>
      </Card>
    </PageContainer>
  );
};

export default PrometheusProxyPage;

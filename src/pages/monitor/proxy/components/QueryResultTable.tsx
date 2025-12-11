import { Table, Empty, Typography, Tooltip, DatePicker } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { PrometheusVectorResult } from '@/services/monitor';

const { Text } = Typography;

interface QueryResultTableProps {
  data: PrometheusVectorResult[];
  loading?: boolean;
  onTimeChange?: (time: Dayjs) => void;
  queryInfo?: { count: number; time: number };
}

// 表格数据类型
interface TableRowData {
  key: string;
  metric: string;
  labels: Record<string, string>;
  value: string;
  timestamp: number;
  formattedTime: string;
}

const QueryResultTable: React.FC<QueryResultTableProps> = ({ data, loading = false, onTimeChange, queryInfo }) => {
  const [selectedTime, setSelectedTime] = useState<Dayjs>(dayjs());

  // 时间变化时通知父组件
  const handleTimeChange = (time: Dayjs | null) => {
    const newTime = time || dayjs();
    setSelectedTime(newTime);
    onTimeChange?.(newTime);
  };

  // 转换数据为表格格式
  const tableData = useMemo<TableRowData[]>(() => {
    if (!data || data.length === 0) return [];

    return data.map((item, index) => {
      const { metric, value } = item;
      const [timestamp, val] = value;
      // 优先显示 __name__，否则拼接所有标签
      let metricName = metric.__name__;
      if (!metricName) {
        const labelParts: string[] = [];
        Object.keys(metric).forEach((key) => {
          if (metric[key] !== undefined) {
            labelParts.push(`${key}=${metric[key]}`);
          }
        });
        metricName = labelParts.length > 0 ? labelParts.join(',') : '-';
      }

      // 过滤掉 __name__ 的其他标签
      const labels: Record<string, string> = {};
      Object.keys(metric).forEach((key) => {
        if (key !== '__name__' && metric[key] !== undefined) {
          labels[key] = metric[key] as string;
        }
      });

      return {
        key: `${index}-${metricName}-${timestamp}`,
        metric: metricName,
        labels,
        value: val,
        timestamp,
        formattedTime: dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss'),
      };
    });
  }, [data]);

  // 仅显示指标名称、值、时间戳三列，无需标签列

  // 只显示指标名称、值、时间戳三列
  const columns: ColumnsType<TableRowData> = [
    {
      title: '指标名称',
      dataIndex: 'metric',
      key: 'metric',
      width: 200,
      fixed: 'left',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text>
            {text || '-'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      width: 150,
      render: (text: string) => {
        const numValue = parseFloat(text);
        // 格式化数值显示
        const displayValue = Number.isNaN(numValue)
          ? text
          : Number.isInteger(numValue)
            ? numValue.toString()
            : numValue.toFixed(4);
        return (
          <Text code>
            {displayValue}
          </Text>
        );
      },
    },
    // 移除时间戳列
  ];

  if (!data || data.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <DatePicker
            showTime
            value={selectedTime}
            onChange={handleTimeChange}
            format="YYYY-MM-DD HH:mm:ss"
            style={{ width: 220 }}
          />
          <div style={{ flex: 1 }} />
          {queryInfo && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              查询结果：共 {queryInfo.count} 条数据，耗时 {queryInfo.time}ms
            </Text>
          )}
        </div>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无查询结果"
          style={{ padding: '40px 0' }}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <DatePicker
          showTime
          value={selectedTime}
          onChange={handleTimeChange}
          format="YYYY-MM-DD HH:mm:ss"
          style={{ width: 220 }}
        />
        <div style={{ flex: 1 }} />
        {queryInfo && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            查询结果：共 {queryInfo.count} 条数据，耗时 {queryInfo.time}ms
          </Text>
        )}
      </div>
      <Table<TableRowData>
        columns={columns}
        dataSource={tableData}
        loading={loading}
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条数据`,
          defaultPageSize: 10,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        bordered
      />
    </div>
  );
};

export default QueryResultTable;

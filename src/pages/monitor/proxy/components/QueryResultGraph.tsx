import { Empty, Typography, DatePicker, Select, Space, Input } from 'antd';
import React, { useMemo, useRef, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { PrometheusVectorResult, PrometheusMatrixResult } from '@/services/monitor';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// 分辨率选项配置
const RESOLUTION_OPTIONS = [
  { label: 'Auto - Low res.', value: 'low' },
  { label: 'Auto - Medium res.', value: 'medium' },
  { label: 'Auto - High res.', value: 'high' },
  { label: '10s', value: '10s' },
  { label: '30s', value: '30s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '自定义...', value: 'custom' },
];

// 根据时间范围和分辨率模式计算步长
const calculateStep = (startTime: Dayjs, endTime: Dayjs, resolution: string): string => {
  const durationMs = endTime.diff(startTime);
  const durationMinutes = durationMs / 1000 / 60;

  if (resolution === 'low') {
    // 低分辨率：约 100 个数据点
    if (durationMinutes <= 60) return '1m';
    if (durationMinutes <= 360) return '5m';
    if (durationMinutes <= 1440) return '15m';
    if (durationMinutes <= 10080) return '1h';
    return '6h';
  } else if (resolution === 'medium') {
    // 中等分辨率：约 250 个数据点
    if (durationMinutes <= 30) return '10s';
    if (durationMinutes <= 120) return '30s';
    if (durationMinutes <= 360) return '1m';
    if (durationMinutes <= 1440) return '5m';
    if (durationMinutes <= 10080) return '30m';
    return '2h';
  } else if (resolution === 'high') {
    // 高分辨率：约 500 个数据点
    if (durationMinutes <= 15) return '5s';
    if (durationMinutes <= 60) return '10s';
    if (durationMinutes <= 180) return '30s';
    if (durationMinutes <= 720) return '1m';
    if (durationMinutes <= 2880) return '5m';
    return '15m';
  }
  // 固定分辨率
  return resolution;
};

interface QueryResultGraphProps {
  data: PrometheusVectorResult[] | PrometheusMatrixResult[];
  loading?: boolean;
  resultType?: 'vector' | 'matrix' | 'scalar' | 'string';
  onRangeQuery?: (startTime: Dayjs, endTime: Dayjs, step: string) => void;
  queryInfo?: { count: number; time: number };
}

// 颜色配置
const CHART_COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#1890ff',
  '#13c2c2', '#2f54eb', '#722ed1', '#faad14', '#a0d911',
];

// 格式化数值：k=千, m=百万, b=十亿, t=万亿
const formatValue = (val: number): string => {
  if (val === 0) return '0';
  const absVal = Math.abs(val);
  if (absVal >= 1e12) return `${(val / 1e12).toFixed(2)}t`;
  if (absVal >= 1e9) return `${(val / 1e9).toFixed(2)}b`;
  if (absVal >= 1e6) return `${(val / 1e6).toFixed(2)}m`;
  if (absVal >= 1e3) return `${(val / 1e3).toFixed(2)}k`;
  if (absVal < 0.01 && absVal > 0) return val.toExponential(2);
  return val.toFixed(2);
};

// 生成随机颜色
const getRandomColor = (seed: number): string => {
  const hue = (seed * 137.508) % 360; // 黄金角分布
  return `hsl(${hue}, 70%, 50%)`;
};

const QueryResultGraph: React.FC<QueryResultGraphProps> = ({
  data,
  loading = false,
  resultType,
  onRangeQuery,
  queryInfo,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    time: number;
    items: Array<{ name: string; color: string; value: number }>;
  } | null>(null);
  const [legendExpanded, setLegendExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);

  // 时间区间状态
  const [timeRange, setTimeRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(1, 'hour'),
    dayjs(),
  ]);
  // 分辨率状态
  const [resolution, setResolution] = useState<string>('medium');
  const [customStep, setCustomStep] = useState<string>('');

  // 时间区间变化时触发查询
  const handleTimeRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      const newRange: [Dayjs, Dayjs] = [dates[0], dates[1]];
      setTimeRange(newRange);
      const step = resolution === 'custom' && customStep ? customStep : calculateStep(newRange[0], newRange[1], resolution);
      onRangeQuery?.(newRange[0], newRange[1], step);
    }
  };

  // 分辨率变化时触发查询
  const handleResolutionChange = (value: string) => {
    setResolution(value);
    if (value !== 'custom') {
      const step = calculateStep(timeRange[0], timeRange[1], value);
      onRangeQuery?.(timeRange[0], timeRange[1], step);
    }
  };

  // 自定义步长确认
  const handleCustomStepConfirm = () => {
    if (customStep && resolution === 'custom') {
      onRangeQuery?.(timeRange[0], timeRange[1], customStep);
    }
  };

  // 转换数据为图表格式，支持 vector 和 matrix 类型
  const seriesData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 判断是 vector 还是 matrix 类型
    const isMatrix = resultType === 'matrix' || (data.length > 0 && 'values' in data[0]);

    if (isMatrix) {
      // matrix 类型：每个指标有多个时间点
      return (data as PrometheusMatrixResult[]).map((item, index) => {
        const { metric, values } = item;
        const labelParts: string[] = [];
        Object.keys(metric).forEach((key) => {
          if (key !== '__name__' && metric[key] !== undefined) {
            labelParts.push(`${key}="${metric[key]}"`);
          }
        });
        const labelsStr = labelParts.length > 0 ? `{${labelParts.join(', ')}}` : '';
        const fullMetric = labelsStr;
        const color = index < CHART_COLORS.length ? CHART_COLORS[index] : getRandomColor(index);

        return {
          name: fullMetric,
          color,
          points: values.map(([timestamp, val]) => ({
            time: timestamp * 1000,
            value: parseFloat(val) || 0,
          })),
          idx: index,
        };
      });
    } else {
      // vector 类型：每个指标只有一个时间点
      return (data as PrometheusVectorResult[]).map((item, index) => {
        const { metric, value } = item;
        const [timestamp, val] = value;
        const labelParts: string[] = [];
        Object.keys(metric).forEach((key) => {
          if (key !== '__name__' && metric[key] !== undefined) {
            labelParts.push(`${key}="${metric[key]}"`);
          }
        });
        const labelsStr = labelParts.length > 0 ? `{${labelParts.join(', ')}}` : '';
        const fullMetric = labelsStr;
        const color = index < CHART_COLORS.length ? CHART_COLORS[index] : getRandomColor(index);
        return {
          name: fullMetric,
          color,
          points: [{ time: timestamp * 1000, value: parseFloat(val) || 0 }],
          idx: index,
        };
      });
    }
  }, [data, resultType]);

  // 控制显示哪些指标
  const [visibleIdxs, setVisibleIdxs] = useState<number[]>(() => seriesData.map((_, i) => i));

  useEffect(() => {
    setVisibleIdxs(seriesData.map((_, i) => i));
  }, [seriesData]);

  // 检测图例是否超出两行
  useEffect(() => {
    if (legendRef.current) {
      const lineHeight = 28; // 单行高度约 28px
      const maxHeight = lineHeight * 2;
      const scrollHeight = legendRef.current.scrollHeight;
      setShowExpandButton(scrollHeight > maxHeight);
    }
  }, [seriesData, visibleIdxs]);

  // 使用 Canvas 绘制时间序列折线图
  useEffect(() => {
    if (!chartRef.current || seriesData.length === 0) return;
    // 只显示可见指标
    const visibleSeries = seriesData.filter((s, i) => visibleIdxs.includes(i));
    const container = chartRef.current;
    const containerWidth = container.clientWidth || 800;
    const containerHeight = 420;
    const dpr = window.devicePixelRatio || 1;
    // 如果没有可见指标，清空画布并返回
    if (visibleSeries.length === 0) {
      container.innerHTML = '';
      const canvas = document.createElement('canvas');
      canvas.width = containerWidth * dpr;
      canvas.height = containerHeight * dpr;
      canvas.style.width = '100%';
      canvas.style.height = `${containerHeight}px`;
      container.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, containerWidth, containerHeight);
      }
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = '100%';
    canvas.style.height = `${containerHeight}px`;
    container.innerHTML = '';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // 收集所有可见数据点
    const allPoints: { time: number; value: number }[] = [];
    visibleSeries.forEach((s) => {
      s.points.forEach((p) => allPoints.push(p));
    });

    if (allPoints.length === 0) return;

    const legendHeight = 0; // 图例移到下方
    const padding = { top: 20, right: 30, bottom: 50, left: 70 };
    const chartWidth = containerWidth - padding.left - padding.right;
    const chartHeight = containerHeight - padding.top - padding.bottom;

    // 计算 Y 轴范围
    let minY = Math.min(...allPoints.map((p) => p.value));
    let maxY = Math.max(...allPoints.map((p) => p.value));
    if (minY === maxY) {
      maxY += 1;
      minY = minY > 0 ? 0 : minY - 1;
    } else {
      const yRangeRaw = maxY - minY;
      maxY += yRangeRaw * 0.1;
      minY -= yRangeRaw * 0.1;
    }
    const yRange = maxY - minY;

    // 计算 X 轴范围（时间）
    let minTime = Math.min(...allPoints.map((p) => p.time));
    let maxTime = Math.max(...allPoints.map((p) => p.time));
    if (minTime === maxTime) {
      minTime -= 30 * 1000;
      maxTime += 30 * 1000;
    }
    const timeRangeMs = maxTime - minTime;

    // 背景
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, containerWidth, containerHeight);

    // Y 轴网格和标签
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yTickCount = 5;
    for (let i = 0; i <= yTickCount; i++) {
      const y = padding.top + (chartHeight * i) / yTickCount;
      const value = maxY - (yRange * i) / yTickCount;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(containerWidth - padding.right, y);
      ctx.stroke();
      ctx.fillText(formatValue(value), padding.left - 8, y);
    }

    // X 轴网格和标签
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xTickCount = 6;
    for (let i = 0; i <= xTickCount; i++) {
      const x = padding.left + (chartWidth * i) / xTickCount;
      const time = minTime + (timeRangeMs * i) / xTickCount;
      ctx.beginPath();
      ctx.strokeStyle = '#f0f0f0';
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
      ctx.fillStyle = '#666';
      // 根据时间跨度决定时间格式
      const format = timeRangeMs > 24 * 60 * 60 * 1000 ? 'MM-DD HH:mm' : 'HH:mm:ss';
      ctx.fillText(dayjs(time).format(format), x, padding.top + chartHeight + 8);
    }

    // 绘制每个指标的折线
    visibleSeries.forEach((series) => {
      const sortedPoints = [...series.points].sort((a, b) => a.time - b.time);
      if (sortedPoints.length === 0) return;

      // 绘制区域填充
      if (sortedPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(
          padding.left + ((sortedPoints[0].time - minTime) / timeRangeMs) * chartWidth,
          padding.top + chartHeight
        );
        sortedPoints.forEach((point) => {
          const x = padding.left + ((point.time - minTime) / timeRangeMs) * chartWidth;
          const y = padding.top + chartHeight - ((point.value - minY) / yRange) * chartHeight;
          ctx.lineTo(x, y);
        });
        ctx.lineTo(
          padding.left + ((sortedPoints[sortedPoints.length - 1].time - minTime) / timeRangeMs) * chartWidth,
          padding.top + chartHeight
        );
        ctx.closePath();
        // 使用指标颜色的半透明版本
        const hexColor = series.color;
        ctx.fillStyle = hexColor.startsWith('hsl')
          ? hexColor.replace('50%)', '50%, 0.1)').replace('hsl', 'hsla')
          : `${hexColor}18`;
        ctx.fill();
      }

      // 绘制折线
      ctx.beginPath();
      ctx.strokeStyle = series.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      sortedPoints.forEach((point, idx) => {
        const x = padding.left + ((point.time - minTime) / timeRangeMs) * chartWidth;
        const y = padding.top + chartHeight - ((point.value - minY) / yRange) * chartHeight;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 绘制数据点（如果点数较少）
      if (sortedPoints.length <= 50) {
        sortedPoints.forEach((point) => {
          const x = padding.left + ((point.time - minTime) / timeRangeMs) * chartWidth;
          const y = padding.top + chartHeight - ((point.value - minY) / yRange) * chartHeight;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = series.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
    });

    // 绘制坐标轴边框
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(containerWidth - padding.right, padding.top + chartHeight);
    ctx.stroke();

    chartInstance.current = canvas;

    // 悬浮交互
    let lastHoverX: number | null = null;
    let lastHoverY: number | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (containerWidth / rect.width);
      const y = (e.clientY - rect.top) * (containerHeight / rect.height);
      if (
        x < padding.left ||
        x > containerWidth - padding.right ||
        y < padding.top ||
        y > padding.top + chartHeight
      ) {
        setHoverInfo(null);
        return;
      }
      // 计算当前横坐标对应的时间
      const time = minTime + ((x - padding.left) / chartWidth) * timeRangeMs;
      // 找到每个指标在该时间点最近的值
      const items = visibleSeries.map((series) => {
        // 找到距离 time 最近的点
        let closest = series.points[0];
        let minDelta = Math.abs(series.points[0].time - time);
        for (const p of series.points) {
          const delta = Math.abs(p.time - time);
          if (delta < minDelta) {
            closest = p;
            minDelta = delta;
          }
        }
        return {
          name: series.name,
          color: series.color,
          value: closest.value,
        };
      });
      setHoverInfo({ x, y, time, items });
    };
    const handleMouseLeave = () => {
      setHoverInfo(null);
    };
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [seriesData, visibleIdxs]);

  // 无数据时的显示
  if (!data || data.length === 0) {
    return (
      <div>
        {/* 时间区间和分辨率选择器 */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Space size="small">
            <RangePicker
              showTime={{ format: 'HH:mm:ss' }}
              format="YYYY-MM-DD HH:mm:ss"
              value={timeRange}
              onChange={handleTimeRangeChange}
              style={{ width: 380 }}
            />
          </Space>
          <Space size="small">
            <Select
              value={resolution}
              onChange={handleResolutionChange}
              style={{ width: 160 }}
              options={RESOLUTION_OPTIONS}
            />
            {resolution === 'custom' && (
              <Input
                placeholder="如 15s, 1m, 5m"
                value={customStep}
                onChange={(e) => setCustomStep(e.target.value)}
                onPressEnter={handleCustomStepConfirm}
                onBlur={handleCustomStepConfirm}
                style={{ width: 120 }}
              />
            )}
          </Space>
          <div style={{ flex: 1 }} />
          {queryInfo && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              查询结果：共 {queryInfo.count} 条数据，耗时 {queryInfo.time}ms
            </Text>
          )}
        </div>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无查询结果，请选择时间范围后执行查询"
          style={{ padding: '40px 0' }}
        />
      </div>
    );
  }

  // 支持 vector 和 matrix 类型
  if (resultType && resultType !== 'vector' && resultType !== 'matrix') {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Text type="secondary">
          当前结果类型为 {resultType}，图表仅支持 vector/matrix 类型数据的可视化展示。
        </Text>
      </div>
    );
  }

  // 无可见指标时显示 Empty
  const noVisibleSeries = seriesData.length === 0 || visibleIdxs.length === 0;

  return (
    <div style={{ position: 'relative', minHeight: 400 }}>
      {/* 时间区间和分辨率选择器 */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Space size="small">
          <RangePicker
            showTime={{ format: 'HH:mm:ss' }}
            format="YYYY-MM-DD HH:mm:ss"
            value={timeRange}
            onChange={handleTimeRangeChange}
            style={{ width: 380 }}
          />
        </Space>
        <Space size="small">
          <Select
            value={resolution}
            onChange={handleResolutionChange}
            style={{ width: 160 }}
            options={RESOLUTION_OPTIONS}
          />
          {resolution === 'custom' && (
            <Input
              placeholder="如 15s, 1m, 5m"
              value={customStep}
              onChange={(e) => setCustomStep(e.target.value)}
              onPressEnter={handleCustomStepConfirm}
              onBlur={handleCustomStepConfirm}
              style={{ width: 120 }}
            />
          )}
        </Space>
        <div style={{ flex: 1 }} />
        {queryInfo && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            查询结果：共 {queryInfo.count} 条数据，耗时 {queryInfo.time}ms
          </Text>
        )}
      </div>

      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Text type="secondary">加载中...</Text>
        </div>
      )}
      {noVisibleSeries ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无监控数据"
          style={{ padding: '60px 0' }}
        />
      ) : (
        <>
          <div ref={chartRef} style={{ width: '100%', minHeight: 400, position: 'relative' }} />
          {/* 悬浮提示 */}
          {hoverInfo && (
            <div
              style={{
                position: 'absolute',
                left: hoverInfo.x + 16,
                top: hoverInfo.y + 16,
                background: 'rgba(255,255,255,0.98)',
                border: '1px solid #eee',
                borderRadius: 6,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                padding: 10,
                zIndex: 100,
                pointerEvents: 'none',
                minWidth: 180,
                maxWidth: 360,
              }}
            >
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                {dayjs(hoverInfo.time).format('YYYY-MM-DD HH:mm:ss')}
              </div>
              {hoverInfo.items.map((item) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: item.color, display: 'inline-block', marginRight: 6 }} />
                  <span style={{ flex: 1, fontSize: 13, color: '#333', marginRight: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                  <span style={{ fontFamily: 'monospace', color: '#222', fontWeight: 500 }}>{formatValue(item.value)}</span>
                </div>
              ))}
            </div>
          )}
          {/* 图例展示区，支持点击隐藏/显示 */}
          <div style={{ margin: '0 0 10px 0', padding: '0 15px' }}>
            <div
              ref={legendRef}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 15px',
                maxHeight: legendExpanded ? 'none' : 56, // 两行高度
                overflow: 'hidden',
              }}
            >
              {seriesData.map((series, idx) => {
                const text = series.name.length > 35 ? series.name.substring(0, 32) + '...' : series.name;
                const isVisible = visibleIdxs.includes(idx);
                return (
                  <span
                    key={series.name + idx}
                    style={{ display: 'flex', alignItems: 'center', fontSize: 13, cursor: 'pointer', opacity: isVisible ? 1 : 0.4 }}
                    onClick={() => {
                      setVisibleIdxs((prev) =>
                        prev.includes(idx)
                          ? prev.filter((i) => i !== idx)
                          : [...prev, idx]
                      );
                    }}
                    title={isVisible ? '点击隐藏该指标' : '点击显示该指标'}
                  >
                    <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 6, background: series.color, marginRight: 6 }} />
                    <span style={{ color: '#333', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
                  </span>
                );
              })}
            </div>
            {showExpandButton && (
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <span
                  onClick={() => setLegendExpanded(!legendExpanded)}
                  style={{ color: '#1890ff', fontSize: 13, cursor: 'pointer', marginTop: 4, display: 'inline-block' }}
                >
                  {legendExpanded ? '收起' : '查看更多'}
                </span>
              </div>
            )}
          </div>
          <div style={{ marginTop: 8, padding: '0 16px', marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              提示：图表展示了各指标在时间范围内的数据变化。点击图例可隐藏/显示对应指标。
            </Text>
          </div>
        </>
      )}
    </div>
  );
};

export default QueryResultGraph;

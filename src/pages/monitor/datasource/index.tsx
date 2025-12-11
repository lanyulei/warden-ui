import type { ActionType, ProColumns, ProFormInstance } from '@ant-design/pro-components';
import {
  PageContainer,
  ProTable,
  ModalForm,
  ProFormText,
  ProFormSwitch,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button, Popconfirm, message, Row, Col, Tag, Space, Tooltip } from 'antd';
import { CheckCircleOutlined, ApiOutlined, StarOutlined, StarFilled, PlusOutlined } from '@ant-design/icons';
import React, { useRef, useState } from 'react';
import type { DatasourceItem } from '@/services/monitor';
import {
  queryDatasourceList,
  createDatasource,
  updateDatasource,
  deleteDatasource,
  setDefaultDatasource,
  testDatasourceConnection,
} from '@/services/monitor';

const DatasourcePage: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const formRef = useRef<ProFormInstance<any> | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentDatasource, setCurrentDatasource] = useState<DatasourceItem | undefined>();
  const [testingId, setTestingId] = useState<string | null>(null);

  // 测试数据源连接
  const handleTestConnection = async (record: DatasourceItem) => {
    setTestingId(record.id);
    try {
      const res = await testDatasourceConnection(record.id);
      if (res.code === 20000 && res.data?.success) {
        message.success(`连接测试成功${res.data.latency ? `，延迟: ${res.data.latency}ms` : ''}`);
      } else {
        message.error(res.data?.message || '连接测试失败');
      }
    } catch (error) {
      message.error('连接测试失败');
    } finally {
      setTestingId(null);
    }
  };

  // 设置默认数据源
  const handleSetDefault = async (record: DatasourceItem) => {
    try {
      const res = await setDefaultDatasource(record.id);
      if (res.code === 20000) {
        message.success('设置默认数据源成功');
        actionRef.current?.reload();
      } else {
        message.error(res.message || '设置失败');
      }
    } catch (error) {
      message.error('设置默认数据源失败');
    }
  };

  const columns: ProColumns<DatasourceItem>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      fieldProps: { placeholder: '请输入名称' },
      render: (_, record) => (
        <Space>
          {record.name}
          {record.is_default && (
            <Tooltip title="默认数据源">
              <StarFilled style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        true: { text: '启用', status: 'Success' },
        false: { text: '禁用', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.status ? 'green' : 'default'}>{record.status ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      hideInSearch: true,
      width: 180,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      render: (_, record) => [
        <a
          key="test"
          onClick={() => handleTestConnection(record)}
          style={{ opacity: testingId === record.id ? 0.5 : 1 }}
        >
          测试
        </a>,
        !record.is_default && (
          <a key="setDefault" onClick={() => handleSetDefault(record)}>
            设为默认
          </a>
        ),
        <a
          key="edit"
          onClick={() => {
            setCurrentDatasource(record);
            setModalOpen(true);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title={record.is_default ? '无法删除默认数据源' : '确认删除该数据源？'}
          onConfirm={async () => {
            if (record.is_default) {
              message.warning('无法删除默认数据源');
              return;
            }
            try {
              const res = await deleteDatasource(record.id);
              if (res.code === 20000) {
                message.success('删除成功');
                actionRef.current?.reload();
              } else {
                message.error(res.message || '删除失败');
              }
            } catch (error) {
              message.error('删除失败');
            }
          }}
          okButtonProps={{ disabled: record.is_default }}
        >
          <a style={{ color: record.is_default ? '#999' : undefined }}>删除</a>
        </Popconfirm>,
      ].filter(Boolean),
    },
  ];

  return (
    <PageContainer content="管理 Prometheus 数据源配置，支持新增、编辑、删除、测试连接和设置默认数据源。">
      <ProTable<DatasourceItem>
        bordered
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
          optionRender: (_, __, dom) => dom,
          style: { justifyContent: 'flex-start' },
        }}
        form={{
          layout: 'inline',
          style: { gap: 16, justifyContent: 'flex-start' },
        }}
        toolBarRender={() => [
          <Button
            key="new"
            type="primary"
            onClick={() => {
              setCurrentDatasource(undefined);
              formRef.current?.resetFields();
              setModalOpen(true);
            }}
            icon={<PlusOutlined />}
          >
            新建数据源
          </Button>,
        ]}
        request={async (params) => {
          const { current, pageSize } = params;
          const res = await queryDatasourceList({
            page: current,
            size: pageSize,
            name: params.name,
            status: params.status !== undefined ? params.status === 'true' : undefined,
          });
          return {
            data: res.data?.list || [],
            success: res.code === 20000,
            total: res.data?.total || 0,
          };
        }}
      />

      <ModalForm
        title={currentDatasource ? '编辑数据源' : '新建数据源'}
        formRef={formRef}
        open={modalOpen}
        initialValues={currentDatasource}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setModalOpen(false),
        }}
        onFinish={async (values) => {
          try {
            if (currentDatasource?.id) {
              const res = await updateDatasource(currentDatasource.id, values);
              if (res.code === 20000) {
                message.success('更新成功');
              } else {
                message.error(res.message || '更新失败');
                return false;
              }
            } else {
              const res = await createDatasource(values as any);
              if (res.code === 20000) {
                message.success('创建成功');
              } else {
                message.error(res.message || '创建失败');
                return false;
              }
            }
            setModalOpen(false);
            actionRef.current?.reload();
            return true;
          } catch (error) {
            message.error(currentDatasource ? '更新失败' : '创建失败');
            return false;
          }
        }}
      >
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入数据源名称' }]}
          placeholder="请输入数据源名称"
        />
        <ProFormText
          name="url"
          label="URL"
          rules={[
            { required: true, message: '请输入数据源 URL' },
            { type: 'url', message: '请输入有效的 URL 地址' },
          ]}
          placeholder="例如: http://prometheus:9090"
        />
        <ProFormSwitch name="status" label="启用" initialValue={true} />
        <ProFormTextArea name="description" label="描述" placeholder="请输入数据源描述" />
      </ModalForm>
    </PageContainer>
  );
};

export default DatasourcePage;

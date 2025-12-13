import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProFormDependency } from '@ant-design/pro-components';
import { Button, Tag, Popconfirm, message, Row, Col } from 'antd';
import React, { useRef, useState } from 'react';
import type { ProFormInstance } from '@ant-design/pro-components';
import type { PermissionItem, PermissionType } from '@/services/system';
import { queryPermissionList, createPermission, updatePermission, deletePermission } from '@/services/system';

const PermissionPage: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const formRef = useRef<ProFormInstance<any> | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPermission, setCurrentPermission] = useState<PermissionItem | undefined>();

  const permissionTypeOptions = [
    { label: '接口', value: 'api' },
    { label: '页面元素', value: 'element' },
  ];

  const httpMethodOptions = [
    { label: 'GET', value: 'GET' },
    { label: 'POST', value: 'POST' },
    { label: 'PUT', value: 'PUT' },
    { label: 'DELETE', value: 'DELETE' },
    { label: 'PATCH', value: 'PATCH' },
  ];

  const columns: ProColumns<PermissionItem>[] = [
    {
      title: '权限编码',
      dataIndex: 'code',
      fieldProps: { placeholder: '请输入权限编码' },
    },
    {
      title: '权限名称',
      dataIndex: 'name',
      fieldProps: { placeholder: '请输入权限名称' },
    },
    {
      title: '权限类型',
      dataIndex: 'types',
      hideInSearch: true,
      render: (_, record) => (
        <Tag color={record.types === 'api' ? 'blue' : 'purple'}>
          {record.types === 'api' ? '接口' : '页面元素'}
        </Tag>
      ),
    },
    {
      title: 'API路径',
      dataIndex: 'path',
      fieldProps: { placeholder: '请输入API路径' },
    },
    {
      title: 'HTTP方法',
      dataIndex: 'method',
      hideInSearch: true,
      render: (_, record) => {
        if (!record.method) return '-';
        const colorMap: Record<string, string> = {
          GET: 'green',
          POST: 'blue',
          PUT: 'orange',
          DELETE: 'red',
          PATCH: 'cyan',
        };
        return <Tag color={colorMap[record.method] || 'default'}>{record.method}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInSearch: true,
      render: (_, record) => (
        <Tag color={record.status ? 'green' : 'default'}>
          {record.status ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="edit"
          onClick={() => {
            setCurrentPermission(record);
            setModalOpen(true);
            formRef.current?.setFieldsValue(record);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确认删除该权限？"
          onConfirm={async () => {
            await deletePermission(record.id);
            message.success('删除成功');
            actionRef.current?.reload();
          }}
        >
          <a>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer
      content="支持权限的新增、编辑、删除、查询，可配置接口权限和页面元素权限，提升权限管理效率。"
    >
      <ProTable
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
              setCurrentPermission(undefined);
              formRef.current?.resetFields();
              setModalOpen(true);
            }}
          >
            新建权限
          </Button>,
        ]}
        request={async (params) => {
          const { current, pageSize } = params;
          const res = await queryPermissionList({
            page: current,
            size: pageSize,
            code: params.code,
            name: params.name,
            path: params.path,
          });
          return {
            data: res.data.list,
            success: res.code === 20000,
            total: res.data.total,
          };
        }}
      />

      <ModalForm
        title={currentPermission ? '编辑权限' : '新建权限'}
        formRef={formRef}
        open={modalOpen}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setModalOpen(false),
        }}
        onFinish={async (values) => {
          if (currentPermission?.id) {
            await updatePermission(currentPermission.id, values);
            message.success('更新成功');
          } else {
            await createPermission(values as any);
            message.success('创建成功');
          }
          setModalOpen(false);
          actionRef.current?.reload();
          return true;
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <ProFormText
              name="code"
              label="权限编码"
              rules={[{ required: true, message: '请输入权限编码' }]}
              disabled={!!currentPermission?.id}
            />
          </Col>
          <Col span={12}>
            <ProFormText
              name="name"
              label="权限名称"
              rules={[{ required: true, message: '请输入权限名称' }]}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormSelect
              name="types"
              label="权限类型"
              options={permissionTypeOptions}
              rules={[{ required: true, message: '请选择权限类型' }]}
            />
          </Col>
          <Col span={12}>
            <ProFormSelect
              name="status"
              label="状态"
              options={[
                { label: '启用', value: true },
                { label: '禁用', value: false },
              ]}
              rules={[{ required: true, message: '请选择状态' }]}
            />
          </Col>
        </Row>
        <ProFormDependency name={['types']}>
          {({ types }) => {
            if (types !== 'api') return null;
            return (
              <Row gutter={16}>
                <Col span={12}>
                  <ProFormText
                    name="path"
                    label="API路径"
                    placeholder="如: /api/v1/users"
                  />
                </Col>
                <Col span={12}>
                  <ProFormSelect
                    name="method"
                    label="HTTP方法"
                    options={httpMethodOptions}
                  />
                </Col>
              </Row>
            );
          }}
        </ProFormDependency>
        <ProFormTextArea name="description" label="描述" />
      </ModalForm>
    </PageContainer>
  );
};

export default PermissionPage;


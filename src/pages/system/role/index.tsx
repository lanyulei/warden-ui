import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSwitch, ProFormTextArea, ProFormSelect } from '@ant-design/pro-components';
import { Button, Switch, Popconfirm, message, Row, Col } from 'antd';
import { Tag } from 'antd';
import React, { useRef, useState } from 'react';
import type { ProFormInstance } from '@ant-design/pro-components';
import type { RoleItem } from '@/services/system';
import { queryRoleList, createRole, updateRole, deleteRole } from '@/services/system';

const RolePage: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const formRef = useRef<ProFormInstance<any> | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleItem | undefined>();

  const columns: ProColumns<RoleItem>[] = [
    {
      title: '编码',
      dataIndex: 'code',
      fieldProps: { placeholder: '请输入编码' },
    },
    {
      title: '名称',
      dataIndex: 'name',
      fieldProps: { placeholder: '请输入名称' },
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
            setCurrentRole(record);
            setModalOpen(true);
            formRef.current?.setFieldsValue(record);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确认删除该角色？"
          onConfirm={async () => {
            await deleteRole(record.id);
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
      content="支持角色的新增、编辑、删除、查询，展示基本信息和启用状态，提升管理效率。"
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
              setCurrentRole(undefined);
              formRef.current?.resetFields();
              setModalOpen(true);
            }}
          >
            新建角色
          </Button>,
        ]}
        request={async (params) => {
          const { current, pageSize } = params;
          const res = await queryRoleList({
            page: current,
            size: pageSize,
            name: params.name,
            code: params.code,
          });
          return {
            data: res.data.list,
            success: res.code === 20000,
            total: res.data.total,
          };
        }}
      />

      <ModalForm
        title={currentRole ? '编辑角色' : '新建角色'}
        formRef={formRef}
        open={modalOpen}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setModalOpen(false),
        }}
        onFinish={async (values) => {
          if (currentRole?.id) {
            await updateRole(currentRole.id, values);
            message.success('更新成功');
          } else {
            await createRole(values as any);
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
              label="编码"
              rules={[{ required: true, message: '请输入编码' }]}
              disabled={!!currentRole?.id}
            />
          </Col>
          <Col span={12}>
            <ProFormText
              name="name"
              label="名称"
              rules={[{ required: true, message: '请输入名称' }]}
            />
          </Col>
        </Row>
        <ProFormSelect
          name="status"
          label="状态"
          options={[
            { label: '启用', value: true },
            { label: '禁用', value: false },
          ]}
          rules={[{ required: true, message: '请选择状态' }]}
        />
        <ProFormTextArea name="description" label="描述" />
      </ModalForm>
    </PageContainer>
  );
};

export default RolePage;

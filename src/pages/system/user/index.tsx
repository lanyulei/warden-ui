import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSwitch, ProForm, ProFormTextArea } from '@ant-design/pro-components';
import { Button, Switch, Tag, Popconfirm, message, Row, Col } from 'antd';
import React, { useRef, useState } from 'react';
import type { ProFormInstance } from '@ant-design/pro-components';
import { queryUserList, createUser, updateUser, deleteUser } from '@/services/system';

const UserPage: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const formRef = useRef<ProFormInstance<any> | undefined>(undefined);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<API.CurrentUser | undefined>();

  const columns: ProColumns<API.CurrentUser>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      fieldProps: { placeholder: '请输入用户名' },
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      fieldProps: { placeholder: '请输入昵称' },
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      hideInSearch: true,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      hideInSearch: true,
    },
    {
      title: '管理员',
      dataIndex: 'is_admin',
      hideInSearch: true,
        render: (_, record) => (
          <Tag color={record.is_admin ? 'blue' : 'gray'}>
            {record.is_admin ? '是' : '否'}
          </Tag>
        ),
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
            setCurrentUser(record);
            setEditModalOpen(true);
            formRef.current?.setFieldsValue(record);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确认删除该用户？"
          onConfirm={async () => {
            if (!record.id) return;
            await deleteUser(record.id);
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
      content="支持用户的新增、编辑、删除、查询，展示基本信息、管理员身份和启用状态，提升管理效率。"
    >
      <ProTable
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        bordered
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
            style={{ float: 'left' }}
            onClick={() => {
              setCurrentUser(undefined);
              formRef.current?.resetFields();
              setCreateModalOpen(true);
            }}
          >
            新建用户
          </Button>,
        ]}
        request={async (params) => {
          const { current, pageSize } = params;
          const res = await queryUserList({
            page: current,
            size: pageSize,
            username: params.username,
            nickname: params.nickname,
          });
          return {
            data: res.data.list,
            success: res.code === 20000,
            total: res.data.total,
          };
        }}
      />

      <ModalForm
        title={currentUser ? '编辑用户' : '新建用户'}
        formRef={formRef}
        open={createModalOpen || editModalOpen}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => {
            setCreateModalOpen(false);
            setEditModalOpen(false);
          },
        }}
        onFinish={async (values) => {
          if (currentUser?.id) {
            await updateUser(currentUser.id, values);
            message.success('更新成功');
          } else {
            const { confirmPassword, ...userValues } = values;
            await createUser(userValues as any);
            message.success('创建成功');
          }
          setCreateModalOpen(false);
          setEditModalOpen(false);
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText
          name="username"
          label="用户名"
          rules={[{ required: true, message: '请输入用户名' }]}
          disabled={!!currentUser?.id}
        />
        {!currentUser?.id && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <ProFormText.Password
                  name="password"
                  label="密码"
                  rules={[{ required: true, message: '请输入密码' }]}
                />
              </Col>
              <Col span={12}>
                <ProFormText.Password
                  name="confirmPassword"
                  label="确认密码"
                  rules={[
                    { required: true, message: '请确认密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                />
              </Col>
            </Row>
          </>
        )}
        <ProFormText name="nickname" label="昵称" />
        <Row gutter={16}>
          <Col span={12}>
            <ProFormText name="email" label="邮箱" />
          </Col>
          <Col span={12}>
            <ProFormText name="phone" label="手机号" />
          </Col>
          <Col span={12}>
            <ProFormSwitch name="is_admin" label="管理员" />
          </Col>
          <Col span={12}>
            <ProFormSwitch name="status" label="启用" initialValue />
          </Col>
        </Row>
        <ProFormTextArea name="description" label="描述" />
      </ModalForm>
    </PageContainer>
  );
};

export default UserPage;

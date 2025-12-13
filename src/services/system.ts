import { request } from '@umijs/max';

// 用户管理接口
export async function queryUserList(params: {
  page?: number;
  size?: number;
  username?: string;
  nickname?: string;
  status?: boolean;
}) {
  return request<{
    code: number;
    message: string;
    data: {
      list: API.CurrentUser[];
      total: number;
      page: number;
      size: number;
    };
  }>('/api/v1/system/user', {
    method: 'GET',
    params,
  });
}

export async function createUser(data: {
  username: string;
  nickname?: string;
  password: string;
  email?: string;
  phone?: string;
  is_admin?: boolean;
  status?: boolean;
}) {
  return request('/api/v1/system/user', {
    method: 'POST',
    data,
  });
}

export async function updateUser(id: string, data: Partial<Omit<API.CurrentUser, 'id'>>) {
  return request(`/api/v1/system/user/${id}`, {
    method: 'PUT',
    data: {
      id,
      ...data,
    },
  });
}

export async function deleteUser(id: string) {
  return request(`/api/v1/system/user/${id}`, {
    method: 'DELETE',
  });
}

// 角色管理接口
export interface RoleItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function queryRoleList(params: {
  page?: number;
  size?: number;
  name?: string;
  code?: string;
}) {
  return request<{
    code: number;
    message: string;
    data: {
      list: RoleItem[];
      total: number;
      page: number;
      size: number;
    };
  }>('/api/v1/system/role', {
    method: 'GET',
    params,
  });
}

export async function createRole(data: {
  code: string;
  name: string;
  description?: string;
  status?: boolean;
}) {
  return request('/api/v1/system/role', {
    method: 'POST',
    data,
  });
}

export async function updateRole(id: string, data: Partial<Omit<RoleItem, 'id'>>) {
  return request(`/api/v1/system/role/${id}`, {
    method: 'PUT',
    data: {
      id,
      ...data,
    },
  });
}

export async function deleteRole(id: string) {
  return request(`/api/v1/system/role/${id}`, {
    method: 'DELETE',
  });
}

// 权限管理接口
export type PermissionType = 'api' | 'element';

export interface PermissionItem {
  id: string;
  code: string;
  name: string;
  types: PermissionType;
  path?: string;
  method?: string;
  description?: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function queryPermissionList(params: {
  page?: number;
  size?: number;
  code?: string;
  name?: string;
  types?: PermissionType;
  path?: string;
  method?: string;
  status?: boolean;
}) {
  return request<{
    code: number;
    message: string;
    data: {
      list: PermissionItem[];
      total: number;
      page: number;
      size: number;
    };
  }>('/api/v1/system/permission', {
    method: 'GET',
    params,
  });
}

export async function createPermission(data: {
  code: string;
  name: string;
  types: PermissionType;
  path?: string;
  method?: string;
  description?: string;
  status?: boolean;
}) {
  return request('/api/v1/system/permission', {
    method: 'POST',
    data,
  });
}

export async function updatePermission(id: string, data: Partial<Omit<PermissionItem, 'id'>>) {
  return request(`/api/v1/system/permission/${id}`, {
    method: 'PUT',
    data: {
      id,
      ...data,
    },
  });
}

export async function deletePermission(id: string) {
  return request(`/api/v1/system/permission/${id}`, {
    method: 'DELETE',
  });
}

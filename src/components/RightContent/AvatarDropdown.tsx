import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { message, Spin } from 'antd';
import { createStyles } from 'antd-style';
import React, { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { logout } from '@/services/ant-design-pro/api';
import HeaderDropdown from '../HeaderDropdown';

export type GlobalHeaderRightProps = {
  menu?: boolean;
  children?: React.ReactNode;
};

export const AvatarName = () => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  const displayName = currentUser?.nickname || currentUser?.username || '';
  return <span className="anticon">{displayName}</span>;
};

const useStyles = createStyles(({ token }) => {
  return {
    action: {
      display: 'flex',
      height: '48px',
      marginLeft: 'auto',
      overflow: 'hidden',
      alignItems: 'center',
      padding: '0 8px',
      cursor: 'pointer',
      borderRadius: token.borderRadius,
      '&:hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
  };
});

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({
  menu,
  children,
}) => {
  const { styles } = useStyles();
  const { initialState, setInitialState } = useModel('@@initialState');

  /**
   * 清除所有本地存储和缓存
   */
  const clearAllStorage = useCallback(() => {
    // 清除 localStorage
    localStorage.clear();
    // 清除 sessionStorage
    sessionStorage.clear();
    // 清除所有 cookies
    document.cookie.split(';').forEach((cookie) => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    // 清除 Service Worker 缓存
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }
  }, []);

  /**
   * 退出登录，并且将当前的 url 保存
   */
  const loginOut = useCallback(async () => {
    try {
      // 调用新的登出接口，带上 token
      await logout();
    } catch (error) {
      // 即使接口调用失败，也继续执行本地清理和跳转
      console.error('退出登录接口调用失败:', error);
    }

    // 清除所有本地存储
    clearAllStorage();

    // 清空用户状态
    flushSync(() => {
      setInitialState((s) => ({ ...s, currentUser: undefined }));
    });

    const { search, pathname } = window.location;
    const urlParams = new URL(window.location.href).searchParams;
    const redirect = urlParams.get('redirect');

    // 如果当前不在登录页且没有 redirect 参数，则跳转到登录页
    if (pathname !== '/user/login' && !redirect) {
      const searchParams = new URLSearchParams({
        redirect: pathname + search,
      });
      history.replace({
        pathname: '/user/login',
        search: searchParams.toString(),
      });
    }
  }, [clearAllStorage, setInitialState]);

  const onMenuClick: MenuProps['onClick'] = useCallback(
    (event: { key: string }) => {
      const { key } = event;
      if (key === 'logout') {
        loginOut();
        message.success('退出登录成功');
        return;
      }
      history.push(`/account/${key}`);
    },
    [loginOut],
  );

  const loading = (
    <span className={styles.action}>
      <Spin
        size="small"
        style={{
          marginLeft: 8,
          marginRight: 8,
        }}
      />
    </span>
  );

  if (!initialState) {
    return loading;
  }

  const { currentUser } = initialState;

  const displayName = currentUser?.nickname || currentUser?.username;

  if (!currentUser || !displayName) {
    return loading;
  }

  const menuItems = [
    ...(menu
      ? [
          {
            key: 'center',
            icon: <UserOutlined />,
            label: '个人中心',
          },
          {
            key: 'settings',
            icon: <SettingOutlined />,
            label: '个人设置',
          },
          {
            type: 'divider' as const,
          },
        ]
      : []),
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  return (
    <HeaderDropdown
      menu={{
        selectedKeys: [],
        onClick: onMenuClick,
        items: menuItems,
      }}
    >
      {children}
    </HeaderDropdown>
  );
};

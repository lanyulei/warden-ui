/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  return {
    // 管理员判断改为后端的 is_admin 字段
    canAdmin: !!currentUser?.is_admin,
  };
}

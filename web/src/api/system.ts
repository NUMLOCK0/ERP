import { get, post, put, del } from './request'

// 系统配置
export async function getConfigs() {
  const res: any = await get('/system/config')
  if (Array.isArray(res.data)) {
    res.data = Object.fromEntries(res.data.map((item: any) => [item.key, item.value]))
  }
  return res
}
export function saveConfigs(data: any) { return put('/system/config', data) }
export const getSystemConfig = getConfigs
export const saveSystemConfig = saveConfigs

// 管理员
export function getAdmins(params?: any) { return get('/system/admin', params) }
export function createAdmin(data: any) { return post('/system/admin', data) }
export function updateAdmin(id: number, data: any) { return put(`/system/admin/${id}`, data) }
export function deleteAdmin(id: number) { return del(`/system/admin/${id}`) }
export function resetAdminPassword(id: number, password: string) { return put(`/system/admin/${id}/password`, { password }) }

// 角色
export function getRoles(params?: any) { return get('/system/role', params) }
export function createRole(data: any) { return post('/system/role', data) }
export function updateRole(id: number, data: any) { return put(`/system/role/${id}`, data) }
export function deleteRole(id: number) { return del(`/system/role/${id}`) }

// 操作日志
export function getOperationLogs(params?: any) { return get('/system/log', params) }

// 打印模板
export function getPrintTemplates(params?: any) { return get('/system/print-template', params) }
export function createPrintTemplate(data: any) { return post('/system/print-template', data) }
export function updatePrintTemplate(id: number, data: any) { return put(`/system/print-template/${id}`, data) }
export function deletePrintTemplate(id: number) { return del(`/system/print-template/${id}`) }
export function setDefaultTemplate(id: number) { return post(`/system/print-template/${id}/default`) }

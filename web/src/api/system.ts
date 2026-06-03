import { get, post, put, del } from './request'

// 系统配置
export function getConfigs() { return get('/system/configs') }
export function saveConfigs(data: any) { return put('/system/configs', data) }

// 管理员
export function getAdmins(params?: any) { return get('/system/admins', params) }
export function createAdmin(data: any) { return post('/system/admins', data) }
export function updateAdmin(id: number, data: any) { return put(`/system/admins/${id}`, data) }
export function deleteAdmin(id: number) { return del(`/system/admins/${id}`) }

// 角色
export function getRoles(params?: any) { return get('/system/roles', params) }
export function createRole(data: any) { return post('/system/roles', data) }
export function updateRole(id: number, data: any) { return put(`/system/roles/${id}`, data) }
export function deleteRole(id: number) { return del(`/system/roles/${id}`) }

// 操作日志
export function getOperationLogs(params?: any) { return get('/system/logs', params) }

// 打印模板
export function getPrintTemplates(params?: any) { return get('/system/print-templates', params) }
export function createPrintTemplate(data: any) { return post('/system/print-templates', data) }
export function updatePrintTemplate(id: number, data: any) { return put(`/system/print-templates/${id}`, data) }
export function deletePrintTemplate(id: number) { return del(`/system/print-templates/${id}`) }

import { get, post, put, del } from './request'

export function getEmployees(params?: any) { return get('/employees', params) }
export function createEmployee(data: any) { return post('/employees', data) }
export function updateEmployee(id: number, data: any) { return put(`/employees/${id}`, data) }
export function deleteEmployee(id: number) { return del(`/employees/${id}`) }

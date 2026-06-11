import { get, post, put, del } from './request'

export function getEmployees(params?: any) { return get('/employee', params) }
export function getAllEmployees() { return get('/employee/all') }
export function createEmployee(data: any) { return post('/employee', data) }
export function updateEmployee(id: number, data: any) { return put(`/employee/${id}`, data) }
export function deleteEmployee(id: number) { return del(`/employee/${id}`) }

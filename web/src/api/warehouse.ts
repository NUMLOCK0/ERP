import { get, post, put, del } from './request'

export function getWarehouses(params?: any) { return get('/warehouses', params) }
export function createWarehouse(data: any) { return post('/warehouses', data) }
export function updateWarehouse(id: number, data: any) { return put(`/warehouses/${id}`, data) }
export function deleteWarehouse(id: number) { return del(`/warehouses/${id}`) }

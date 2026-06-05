import { get, post, put, del } from './request'

export function getWarehouses(params?: any) { return get('/warehouse', params) }
export function createWarehouse(data: any) { return post('/warehouse', data) }
export function updateWarehouse(id: number, data: any) { return put(`/warehouse/${id}`, data) }
export function deleteWarehouse(id: number) { return del(`/warehouse/${id}`) }

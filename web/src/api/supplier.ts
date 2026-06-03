import { get, post, put, del } from './request'

export function getSuppliers(params?: any) { return get('/suppliers', params) }
export function getSupplier(id: number) { return get(`/suppliers/${id}`) }
export function createSupplier(data: any) { return post('/suppliers', data) }
export function updateSupplier(id: number, data: any) { return put(`/suppliers/${id}`, data) }
export function deleteSupplier(id: number) { return del(`/suppliers/${id}`) }

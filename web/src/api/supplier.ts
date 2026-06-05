import { get, post, put, del } from './request'

export function getSuppliers(params?: any) { return get('/supplier', params) }
export function getSupplier(id: number) { return get(`/supplier/${id}`) }
export function createSupplier(data: any) { return post('/supplier', data) }
export function updateSupplier(id: number, data: any) { return put(`/supplier/${id}`, data) }
export function deleteSupplier(id: number) { return del(`/supplier/${id}`) }

export function getSupplierCategories(params?: any) { return get('/supplier/category', params) }
export function createSupplierCategory(data: any) { return post('/supplier/category', data) }
export function updateSupplierCategory(id: number, data: any) { return put(`/supplier/category/${id}`, data) }
export function deleteSupplierCategory(id: number) { return del(`/supplier/category/${id}`) }

export function getMemberLevels(params?: any) { return get('/supplier/member-level', params) }
export function getMemberLevel(id: number) { return get(`/supplier/member-level/${id}`) }
export function getEnabledMemberLevels() { return get('/supplier/member-level/all') }
export function createMemberLevel(data: any) { return post('/supplier/member-level', data) }
export function updateMemberLevel(id: number, data: any) { return put(`/supplier/member-level/${id}`, data) }
export function deleteMemberLevel(id: number) { return del(`/supplier/member-level/${id}`) }

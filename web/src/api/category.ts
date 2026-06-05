import { get, post, put, del } from './request'

export function getCategories(params?: any) { return get('/category', params) }
export function getCategoryTree() { return get('/category/tree') }
export function createCategory(data: any) { return post('/category', data) }
export function updateCategory(id: number, data: any) { return put(`/category/${id}`, data) }
export function deleteCategory(id: number) { return del(`/category/${id}`) }

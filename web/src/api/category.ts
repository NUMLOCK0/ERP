import { get, post, put, del } from './request'

export function getCategories(params?: any) { return get('/categories', params) }
export function getCategoryTree() { return get('/categories/tree') }
export function createCategory(data: any) { return post('/categories', data) }
export function updateCategory(id: number, data: any) { return put(`/categories/${id}`, data) }
export function deleteCategory(id: number) { return del(`/categories/${id}`) }

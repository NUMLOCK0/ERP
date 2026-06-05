import { get, post, put, del } from './request'

export function getBrands(params?: any) { return get('/brand', params) }
export function createBrand(data: any) { return post('/brand', data) }
export function updateBrand(id: number, data: any) { return put(`/brand/${id}`, data) }
export function deleteBrand(id: number) { return del(`/brand/${id}`) }

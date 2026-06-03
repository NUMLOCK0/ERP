import { get, post, put, del } from './request'

export function getBrands(params?: any) { return get('/brands', params) }
export function createBrand(data: any) { return post('/brands', data) }
export function updateBrand(id: number, data: any) { return put(`/brands/${id}`, data) }
export function deleteBrand(id: number) { return del(`/brands/${id}`) }

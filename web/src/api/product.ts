import { get, post, put, del } from './request'

export function getProducts(params?: any) { return get('/product', params) }
export function getProduct(id: number) { return get(`/product/${id}`) }
export function createProduct(data: any) { return post('/product', data) }
export function updateProduct(id: number, data: any) { return put(`/product/${id}`, data) }
export function deleteProduct(id: number) { return del(`/product/${id}`) }

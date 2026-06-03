import { get, post, put, del } from './request'

export function getProducts(params: any) { return get('/products', params) }
export function getProduct(id: number) { return get(`/products/${id}`) }
export function createProduct(data: any) { return post('/products', data) }
export function updateProduct(id: number, data: any) { return put(`/products/${id}`, data) }
export function deleteProduct(id: number) { return del(`/products/${id}`) }

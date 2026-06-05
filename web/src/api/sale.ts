import { get, post, put, del } from './request'

// 销售订单
export function getSaleOrders(params?: any) { return get('/sale/order', params) }
export function getSaleOrder(id: number) { return get(`/sale/order/${id}`) }
export function createSaleOrder(data: any) { return post('/sale/order', data) }
export function updateSaleOrder(id: number, data: any) { return put(`/sale/order/${id}`, data) }
export function deleteSaleOrder(id: number) { return del(`/sale/order/${id}`) }
export function submitSaleOrder(id: number) { return post(`/sale/order/${id}/submit`) }
export function auditSaleOrder(id: number, data?: any) { return post(`/sale/order/${id}/audit`, data) }
export function cancelSaleOrder(id: number) { return post(`/sale/order/${id}/cancel`) }

// 销售发货单
export function getSaleDeliveries(params?: any) { return get('/sale/delivery', params) }
export function getSaleDelivery(id: number) { return get(`/sale/delivery/${id}`) }
export function createSaleDelivery(data: any) { return post('/sale/delivery', data) }

// 销售退货单
export function getSaleReturns(params?: any) { return get('/sale/return', params) }
export function getSaleReturn(id: number) { return get(`/sale/return/${id}`) }
export function createSaleReturn(data: any) { return post('/sale/return', data) }

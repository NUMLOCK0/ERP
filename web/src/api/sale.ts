import { get, post, put, del } from './request'

// 销售订单
export function getSaleOrders(params?: any) { return get('/sale/orders', params) }
export function getSaleOrder(id: number) { return get(`/sale/orders/${id}`) }
export function createSaleOrder(data: any) { return post('/sale/orders', data) }
export function updateSaleOrder(id: number, data: any) { return put(`/sale/orders/${id}`, data) }
export function deleteSaleOrder(id: number) { return del(`/sale/orders/${id}`) }
export function submitSaleOrder(id: number) { return post(`/sale/orders/${id}/submit`) }
export function auditSaleOrder(id: number, data?: any) { return post(`/sale/orders/${id}/audit`, data) }
export function cancelSaleOrder(id: number) { return post(`/sale/orders/${id}/cancel`) }

// 销售发货单
export function getSaleDeliveries(params?: any) { return get('/sale/deliveries', params) }
export function getSaleDelivery(id: number) { return get(`/sale/deliveries/${id}`) }
export function createSaleDelivery(data: any) { return post('/sale/deliveries', data) }

// 销售退货单
export function getSaleReturns(params?: any) { return get('/sale/returns', params) }
export function getSaleReturn(id: number) { return get(`/sale/returns/${id}`) }
export function createSaleReturn(data: any) { return post('/sale/returns', data) }

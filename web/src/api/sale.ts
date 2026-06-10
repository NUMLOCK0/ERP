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
export function closeSaleOrder(id: number) { return post(`/sale/order/${id}/close`) }

// 销售发货单
export function getSaleDeliveries(params?: any) { return get('/sale/delivery', params) }
export function getSaleDelivery(id: number) { return get(`/sale/delivery/${id}`) }
export function createSaleDelivery(data: any) { return post('/sale/delivery', data) }
export function shipSaleDelivery(id: number, data?: any) { return post(`/sale/delivery/${id}/ship`, data) }
export function cancelSaleDelivery(id: number) { return post(`/sale/delivery/${id}/cancel`) }
export function receiveSaleDelivery(id: number) { return post(`/sale/delivery/${id}/receive`) }
export function batchReceiveSaleDeliveries(ids: number[]) { return post('/sale/delivery/batch-receive', { ids }) }

// 发货退货单
export function getSaleReturns(params?: any) { return get('/sale/return', params) }
export function getSaleReturn(id: number) { return get(`/sale/return/${id}`) }
export function createSaleReturn(data: any) { return post('/sale/return', data) }
export function completeSaleReturn(id: number, data?: any) { return post(`/sale/return/${id}/complete`, data) }
export function cancelSaleReturn(id: number) { return post(`/sale/return/${id}/cancel`) }
export function deleteSaleReturn(id: number) { return del(`/sale/return/${id}`) }

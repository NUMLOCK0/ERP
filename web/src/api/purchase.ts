import { get, post, put, del } from './request'

// 采购订单
export function getPurchaseOrders(params?: any) { return get('/purchase/order', params) }
export function getPurchaseOrder(id: number) { return get(`/purchase/order/${id}`) }
export function createPurchaseOrder(data: any) { return post('/purchase/order', data) }
export function updatePurchaseOrder(id: number, data: any) { return put(`/purchase/order/${id}`, data) }
export function deletePurchaseOrder(id: number) { return del(`/purchase/order/${id}`) }
export function submitPurchaseOrder(id: number) { return post(`/purchase/order/${id}/submit`) }
export function auditPurchaseOrder(id: number, data?: any) { return post(`/purchase/order/${id}/audit`, data) }
export function cancelPurchaseOrder(id: number) { return post(`/purchase/order/${id}/cancel`) }

// 采购入库单
export function getPurchaseInbounds(params?: any) { return get('/purchase/inbound', params) }
export function getPurchaseInbound(id: number) { return get(`/purchase/inbound/${id}`) }
export function createPurchaseInbound(data: any) { return post('/purchase/inbound', data) }

// 采购退货单
export function getPurchaseReturns(params?: any) { return get('/purchase/return', params) }
export function getPurchaseReturn(id: number) { return get(`/purchase/return/${id}`) }
export function createPurchaseReturn(data: any) { return post('/purchase/return', data) }

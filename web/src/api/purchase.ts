import { get, post, put, del } from './request'

// 采购订单
export function getPurchaseOrders(params?: any) { return get('/purchase/orders', params) }
export function getPurchaseOrder(id: number) { return get(`/purchase/orders/${id}`) }
export function createPurchaseOrder(data: any) { return post('/purchase/orders', data) }
export function updatePurchaseOrder(id: number, data: any) { return put(`/purchase/orders/${id}`, data) }
export function deletePurchaseOrder(id: number) { return del(`/purchase/orders/${id}`) }
export function submitPurchaseOrder(id: number) { return post(`/purchase/orders/${id}/submit`) }
export function auditPurchaseOrder(id: number, data?: any) { return post(`/purchase/orders/${id}/audit`, data) }
export function cancelPurchaseOrder(id: number) { return post(`/purchase/orders/${id}/cancel`) }

// 采购入库单
export function getPurchaseInbounds(params?: any) { return get('/purchase/inbounds', params) }
export function getPurchaseInbound(id: number) { return get(`/purchase/inbounds/${id}`) }
export function createPurchaseInbound(data: any) { return post('/purchase/inbounds', data) }

// 采购退货单
export function getPurchaseReturns(params?: any) { return get('/purchase/returns', params) }
export function getPurchaseReturn(id: number) { return get(`/purchase/returns/${id}`) }
export function createPurchaseReturn(data: any) { return post('/purchase/returns', data) }

import { get, post, put, del } from './request'

// 采购订单
export function getPurchaseOrders(params?: any) { return get('/purchase/order', params) }
export function getPurchaseOrder(id: number) { return get(`/purchase/order/${id}`) }
export function createPurchaseOrder(data: any) { return post('/purchase/order', data) }
export function updatePurchaseOrder(id: number, data: any) { return put(`/purchase/order/${id}`, data) }
export function deletePurchaseOrder(id: number) { return del(`/purchase/order/${id}`) }
export function submitPurchaseOrder(id: number) { return post(`/purchase/order/${id}/submit`) }
export function auditPurchaseOrder(id: number, data?: any) { return post(`/purchase/order/${id}/audit`, data) }
export function rejectPurchaseOrder(id: number) { return post(`/purchase/order/${id}/reject`) }
export function cancelPurchaseOrder(id: number) { return post(`/purchase/order/${id}/cancel`) }
export function closePurchaseOrder(id: number) { return post(`/purchase/order/${id}/close`) }
export function startPurchaseOrder(id: number) { return post(`/purchase/order/${id}/start-purchase`) }
export function confirmPurchasedOrder(id: number, data: any) { return post(`/purchase/order/${id}/confirm-purchased`, data) }
export function startPurchaseInbound(id: number) { return post(`/purchase/order/${id}/start-inbound`) }
export function completePurchaseInboundByOrder(id: number) { return post(`/purchase/order/${id}/complete-inbound`) }
export function createPurchaseOrderInbound(id: number, data: any) { return post(`/purchase/order/${id}/inbound`, data) }
export function createPurchaseOrderReturn(id: number, data: any) { return post(`/purchase/order/${id}/return`, data) }

// 采购入库单
export function getPurchaseInbounds(params?: any) { return get('/purchase/inbound', params) }
export function getPurchaseInbound(id: number) { return get(`/purchase/inbound/${id}`) }
export function createPurchaseInbound(data: any) { return post('/purchase/inbound', data) }
export function completePurchaseInbound(id: number) { return post(`/purchase/inbound/${id}/complete`) }

// 采购退货单
export function getPurchaseReturns(params?: any) { return get('/purchase/return', params) }
export function getPurchaseReturn(id: number) { return get(`/purchase/return/${id}`) }
export function createPurchaseReturn(data: any) { return post('/purchase/return', data) }
export function completePurchaseReturn(id: number, data?: any) { return post(`/purchase/return/${id}/complete`, data) }

// 采购发票登记
export function getPurchaseInvoices(params?: any) { return get('/purchase/invoice', params) }
export function getPurchaseInvoice(id: number) { return get(`/purchase/invoice/${id}`) }
export function createPurchaseInvoice(data: any) { return post('/purchase/invoice', data) }

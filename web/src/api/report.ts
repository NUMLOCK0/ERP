import { get } from './request'

export function getProductStockReport(params?: any) { return get('/report/stock', params) }
export function getSaleDeliveryReport(params?: any) { return get('/report/sale-delivery', params) }
export function getPurchaseInboundReport(params?: any) { return get('/report/purchase-inbound', params) }
export function getPurchaseOrderReport(params?: any) { return get('/report/purchase-order', params) }
export function getSaleOrderReport(params?: any) { return get('/report/sale-order', params) }
export function getSaleReceiptReport(params?: any) { return get('/report/receipt', params) }
export function getPurchasePaymentReport(params?: any) { return get('/report/payment', params) }

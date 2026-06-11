import { get } from './request'

export function getProductStockReport(params?: any) { return get('/report/stock', params) }
export function getSaleDeliveryReport(params?: any) { return get('/report/sale-delivery', params) }
export function getSaleDeliveryWarehouseSummary(params?: any) { return get('/report/sale-delivery/warehouse-summary', params) }
export function getOtherOutboundReport(params?: any) { return get('/report/other-outbound', params) }
export function getOtherOutboundWarehouseSummary(params?: any) { return get('/report/other-outbound/warehouse-summary', params) }
export function getPurchaseInboundReport(params?: any) { return get('/report/purchase-inbound', params) }
export function getPurchaseInboundWarehouseSummary(params?: any) { return get('/report/purchase-inbound/warehouse-summary', params) }
export function getOtherInboundReport(params?: any) { return get('/report/other-inbound', params) }
export function getOtherInboundWarehouseSummary(params?: any) { return get('/report/other-inbound/warehouse-summary', params) }
export function getPurchaseOrderReport(params?: any) { return get('/report/purchase-order', params) }
export function getPurchaseOrderWarehouseSummary(params?: any) { return get('/report/purchase-order/warehouse-summary', params) }
export function getSaleOrderReport(params?: any) { return get('/report/sale-order', params) }
export function getSaleOrderWarehouseSummary(params?: any) { return get('/report/sale-order/warehouse-summary', params) }
export function getSaleReceiptReport(params?: any) { return get('/report/receipt', params) }
export function getSaleReceiptWarehouseSummary(params?: any) { return get('/report/receipt/warehouse-summary', params) }
export function getPurchasePaymentReport(params?: any) { return get('/report/payment', params) }
export function getPurchasePaymentWarehouseSummary(params?: any) { return get('/report/payment/warehouse-summary', params) }

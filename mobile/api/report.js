import http from './request'

export const reportApi = {
  getProductStock: (params) => http.get('/report/stock', params),
  getSaleDelivery: (params) => http.get('/report/sale-delivery', params),
  getSaleDeliverySummary: (params) => http.get('/report/sale-delivery/warehouse-summary', params),
  getPurchaseInbound: (params) => http.get('/report/purchase-inbound', params),
  getPurchaseInboundSummary: (params) => http.get('/report/purchase-inbound/warehouse-summary', params),
  getSaleOrder: (params) => http.get('/report/sale-order', params),
  getSaleOrderSummary: (params) => http.get('/report/sale-order/warehouse-summary', params),
  getPurchaseOrder: (params) => http.get('/report/purchase-order', params),
  getPurchaseOrderSummary: (params) => http.get('/report/purchase-order/warehouse-summary', params),
  getPurchasePaymentReport: (params) => http.get('/report/payment', params),
  getPurchasePaymentWarehouseSummary: (params) => http.get('/report/payment/warehouse-summary', params),
  getOtherInboundReport: (params) => http.get('/report/other-inbound', params),
  getOtherInboundWarehouseSummary: (params) => http.get('/report/other-inbound/warehouse-summary', params),
  getSaleReceiptReport: (params) => http.get('/report/receipt', params),
  getSaleReceiptWarehouseSummary: (params) => http.get('/report/receipt/warehouse-summary', params),
  getOtherOutboundReport: (params) => http.get('/report/other-outbound', params),
  getOtherOutboundWarehouseSummary: (params) => http.get('/report/other-outbound/warehouse-summary', params),
  getHomeSummary: () => http.get('/report/home-summary'),
  getSummary: (params) => http.get('/report/summary', params),
  getDashboard: () => http.get('/report/dashboard')
}

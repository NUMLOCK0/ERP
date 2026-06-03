import http from './request'

export const reportApi = {
  getProductStock: (params) => http.get('/report/product-stock', params),
  getSaleDelivery: (params) => http.get('/report/sale-delivery', params),
  getPurchaseInbound: (params) => http.get('/report/purchase-inbound', params),
  getSaleOrder: (params) => http.get('/report/sale-order', params),
  getPurchaseOrder: (params) => http.get('/report/purchase-order', params),
  getSummary: (params) => http.get('/report/summary', params),
  getDashboard: () => http.get('/report/dashboard')
}

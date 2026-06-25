import http from './request'

export const purchaseApi = {
  // 采购订单 (Purchase Order)
  getOrders: (params) => http.get('/purchase/order', params),
  getOrderDetail: (id) => http.get(`/purchase/order/${id}`),
  createOrder: (data) => http.post('/purchase/order', data),
  updateOrder: (id, data) => http.put(`/purchase/order/${id}`, data),
  deleteOrder: (id) => http.delete(`/purchase/order/${id}`),
  submitOrder: (id) => http.post(`/purchase/order/${id}/submit`),
  auditOrder: (id, data) => http.post(`/purchase/order/${id}/audit`, data),

  // 采购入库单 (Purchase Inbound)
  getInbounds: (params) => http.get('/purchase/inbound', params),
  getInboundDetail: (id) => http.get(`/purchase/inbound/${id}`),
  confirmInbound: (id) => http.post(`/purchase/inbound/${id}/complete`),

  // 采购退货单 (Purchase Return)
  getReturns: (params) => http.get('/purchase/return', params),
  getReturnDetail: (id) => http.get(`/purchase/return/${id}`),
  createReturn: (data) => http.post('/purchase/return', data),
  completeReturn: (id, data) => http.post(`/purchase/return/${id}/complete`, data),

  // 采购发票登记 (Purchase Invoice)
  getInvoices: (params) => http.get('/purchase/invoice', params),
  getInvoiceDetail: (id) => http.get(`/purchase/invoice/${id}`),
  createInvoice: (data) => http.post('/purchase/invoice', data)
}

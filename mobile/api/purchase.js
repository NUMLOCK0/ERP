import http from './request'

export const purchaseApi = {
  // 采购订单
  getOrders: (params) => http.get('/purchase/orders', params),
  getOrderDetail: (id) => http.get(`/purchase/orders/${id}`),
  createOrder: (data) => http.post('/purchase/orders', data),
  updateOrder: (id, data) => http.put(`/purchase/orders/${id}`, data),
  deleteOrder: (id) => http.delete(`/purchase/orders/${id}`),
  submitOrder: (id) => http.post(`/purchase/orders/${id}/submit`),
  auditOrder: (id, data) => http.post(`/purchase/orders/${id}/audit`, data),

  // 采购入库单
  getInbounds: (params) => http.get('/purchase/inbounds', params),
  getInboundDetail: (id) => http.get(`/purchase/inbounds/${id}`),
  confirmInbound: (id) => http.post(`/purchase/inbounds/${id}/confirm`),

  // 采购退货单
  getReturns: (params) => http.get('/purchase/returns', params),
  createReturn: (data) => http.post('/purchase/returns', data)
}

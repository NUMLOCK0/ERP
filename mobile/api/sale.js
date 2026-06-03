import http from './request'

export const saleApi = {
  // 销售订单
  getOrders: (params) => http.get('/sale/orders', params),
  getOrderDetail: (id) => http.get(`/sale/orders/${id}`),
  createOrder: (data) => http.post('/sale/orders', data),
  updateOrder: (id, data) => http.put(`/sale/orders/${id}`, data),
  deleteOrder: (id) => http.delete(`/sale/orders/${id}`),
  submitOrder: (id) => http.post(`/sale/orders/${id}/submit`),
  auditOrder: (id, data) => http.post(`/sale/orders/${id}/audit`, data),

  // 销售发货单
  getDeliveries: (params) => http.get('/sale/deliveries', params),
  getDeliveryDetail: (id) => http.get(`/sale/deliveries/${id}`),
  confirmDelivery: (id) => http.post(`/sale/deliveries/${id}/confirm`),

  // 销售退货单
  getReturns: (params) => http.get('/sale/returns', params),
  createReturn: (data) => http.post('/sale/returns', data)
}

import http from './request'

export const saleApi = {
  // 销售订单 (Sales Order)
  getOrders: (params) => http.get('/sale/order', params),
  getOrderDetail: (id) => http.get(`/sale/order/${id}`),
  createOrder: (data) => http.post('/sale/order', data),
  updateOrder: (id, data) => http.put(`/sale/order/${id}`, data),
  deleteOrder: (id) => http.delete(`/sale/order/${id}`),
  submitOrder: (id) => http.post(`/sale/order/${id}/submit`),
  auditOrder: (id, data) => http.post(`/sale/order/${id}/audit`, data),
  cancelOrder: (id) => http.post(`/sale/order/${id}/cancel`),
  closeOrder: (id) => http.post(`/sale/order/${id}/close`),

  // 销售发货单 (Sales Delivery)
  getDeliveries: (params) => http.get('/sale/delivery', params),
  getDeliveryDetail: (id) => http.get(`/sale/delivery/${id}`),
  createDelivery: (data) => http.post('/sale/delivery', data),
  shipDelivery: (id, data) => http.post(`/sale/delivery/${id}/ship`, data),
  cancelDelivery: (id) => http.post(`/sale/delivery/${id}/cancel`),
  receiveDelivery: (id) => http.post(`/sale/delivery/${id}/receive`),

  // 销售退货单 (Sales Return)
  getReturns: (params) => http.get('/sale/return', params),
  getReturnDetail: (id) => http.get(`/sale/return/${id}`),
  createReturn: (data) => http.post('/sale/return', data),
  completeReturn: (id, data) => http.post(`/sale/return/${id}/complete`, data),
  cancelReturn: (id) => http.post(`/sale/return/${id}/cancel`),
  deleteReturn: (id) => http.delete(`/sale/return/${id}`),

  // 销售发票登记 (Sales Invoice)
  getInvoices: (params) => http.get('/sale/invoice', params),
  getInvoiceDetail: (id) => http.get(`/sale/invoice/${id}`),
  createInvoice: (data) => http.post('/sale/invoice', data)
}

import http from './request'

export const processingApi = {
  getOrders: (params) => http.get('/processing/order', params),
  getOrderDetail: (id) => http.get(`/processing/order/${id}`),
  createOrder: (data) => http.post('/processing/order', data),
  updateOrder: (id, data) => http.put(`/processing/order/${id}`, data),
  startOrder: (id) => http.post(`/processing/order/${id}/start`),
  addStage: (id, data) => http.post(`/processing/order/${id}/stage`, data),
  deleteStage: (id, stageKey) => http.delete(`/processing/order/${id}/stage/${stageKey}`),
  updateStage: (id, stageKey, data) => http.put(`/processing/order/${id}/stage/${stageKey}`, data),
  skipStage: (id, stageKey, data) => http.post(`/processing/order/${id}/stage/${stageKey}/skip`, data),
  completeOrder: (id, data) => http.post(`/processing/order/${id}/complete`, data),
  inboundOrder: (id) => http.post(`/processing/order/${id}/inbound`),
  cancelOrder: (id) => http.post(`/processing/order/${id}/cancel`),
  closeOrder: (id) => http.post(`/processing/order/${id}/close`),
  deleteOrder: (id) => http.delete(`/processing/order/${id}`)
}

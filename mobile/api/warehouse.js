import http from './request'

export const warehouseApi = {
  getList: (params) => http.get('/warehouse', params),
  getDetail: (id) => http.get(`/warehouse/${id}`),
  create: (data) => http.post('/warehouse', data),
  update: (id, data) => http.put(`/warehouse/${id}`, data),
  delete: (id) => http.delete(`/warehouse/${id}`)
}

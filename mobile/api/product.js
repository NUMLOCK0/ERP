import http from './request'

export const productApi = {
  getList: (params) => http.get('/product', params),
  getDetail: (id) => http.get(`/product/${id}`),
  create: (data) => http.post('/product', data),
  update: (id, data) => http.put(`/product/${id}`, data),
  delete: (id) => http.delete(`/product/${id}`)
}

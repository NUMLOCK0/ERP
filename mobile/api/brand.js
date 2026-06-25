import http from './request'

export const brandApi = {
  getList: (params) => http.get('/brand', params),
  getDetail: (id) => http.get(`/brand/${id}`),
  create: (data) => http.post('/brand', data),
  update: (id, data) => http.put(`/brand/${id}`, data),
  delete: (id) => http.delete(`/brand/${id}`)
}

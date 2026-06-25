import http from './request'

export const unitApi = {
  getList: (params) => http.get('/unit', params),
  getDetail: (id) => http.get(`/unit/${id}`),
  create: (data) => http.post('/unit', data),
  update: (id, data) => http.put(`/unit/${id}`, data),
  delete: (id) => http.delete(`/unit/${id}`)
}

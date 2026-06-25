import http from './request'

export const categoryApi = {
  getList: (params) => http.get('/category', params),
  getTree: () => http.get('/category/tree'),
  getDetail: (id) => http.get(`/category/${id}`),
  create: (data) => http.post('/category', data),
  update: (id, data) => http.put(`/category/${id}`, data),
  delete: (id) => http.delete(`/category/${id}`)
}

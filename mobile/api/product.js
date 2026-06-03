import http from './request'

export const productApi = {
  getList: (params) => http.get('/products', params),
  getDetail: (id) => http.get(`/products/${id}`),
  create: (data) => http.post('/products', data),
  update: (id, data) => http.put(`/products/${id}`, data),
  delete: (id) => http.delete(`/products/${id}`),

  getCategories: () => http.get('/categories'),
  getBrands: () => http.get('/brands'),
  getUnits: () => http.get('/units')
}

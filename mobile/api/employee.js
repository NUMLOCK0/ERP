import http from './request'

export const employeeApi = {
  getList: (params) => http.get('/employee', params),
  getDetail: (id) => http.get(`/employee/${id}`),
  create: (data) => http.post('/employee', data),
  update: (id, data) => http.put(`/employee/${id}`, data),
  delete: (id) => http.delete(`/employee/${id}`)
}

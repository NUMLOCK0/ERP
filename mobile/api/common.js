import http from './request'

export const commonApi = {
  getBrands: (params) => http.get('/brand', params),
  getUnits: (params) => http.get('/unit', params),
  getWarehouses: (params) => http.get('/warehouse', params),
  getSuppliers: (params) => http.get('/supplier', params),
  getMemberLevels: (params) => http.get('/supplier/member-level', params)
}

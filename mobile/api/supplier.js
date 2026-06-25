import http from './request'

export const supplierApi = {
  // 企业管理 / 客商管理
  getSuppliers: (params) => http.get('/supplier', params),
  getSupplierDetail: (id) => http.get(`/supplier/${id}`),
  createSupplier: (data) => http.post('/supplier', data),
  updateSupplier: (id, data) => http.put(`/supplier/${id}`, data),
  deleteSupplier: (id) => http.delete(`/supplier/${id}`),

  // 企业分类
  getCategories: (params) => http.get('/supplier/category', params),
  createCategory: (data) => http.post('/supplier/category', data),
  updateCategory: (id, data) => http.put(`/supplier/category/${id}`, data),
  deleteCategory: (id) => http.delete(`/supplier/category/${id}`),

  // 会员登记
  getMemberLevels: (params) => http.get('/supplier/member-level', params),
  getMemberLevelDetail: (id) => http.get(`/supplier/member-level/${id}`),
  createMemberLevel: (data) => http.post('/supplier/member-level', data),
  updateMemberLevel: (id, data) => http.put(`/supplier/member-level/${id}`, data),
  deleteMemberLevel: (id) => http.delete(`/supplier/member-level/${id}`)
}

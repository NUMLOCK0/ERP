import http from './request'

export const inventoryApi = {
  // 库存查询
  getStock: (params) => http.get('/inventory/stock', params),

  // 盘点单
  getChecks: (params) => http.get('/inventory/checks', params),
  getCheckDetail: (id) => http.get(`/inventory/checks/${id}`),
  createCheck: (data) => http.post('/inventory/checks', data),
  confirmCheck: (id) => http.post(`/inventory/checks/${id}/confirm`),

  // 调拨单
  getTransfers: (params) => http.get('/inventory/transfers', params),
  getTransferDetail: (id) => http.get(`/inventory/transfers/${id}`),
  createTransfer: (data) => http.post('/inventory/transfers', data),
  confirmTransfer: (id) => http.post(`/inventory/transfers/${id}/confirm`),

  // 库存日志
  getLogs: (params) => http.get('/inventory/logs', params),

  // 其他出入库
  getOtherInbounds: (params) => http.get('/inventory/other-inbounds', params),
  getOtherOutbounds: (params) => http.get('/inventory/other-outbounds', params)
}

import http from './request'

export const inventoryApi = {
  // 库存查询
  getStock: (params) => http.get('/inventory/stock', params),
  getStockDetail: (id) => http.get(`/inventory/stock/${id}`),
  getWarehouseSummary: () => http.get('/inventory/stock/warehouse-summary'),

  // 其他入库
  getOtherInList: (params) => http.get('/inventory/other-inbound', params),
  getOtherInDetail: (id) => http.get(`/inventory/other-inbound/${id}`),
  createOtherIn: (data) => http.post('/inventory/other-inbound', data),

  // 其他出库
  getOtherOutList: (params) => http.get('/inventory/other-outbound', params),
  getOtherOutDetail: (id) => http.get(`/inventory/other-outbound/${id}`),
  createOtherOut: (data) => http.post('/inventory/other-outbound', data),

  // 库存盘点
  getCheckList: (params) => http.get('/inventory/check', params),
  getCheckDetail: (id) => http.get(`/inventory/check/${id}`),
  createCheck: (data) => http.post('/inventory/check', data),
  confirmCheck: (id) => http.post(`/inventory/check/${id}/confirm`),

  // 库存调拨
  getTransfers: (params) => http.get('/inventory/transfer', params),
  getTransferDetail: (id) => http.get(`/inventory/transfer/${id}`),
  createTransfer: (data) => http.post('/inventory/transfer', data),
  confirmTransfer: (id) => http.post(`/inventory/transfer/${id}/confirm`),

  // 库存日志
  getLogList: (params) => http.get('/inventory/log', params),
  getLogDetail: (id) => http.get(`/inventory/log/${id}`)
}

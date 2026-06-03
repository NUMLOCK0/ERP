import http from './request'

export const financeApi = {
  // 采购付款单
  getPayments: (params) => http.get('/finance/payments', params),
  createPayment: (data) => http.post('/finance/payments', data),
  confirmPayment: (id) => http.post(`/finance/payments/${id}/confirm`),

  // 销售收款单
  getReceipts: (params) => http.get('/finance/receipts', params),
  createReceipt: (data) => http.post('/finance/receipts', data),
  confirmReceipt: (id) => http.post(`/finance/receipts/${id}/confirm`)
}

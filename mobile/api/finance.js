import http from './request'

export const financeApi = {
  // 采购付款单
  getPayments: (params) => http.get('/finance/payment', params),
  getPaymentDetail: (id) => http.get(`/finance/payment/${id}`),
  createPayment: (data) => http.post('/finance/payment', data),
  payPayment: (id, data) => http.post(`/finance/payment/${id}/pay`, data),
  deletePayment: (id) => http.delete(`/finance/payment/${id}`),

  // 销售收款单
  getReceipts: (params) => http.get('/finance/receipt', params),
  getReceiptDetail: (id) => http.get(`/finance/receipt/${id}`),
  createReceipt: (data) => http.post('/finance/receipt', data),
  receiveReceipt: (id, data) => http.post(`/finance/receipt/${id}/receive`, data)
}

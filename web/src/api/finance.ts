import { get, post, put, del } from './request'

// 采购付款单
export function getPayments(params?: any) { return get('/finance/payment', params) }
export function getPayment(id: number) { return get(`/finance/payment/${id}`) }
export function createPayment(data: any) { return post('/finance/payment', data) }

// 销售收款单
export function getReceipts(params?: any) { return get('/finance/receipt', params) }
export function getReceipt(id: number) { return get(`/finance/receipt/${id}`) }
export function createReceipt(data: any) { return post('/finance/receipt', data) }

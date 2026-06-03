import { get, post, put, del } from './request'

// 采购付款单
export function getPayments(params?: any) { return get('/finance/payments', params) }
export function getPayment(id: number) { return get(`/finance/payments/${id}`) }
export function createPayment(data: any) { return post('/finance/payments', data) }

// 销售收款单
export function getReceipts(params?: any) { return get('/finance/receipts', params) }
export function getReceipt(id: number) { return get(`/finance/receipts/${id}`) }
export function createReceipt(data: any) { return post('/finance/receipts', data) }

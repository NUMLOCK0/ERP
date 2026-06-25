import { get, post, put, del } from './request'

// 采购付款单
export function getPayments(params?: any) { return get('/finance/payment', params) }
export function getPayment(id: number) { return get(`/finance/payment/${id}`) }
export function createPayment(data: any) { return post('/finance/payment', data) }
export function payPayment(id: number, data: any) { return post(`/finance/payment/${id}/pay`, data) }
export function invoicePayment(id: number, data: any) { return post(`/finance/payment/${id}/invoice`, data) }
export function deletePayment(id: number) { return del(`/finance/payment/${id}`) }

// 销售收款单
export function getReceipts(params?: any) { return get('/finance/receipt', params) }
export function getReceipt(id: number) { return get(`/finance/receipt/${id}`) }
export function receiveReceipt(id: number, data: any) { return post(`/finance/receipt/${id}/receive`, data) }
export function invoiceReceipt(id: number, data: any) { return post(`/finance/receipt/${id}/invoice`, data) }

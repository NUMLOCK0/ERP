import { get, post, put, del } from './request'

// 库存查询
export function getStocks(params?: any) { return get('/inventory/stocks', params) }

// 库存盘点
export function getChecks(params?: any) { return get('/inventory/checks', params) }
export function getCheck(id: number) { return get(`/inventory/checks/${id}`) }
export function createCheck(data: any) { return post('/inventory/checks', data) }
export function confirmCheck(id: number, data?: any) { return post(`/inventory/checks/${id}/confirm`, data) }

// 库存调拨
export function getTransfers(params?: any) { return get('/inventory/transfers', params) }
export function getTransfer(id: number) { return get(`/inventory/transfers/${id}`) }
export function createTransfer(data: any) { return post('/inventory/transfers', data) }
export function confirmTransfer(id: number) { return post(`/inventory/transfers/${id}/confirm`) }

// 其他入库
export function getOtherInbounds(params?: any) { return get('/inventory/other-inbounds', params) }
export function createOtherInbound(data: any) { return post('/inventory/other-inbounds', data) }

// 其他出库
export function getOtherOutbounds(params?: any) { return get('/inventory/other-outbounds', params) }
export function createOtherOutbound(data: any) { return post('/inventory/other-outbounds', data) }

// 库存日志
export function getInventoryLogs(params?: any) { return get('/inventory/logs', params) }

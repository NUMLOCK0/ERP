import { get, post, put, del } from './request'

// 库存查询
export function getStocks(params?: any) { return get('/inventory/stock', params) }
export function getStockWarehouseSummary() { return get('/inventory/stock/warehouse-summary') }

// 库存盘点
export function getChecks(params?: any) { return get('/inventory/check', params) }
export function getCheck(id: number) { return get(`/inventory/check/${id}`) }
export function createCheck(data: any) { return post('/inventory/check', data) }
export function confirmCheck(id: number, data?: any) { return post(`/inventory/check/${id}/confirm`, data) }

// 库存调拨
export function getTransfers(params?: any) { return get('/inventory/transfer', params) }
export function getTransfer(id: number) { return get(`/inventory/transfer/${id}`) }
export function createTransfer(data: any) { return post('/inventory/transfer', data) }
export function confirmTransfer(id: number) { return post(`/inventory/transfer/${id}/confirm`) }

// 其他入库
export function getOtherInbounds(params?: any) { return get('/inventory/other-inbound', params) }
export function getOtherInbound(id: number) { return get(`/inventory/other-inbound/${id}`) }
export function createOtherInbound(data: any) { return post('/inventory/other-inbound', data) }

// 其他出库
export function getOtherOutbounds(params?: any) { return get('/inventory/other-outbound', params) }
export function getOtherOutbound(id: number) { return get(`/inventory/other-outbound/${id}`) }
export function createOtherOutbound(data: any) { return post('/inventory/other-outbound', data) }

// 库存日志
export function getInventoryLogs(params?: any) { return get('/inventory/log', params) }

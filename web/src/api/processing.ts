import { del, get, post, put } from './request'

export function getProcessingOrders(params?: any) { return get('/processing/order', params) }
export function getProcessingOrder(id: number) { return get(`/processing/order/${id}`) }
export function createProcessingOrder(data: any) { return post('/processing/order', data) }
export function updateProcessingOrder(id: number, data: any) { return put(`/processing/order/${id}`, data) }
export function startProcessingOrder(id: number) { return post(`/processing/order/${id}/start`) }
export function addProcessingStage(id: number, data: any) { return post(`/processing/order/${id}/stage`, data) }
export function deleteProcessingStage(id: number, stageKey: string) { return del(`/processing/order/${id}/stage/${stageKey}`) }
export function updateProcessingStage(id: number, stageKey: string, data: any) {
  return put(`/processing/order/${id}/stage/${stageKey}`, data)
}
export function skipProcessingStage(id: number, stageKey: string, data?: any) {
  return post(`/processing/order/${id}/stage/${stageKey}/skip`, data)
}
export function completeProcessingOrder(id: number, data?: any) { return post(`/processing/order/${id}/complete`, data) }
export function inboundProcessingOrder(id: number) { return post(`/processing/order/${id}/inbound`) }
export function cancelProcessingOrder(id: number) { return post(`/processing/order/${id}/cancel`) }
export function deleteProcessingOrder(id: number) { return del(`/processing/order/${id}`) }

import { get, post, put, del } from './request'

export function getUnits(params?: any) { return get('/units', params) }
export function createUnit(data: any) { return post('/units', data) }
export function updateUnit(id: number, data: any) { return put(`/units/${id}`, data) }
export function deleteUnit(id: number) { return del(`/units/${id}`) }

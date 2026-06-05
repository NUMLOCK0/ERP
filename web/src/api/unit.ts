import { get, post, put, del } from './request'

export function getUnits(params?: any) { return get('/unit', params) }
export function createUnit(data: any) { return post('/unit', data) }
export function updateUnit(id: number, data: any) { return put(`/unit/${id}`, data) }
export function deleteUnit(id: number) { return del(`/unit/${id}`) }

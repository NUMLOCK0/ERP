import { post } from './request'

export function uploadFile(data: FormData) {
  return post('/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  } as any)
}

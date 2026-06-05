import { post } from './request'

export function uploadFile(data: FormData) {
  return post('/upload/file', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

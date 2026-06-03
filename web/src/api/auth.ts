import { post, get } from './request'

export function login(data: { username: string; password: string }) {
  return post('/auth/login', data)
}

export function getUserInfo() {
  return get('/auth/userinfo')
}

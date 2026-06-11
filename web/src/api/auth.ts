import { post, get } from './request'

export function login(data: {
  username: string
  password: string
  captcha_id: string
  captcha_code: string
}) {
  return post('/auth/login', data)
}

export function getCaptcha() {
  return get('/auth/captcha')
}

export function getUserInfo() {
  return get('/auth/userinfo')
}

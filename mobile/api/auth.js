import http from './request'

export const authApi = {
  login: (data) => http.post('/auth/login', data),
  getCaptcha: () => http.get('/auth/captcha'),
  getUserInfo: () => http.get('/auth/userinfo'),
  updatePassword: (data) => http.put('/auth/password', data)
}

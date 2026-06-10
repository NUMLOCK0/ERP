export type StatusTagType = 'primary' | 'success' | 'info' | 'warning' | 'danger'

export function deliveryStatusText(status: any) {
  const map: Record<number, string> = {
    0: '待发货',
    1: '已发货',
    2: '已收货',
    3: '已取消',
    4: '已关闭'
  }
  return map[Number(status)] || '未知'
}

export function deliveryStatusTagType(status: any): StatusTagType {
  const map: Record<number, StatusTagType> = {
    0: 'warning',
    1: 'primary',
    2: 'success',
    3: 'danger',
    4: 'info'
  }
  return map[Number(status)] || 'info'
}

export function returnFlagText(status: any) {
  return Number(status) === 1 ? '已退货' : '无退货'
}

export function returnFlagTagType(status: any): StatusTagType {
  return Number(status) === 1 ? 'danger' : 'info'
}

export function returnOrderStatusText(status: any) {
  if (status === 'completed' || Number(status) === 1) return '已退货'
  if (status === 'cancelled' || Number(status) === 2) return '已取消'
  return '待退货'
}

export function returnOrderStatusTagType(status: any): StatusTagType {
  if (status === 'completed' || Number(status) === 1) return 'success'
  if (status === 'cancelled' || Number(status) === 2) return 'danger'
  return 'warning'
}

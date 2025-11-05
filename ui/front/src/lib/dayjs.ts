/**
 * dayjs 全局配置
 * 统一配置 dayjs 的语言和插件，确保所有地方使用中文
 */
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import updateLocale from 'dayjs/plugin/updateLocale'

// 扩展插件
dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.extend(updateLocale)

// 设置中文语言
dayjs.locale('zh-cn')

// 更新相对时间的中文配置，确保显示正确
dayjs.updateLocale('zh-cn', {
  relativeTime: {
    future: '%s后',
    past: '%s前',
    s: '几秒',
    m: '1分钟',
    mm: '%d分钟',
    h: '1小时',
    hh: '%d小时',
    d: '1天',
    dd: '%d天',
    M: '1个月',
    MM: '%d个月',
    y: '1年',
    yy: '%d年',
  },
})

export default dayjs


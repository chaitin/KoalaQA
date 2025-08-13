import { VersionItem } from '@/api'

export const AttackTypeWhiteList = "-2" // 白名单放行
export const AttackTypeBlackList = "-3" // 黑名单攻击
export const AttackTypeMassPkg = "-4" // 大包攻击
export const AttackTypeACL = "-5" // 频率限制封禁
export const AttackTypeChallenge = "-6" // 人机验证
export const AttackTypeAuthDefense = "-7" // 身份认证拦截
export const AttackTypeOffline = "-8"
export const AttackTypeNone = "-1" // 非 Web 攻击
export const AttackTypeSql_injection = "0"  // SQL 注入
export const AttackTypeXss = "1"  // XSS
export const AttackTypeCsrf = "2"  // CSRF
export const AttackTypeSsrf = "3"  // SSRF
export const AttackTypeDos = "4"  // 拒绝服务
export const AttackTypeBackdoor = "5"  // 后门
export const AttackTypeDeserialization = "6"  // 反序列化
export const AttackTypeCode_execution = "7"  // 代码执行
export const AttackTypeCode_injection = "8"  // 代码注入
export const AttackTypeCommand_injection = "9"  // 命令注入
export const AttackTypeFile_upload = "10" // 文件上传
export const AttackTypeFile_inclusion = "11" // 文件包含
export const AttackTypeRedirect = "12" // 重定向
export const AttackTypeWeak_permission = "13" // 权限不当
export const AttackTypeInfo_leak = "14" // 信息泄露
export const AttackTypeUnauthorized_access = "15" // 未授权访问
export const AttackTypeUnsafe_config = "16" // 不安全的配置
export const AttackTypeXxe = "17" // XXE
export const AttackTypeXpath_injection = "18" // Xpath 注入
export const AttackTypeLdap_injection = "19" // LDAP 注入
export const AttackTypeDirectory_traversal = "20" // 目录穿越
export const AttackTypeScanner = "21" // 扫描器
export const AttackTypePermission_bypass = "22" // 水平权限绕过
export const AttackTypeAcl_bypass = "23" // 垂直权限绕过
export const AttackTypeFile_write = "24" // 文件修改
export const AttackTypeFile_download = "25" // 文件读取
export const AttackTypeFile_deletion = "26" // 文件删除
export const AttackTypeLogic_error = "27" // 逻辑错误
export const AttackTypeCrlf_injection = "28" // CRLF 注入
export const AttackTypeSsti = "29" // 模板注入
export const AttackTypeClick_hijacking = "30" // 点击劫持
export const AttackTypeBuffer_overflow = "31" // 缓冲区溢出
export const AttackTypeInteger_overflow = "32" // 整数溢出
export const AttackTypeFormat_string = "33" // 格式化字符串
export const AttackTypeRace_condition = "34" // 条件竞争
export const AttackTypeHttp_compliance_violation = "35" // http协议合规
export const AttackTypeHttp_smuggling = "36" // http请求走私
export const AttackTypeTimeout = "61" // 超时
export const AttackTypeUnknown = "62" // 未知
export const AttackType = {
  [AttackTypeWhiteList]: '白名单放行',
  [AttackTypeBlackList]: '黑名单攻击',
  [AttackTypeMassPkg]: '大包攻击',
  [AttackTypeACL]: '频率限制封禁',
  [AttackTypeChallenge]: '人机验证',
  [AttackTypeAuthDefense]: '身份认证拦截',
  [AttackTypeOffline]: '离线',
  [AttackTypeSql_injection]: ' SQL 注入',
  [AttackTypeXss]: ' XSS ',
  [AttackTypeCsrf]: ' CSRF ',
  [AttackTypeSsrf]: ' SSRF ',
  [AttackTypeDos]: '拒绝服务',
  [AttackTypeBackdoor]: '后门',
  [AttackTypeDeserialization]: '反序列化',
  [AttackTypeCode_execution]: '代码执行',
  [AttackTypeCode_injection]: '代码注入',
  [AttackTypeCommand_injection]: '命令注入',
  [AttackTypeFile_upload]: '文件上传',
  [AttackTypeFile_inclusion]: '文件包含',
  [AttackTypeRedirect]: '重定向',
  [AttackTypeWeak_permission]: '权限不当',
  [AttackTypeInfo_leak]: '信息泄露',
  [AttackTypeUnauthorized_access]: '未授权访问',
  [AttackTypeUnsafe_config]: '不安全的配置',
  [AttackTypeXxe]: ' XXE ',
  [AttackTypeXpath_injection]: ' Xpath 注入',
  [AttackTypeLdap_injection]: ' LDAP 注入',
  [AttackTypeDirectory_traversal]: '目录穿越',
  [AttackTypeScanner]: '扫描器',
  [AttackTypePermission_bypass]: '水平权限绕过',
  [AttackTypeAcl_bypass]: '垂直权限绕过',
  [AttackTypeFile_write]: '文件修改',
  [AttackTypeFile_download]: '文件读取',
  [AttackTypeFile_deletion]: '文件删除',
  [AttackTypeLogic_error]: '逻辑错误',
  [AttackTypeCrlf_injection]: ' CRLF 注入',
  [AttackTypeSsti]: '模板注入',
  [AttackTypeClick_hijacking]: '点击劫持',
  [AttackTypeBuffer_overflow]: '缓冲区溢出',
  [AttackTypeInteger_overflow]: '整数溢出',
  [AttackTypeFormat_string]: '格式化字符串',
  [AttackTypeRace_condition]: '条件竞争',
  [AttackTypeHttp_compliance_violation]: ' http 协议合规',
  [AttackTypeHttp_smuggling]: ' http 请求走私',
  [AttackTypeTimeout]: '超时',
  [AttackTypeUnknown]: '未知',
  'connect': '连接建立',
  'disconnect': '连接断开',
  'key_login': '密钥登录事件',
  'password_login': '密码登录事件',
  'shell_command': '命令执行',
  'file_event': '入侵遗留文件',
  'unauthorized_access': '未授权访问',
  'malicious_request': '恶意请求',
  'database_command': '数据库操作命令',
  'download_file': '下载文件事件',
  'download_random_file': '任意文件下载漏洞',
  'WEB_ATTACK_SQLI': 'SQL 注入攻击',
  'WEB_ATTACK_XSS': 'XSS 跨站脚本攻击',
  'WEB_ATTACK_CSRF': 'CSRF 跨站请求伪造',
  'WEB_ATTACK_SSRF': 'SSRF 服务器端请求伪造',
  'WEB_ATTACK_DOS': '拒绝服务攻击',
  'WEB_ATTACK_BACK_DOOR': '后门程序',
  'WEB_ATTACK_UNSERIALIZE': '反序列化',
  'WEB_ATTACK_SHELL': '命令执行',
  'WEB_ATTACK_CODE_EXECUTION': '远程代码执行',
  'WEB_ATTACK_CODE_INJECTION': '代码注入攻击',
  'WEB_ATTACK_COMMAND_INJECTION': '命令注入',
  'WEB_ATTACK_FILE_UPLOAD': '文件上传漏洞',
  'WEB_ATTACK_FILE_INCLUSION': '文件包含类攻击',
  'WEB_ATTACK_REDIRECT': '重定向攻击',
  'WEB_ATTACK_WEAK_PERMISSION': '针对错误权限的攻击',
  'WEB_ATTACK_INFO_LEAK': '信息泄漏尝试',
  'WEB_ATTACK_WEAK_PWD': '弱密码',
  'WEB_ATTACK_BAD_OPERATION': '针对运维不当类攻击',
  'WEB_ATTACK_XML_ENTITY_INJECTION': 'XXE 攻击',
  'WEB_ATTACK_XPATH_INJECTION': 'XPath 注入攻击',
  'WEB_ATTACK_LDAP_INJECTION': 'LDAP 注入攻击',
  'WEB_ATTACK_DIRECTORY_TRAVERSAL': '路径穿越',
  'WEB_ATTACK_SCANNER': 'Scanner 攻击',
  'WEB_ATTACK_PERMISSION_BYPASS': '权限绕过',
  'WEB_ATTACK_ACL_BYPASS': '访问控制列表绕过',
  'WEB_ATTACK_FILE_WRITE': '文件写入攻击',
  'WEB_ATTACK_FILE_DOWNLOAD': '文件下载攻击',
  'WEB_ATTACK_FILE_DELETION': '文件删除攻击',
  'WEB_ATTACK_LOGIC_ERROR': '逻辑错误攻击',
  'WEB_ATTACK_CRLF_INJECTION': '回车换行注入',
  'WEB_ATTACK_SSTI': '服务端模板注入',
  'WEB_ATTACK_CLICK_HIJACKING': '点击劫持',
  'WEB_ATTACK_BUFFER_OVERFLOW': '缓冲区溢出攻击',
  'WEB_ATTACK_INTEGER_OVERFLOW': '整数溢出攻击',
  'WEB_ATTACK_FORMAT_STRING': '格式化字符串攻击',
  'WEB_ATTACK_RACE_CONDITION': '竞争条件攻击',
  'rdp_remote_control': '远程桌面操作',
  'inner_connect': '内部连接事件',
  'phone_register': '手机注册事件',
  'Apache Druid RCE(cve-2021-25646)': 'Apache Druid 远程代码执行(cve-2021-25646)',
  'DBus_event': 'DBus 事件',
  'el_injection': 'el表达式注入',
  'ftp_command': 'FTP 命令执行',
  'f5_bigip_mgmt_token': 'iControl REST 使用盗取 Token 调用 API',
  'f5_bigip_mgmt': 'iControl REST 越权 RCE CVE-2021-22986',
  'iec104 command': 'iec104 事件',
  'iec61850 command': 'iec61850 事件',
  'jenkins command': 'Jenkins 远程代码执行',
  'modbus_fcode': 'modbus 功能码',
  'file_event_mysql': 'Mysql反制读文件',
  'OpcUA command': 'OpcUA 事件',
  's7 Comm command': 's7 Comm 事件',
  'shiro_deserialization_attack': 'Shiro RememberMe 反序列化攻击',
  'shiro_permission_bypass_attack': 'Shiro 权限绕过',
  'solr_read_file': 'Solr 任意文件读取',
  'tmui_password_login': 'tmui 密码登录',
  'f5_bigip_tmui': 'tmui 越权 RCE CVE-2020-5902',
  'vm_rce': 'VM 模块命令执行',
  'xmldecoder_deserialization_attack': 'XMLDecoder 反序列化攻击',
  'web_access': '访问网页',
  'wId': 'Webshell 拟态 ID',
  'normal access': '普通访问',
  'Arbitrary file reading(cve-2021-36749)': '任意文件读取(cve-2021-36749)',
  'file_name': '用户下载文件',
  'tomcat_leak': '幽灵猫漏洞',
  'unauthorized_vuln': '越权事件',
  "google_bot": "机器人",
  "360_bot": "机器人",
  "baidu_bot": "机器人",
  "bing_bot": "机器人",
  "bytedance": "机器人",
  "java_http": "自动化",
  "python_requests": "自动化",
  "go_http": "自动化",
  "curl": "自动化",
  "hostname event": "获取主机名",
  "vSphere Client RCE CVE - 2021 - 21985": "漏洞利用",
  "ognl": "OGNL 代码执行",
  "command": "命令执行",
  "deserialization": "反序列化",
  "vCenter Server info leak event": "信息泄露",
  "WEB_ATTACK_FILE_INCLUDE": "文件包含",
  "progress_monitor": "进程创建",
  "dns_query": "DNS 查询",
  "WEB_ATTACK_CMD_INJECTION": "命令注入",
  "samba_command": "Samba 命令",
  "mirror_password_login": "镜像密码登录",
}
export const ThreatSourceUnknown = '0'
export const ThreatSourceSafeLineCE = '1'
export const ThreatSource = {
  [ThreatSourceUnknown]: '未知',
  [ThreatSourceSafeLineCE]: '雷池社区版',
}



export const VIEW_MAP = 'map'
export const VIEW_IP_CLASSIFY = 'ip_classify'
export const VIEW_BANNED_LIST = 'banned_list'
export const VIEW_TYPES = {
  [VIEW_IP_CLASSIFY]: {
    icon: '',
    text: '全部 IP 库',
  },
  // [VIEW_MAP]: {
  //   icon: '',
  //   text: '攻击地图',
  // },
  [VIEW_BANNED_LIST]: {
    icon: '',
    text: '查看申请',
  },
}

export const VERSIONFREE = 'free'
export const VERSIONPRO = 'v1'
export const VERSIONPROMAX = 'v8'
export const VERSIONFEATURES = {
  [VERSIONFREE]: [
    { flag: true, label: '每日 100 次情报查询' },
    { flag: false, label: '支持订阅专业版的 IP 情报' },
    { flag: false, label: '支持 API 接口调用' },
    { flag: false, label: '提供 Nginx 格式规则' },
    { flag: false, label: '支持订阅免费版的 IP 情报' },
    { flag: false, label: '提供 Linux iptables 格式规则' },
    { flag: false, label: '订阅情报实时更新' },
  ],
  [VERSIONPRO]: [
    { flag: true, label: '每日不限次数情报查询' },
    { flag: false, label: '支持订阅专业版的 IP 情报' },
    { flag: true, label: '支持 API 接口调用，100 次/日' },
    { flag: false, label: '提供 Nginx 格式规则' },
    { flag: true, label: '支持订阅免费版的 IP 情报' },
    { flag: false, label: '提供 Linux iptables 格式规则' },
    { flag: true, label: '订阅情报实时更新' },
  ],
  [VERSIONPROMAX]: [
    { flag: true, label: '每日不限次数情报查询' },
    { flag: true, label: '支持订阅专业版的 IP 情报' },
    { flag: true, label: '支持 API 接口调用，2000 次/日' },
    { flag: true, label: '提供 Nginx 格式规则' },
    { flag: true, label: '支持订阅免费版的 IP 情报' },
    { flag: true, label: '提供 Linux iptables 格式规则' },
    { flag: true, label: '订阅情报实时更新' },
  ]
}
export const VERSION: VersionItem[] = [
  {
    label: '免费版',
    value: VERSIONFREE,
    discount_month: 0,
    price_month: -1,
    discount_year: 0,
    price_year: -1,
    color: 'text.primary',
  },
  {
    label: '订阅版',
    value: VERSIONPRO,
    discount_month: 19,
    price_month: 100,
    discount_year: 199,
    price_year: 1200,
    color: 'error.main',
  },
  {
    label: '专业版',
    value: VERSIONPROMAX,
    discount_month: 399,
    price_month: 2000,
    discount_year: 3999,
    price_year: 24000,
    color: 'primary.main',
  },
]

export const PENDING = 'pending'
export const REJECTED = 'rejected'
export const APPROVED = 'approved'
export const BANNEDIPSTATUS = {
  [PENDING]: {
    text: '申请中',
    color: 'warning.main',
  },
  // [PENDING]: {
  //   text: '审核中',
  //   color: 'primary.main',
  // },
  [REJECTED]: {
    text: '已驳回',
    color: 'error.main',
  },
  [APPROVED]: {
    text: '已解封',
    color: 'success.main',
  },
}

export const StatusUnknown = 'unknown'
export const StatusNormal = 'normal'
export const StatusMalicious = 'malicious'
export const StatusEnum = {
  [StatusUnknown]: '/unknown.png',
  [StatusNormal]: '/normal.png',
  [StatusMalicious]: '/error.png',
}

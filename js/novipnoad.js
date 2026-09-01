const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)'

const CHROME_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'

// 站方 RC4 解密 key 的最後已知值
const DEFAULT_DECRYPT_KEY = 'ce974576'

function sleep(ms) {
    const end = Date.now() + ms
    while (Date.now() < end) {}
}

// https://github.com/NanoCat-Me/utils/blob/main/URL.mjs
class URL {
    constructor(url, base = undefined) {
        // $print(`\n🟧 ${name} v${version}\n`)
        url = this.#parse(url, base)
        return this
    }

    #parse(url, base = undefined) {
        const URLRegex =
            /(?:(?<protocol>\w+:)\/\/(?:(?<username>[^\s:"]+)(?::(?<password>[^\s:"]+))?@)?(?<host>[^\s@/]+))?(?<pathname>\/?[^\s@?]+)?(?<search>\?[^\s?]+)?/
        const PortRegex = /(?<hostname>.+):(?<port>\d+)$/
        url = url.match(URLRegex)?.groups || {}
        if (base) {
            base = base?.match(URLRegex)?.groups || {}
            if (!base.protocol || !base.hostname) throw new Error(`🚨 ${name}, ${base} is not a valid URL`)
        }
        if (url.protocol || base?.protocol) this.protocol = url.protocol || base.protocol
        if (url.username || base?.username) this.username = url.username || base.username
        if (url.password || base?.password) this.password = url.password || base.password
        if (url.host || base?.host) {
            this.host = url.host || base.host
            Object.freeze(this.host)
            this.hostname = this.host.match(PortRegex)?.groups.hostname ?? this.host
            this.port = this.host.match(PortRegex)?.groups.port ?? ''
        }
        if (url.pathname || base?.pathname) {
            this.pathname = url.pathname || base?.pathname
            if (!this.pathname.startsWith('/')) this.pathname = '/' + this.pathname
            this.paths = this.pathname.split('/').filter(Boolean)
            Object.freeze(this.paths)
            if (this.paths) {
                const fileName = this.paths[this.paths.length - 1]
                if (fileName?.includes('.')) {
                    const list = fileName.split('.')
                    this.format = list[list.length - 1]
                    Object.freeze(this.format)
                }
            }
        } else this.pathname = ''
        if (url.search || base?.search) {
            this.search = url.search || base.search
            Object.freeze(this.search)
            if (this.search)
                this.searchParams = this.search
                    .slice(1)
                    .split('&')
                    .map((param) => param.split('='))
        }
        this.searchParams = new Map(this.searchParams || [])
        this.harf = this.toString()
        Object.freeze(this.harf)
        return this
    }

    toString() {
        let string = ''
        if (this.protocol) string += this.protocol + '//'
        if (this.username) string += this.username + (this.password ? ':' + this.password : '') + '@'
        if (this.hostname) string += this.hostname
        if (this.port) string += ':' + this.port
        if (this.pathname) string += this.pathname
        if (this.searchParams.size !== 0)
            string +=
                '?' +
                Array.from(this.searchParams)
                    .map((param) => param.join('='))
                    .join('&')
        return string
    }

    toJSON() {
        return JSON.stringify({ ...this })
    }
}

/**
 * 純 JS Base64 編解碼
 */
const _B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function _atob(str) {
    str = String(str).replace(/[^A-Za-z0-9+/]/g, '')
    let result = ''
    let i = 0
    while (i < str.length) {
        const e1 = _B64.indexOf(str[i++])
        const e2 = _B64.indexOf(str[i++])
        const e3 = _B64.indexOf(str[i++]) // 可能為 -1（padding）
        const e4 = _B64.indexOf(str[i++]) // 可能為 -1（padding）
        result += String.fromCharCode((e1 << 2) | (e2 >> 4))
        if (e3 !== -1) result += String.fromCharCode(((e2 & 0xf) << 4) | (e3 >> 2))
        if (e4 !== -1) result += String.fromCharCode(((e3 & 0x3) << 6) | e4)
    }
    return result
}

function _btoa(str) {
    str = String(str)
    let result = ''
    let i = 0
    while (i < str.length) {
        const c1 = str.charCodeAt(i++)
        const c2 = str.charCodeAt(i++) // NaN if out of range
        const c3 = str.charCodeAt(i++) // NaN if out of range
        result += _B64[c1 >> 2]
        result += _B64[((c1 & 0x3) << 4) | (isNaN(c2) ? 0 : c2 >> 4)]
        result += isNaN(c2) ? '=' : _B64[((c2 & 0xf) << 2) | (isNaN(c3) ? 0 : c3 >> 6)]
        result += isNaN(c3) ? '=' : _B64[c3 & 0x3f]
    }
    return result
}

let appConfig = {
    ver: 20260902,
    title: 'NO視頻',
    site: 'https://www.novipnoad.net',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    let list = [
        {
            name: '电影',
            ext: {
                url: `${appConfig.site}/movie/`,
            },
        },
        {
            name: '動畫',
            ext: {
                url: `${appConfig.site}/anime/`,
            },
        },
        {
            name: '綜藝',
            ext: {
                url: `${appConfig.site}/shows/`,
            },
        },
        {
            name: '欧美剧',
            ext: {
                url: `${appConfig.site}/tv/western/`,
            },
        },
        {
            name: '日剧',
            ext: {
                url: `${appConfig.site}/tv/japan/`,
            },
        },
        {
            name: '韩剧',
            ext: {
                url: `${appConfig.site}/tv/korea/`,
            },
        },
        {
            name: '台剧',
            ext: {
                url: `${appConfig.site}/tv/taiwan/`,
            },
        },
        {
            name: '泰剧',
            ext: {
                url: `${appConfig.site}/tv/thailand/`,
            },
        },
        {
            name: '港剧',
            ext: {
                url: `${appConfig.site}/tv/hongkong/`,
            },
        },
        {
            name: '土耳其剧',
            ext: {
                url: `${appConfig.site}/tv/turkey/`,
            },
        },
    ]

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, url } = ext

    if (page > 1) {
        url += `page/${page}/`
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    if (data.includes('Just a moment...')) {
        $utils.openSafari(url, UA)
    }

    const $ = cheerio.load(data)
    $('.video-listing-content .video-item').each((_, element) => {
        const link = $(element).find('.item-thumbnail a').attr('href') || $(element).find('h3 a').attr('href')
        const id = $(element).find('h3 a').attr('rel') || (link ? link.match(/\/(\d+)\.html/)?.[1] : null)
        const title = $(element).find('h3 a').attr('title')
        const cover = $(element).find('img').attr('data-original')
        const subTitle = $(element).find('span.remarks').text()
        if (!id || !link) return
        cards.push({
            vod_id: id,
            vod_name: title.replace(/^(【.*?】)/g, '').trim(),
            vod_pic: cover,
            vod_remarks: subTitle,
            url: link,
            ext: {
                url: link,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    if (data.includes('Just a moment...')) {
        $utils.openSafari(url, UA)
    }

    const $ = cheerio.load(data)

    // 站方格式：<script>window.playInfo={vid:"xxx",pkey:"xxx"};</script>
    let vid = ''
    let pkey = ''
    const playInfoMatch =
        data.match(/window\.playInfo\s*=\s*(\{[^<]*?\})\s*;\s*<\/script>/) ||
        data.match(/window\.playInfo\s*=\s*(\{[^<]*?\})\s*;/)
    if (playInfoMatch) {
        try {
            // key 無引號的類 JSON，僅轉換 { 或 , 後的 key
            const json = playInfoMatch[1].replace(/([{,])\s*(\w+)\s*:/g, '$1"$2":')
            const info = JSON.parse(json)
            vid = info.vid || ''
            pkey = info.pkey || ''
        } catch (e) {
            $print('playInfo parse error: ' + e)
        }
    }
    if (!pkey) {
        // 舊格式 fallback
        const legacy = $('.item-content script').text()
        const pkeyMatch = legacy.match(/pkey:"(.*)"/) || data.match(/pkey:"([^"]*)"/)
        if (pkeyMatch) pkey = pkeyMatch[1]
        if (!vid && legacy.includes('vid:')) {
            const vidMatch = legacy.match(/vid:"(.*)",/)
            if (vidMatch) vid = vidMatch[1]
        }
    }

    // ref 傳完整頁面 URL（og:url 優先，fallback 當前請求 url）
    let pageUrl = $('meta[property="og:url"]').attr('content') || ''
    if (!pageUrl && ext.url) pageUrl = String(ext.url).startsWith('http') ? ext.url : `${appConfig.site}${ext.url}`

    if (vid) {
        tracks.push({
            name: `播放`,
            pan: '',
            ext: {
                vid,
                pkey,
                ref: pageUrl,
            },
        })
    } else {
        const btns = $('.multilink-btn[data-vid]')
        btns.each((_, element) => {
            let name = $(element).text()
            let vid = $(element).attr('data-vid')
            tracks.push({
                name: `${name}`,
                pan: '',
                ext: {
                    vid,
                    pkey,
                    ref: pageUrl,
                },
            })
        })
    }

    return jsonify({
        list: [
            {
                title: '默认分组',
                tracks,
            },
        ],
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const { vid, pkey, ref } = ext

    try {
        if (!vid || !pkey || !ref) throw new Error('缺少 vid/pkey/ref')

        const rc4Key = await getDecryptKey()

        function setGlobal(name, value) {
            try {
                Object.defineProperty(globalThis, name, {
                    get: () => value,
                    configurable: true,
                })
            } catch (e) {}
            if (globalThis[name] === undefined) {
                try {
                    globalThis[name] = value
                } catch (e2) {}
            }
        }
        function setupBrowserEnv() {
            // STACK 檢查：錯誤堆疊不得含 'evalmachine.'（QuickJS）或 'node:internal'（Node）。
            // 不支援 prepareStackTrace 的引擎賦值無效，安全無副作用。
            try {
                Error.prepareStackTrace = function (err, trace) {
                    return (err && err.name ? err.name : 'Error') + '\n    at __ (' + playerUrl + ':1:1)'
                }
            } catch (e) {}

            const storage = {}
            let capturedData = null
            let capturedCkey = null

            // Storage 類：sessionStorage instanceof Storage 須成立，
            // 方法用「方法簡寫」保證無 prototype、new 拋 TypeError、
            // 且 call({},...) 拋 TypeError（NATIVE 檢查）
            function StoragePolyfill() {}
            Object.assign(StoragePolyfill.prototype, {
                setItem(key, value) {
                    if (!(this instanceof StoragePolyfill)) {
                        throw new TypeError("Failed to execute 'setItem' on 'Storage': illegal invocation")
                    }
                    storage[key] = value
                    if (key === 'vkey') {
                        try {
                            capturedData = JSON.parse(value)
                        } catch (e) {
                            capturedData = value
                        }
                    }
                },
                getItem(key) {
                    if (!(this instanceof StoragePolyfill)) {
                        throw new TypeError("Failed to execute 'getItem' on 'Storage': illegal invocation")
                    }
                    return storage[key] || null
                },
                removeItem(key) {
                    if (!(this instanceof StoragePolyfill)) {
                        throw new TypeError("Failed to execute 'removeItem' on 'Storage': illegal invocation")
                    }
                    delete storage[key]
                },
                clear() {
                    Object.keys(storage).forEach((k) => delete storage[k])
                },
            })
            const sessionStorageMock = new StoragePolyfill()

            // 檢查變體要求 String(sessionStorage) === '[object Storage]'
            // 且 sessionStorage instanceof Storage === true
            const storageObj = new StoragePolyfill()
            storageObj[Symbol.toStringTag] = 'Storage'

            setGlobal('sessionStorage', storageObj)
            setGlobal('localStorage', storageObj)
            setGlobal('Storage', StoragePolyfill)

            // 檢查變體要求 MutationObserver.prototype.toString 含 [native code]
            // 以及 Function.prototype.toString 自身須通過原生自檢
            // （name==='toString'、length===0、無 prototype、new 拋 TypeError、
            //   call 自身含 [native code]）
            const observeFn = function observe() {}
            const _origFTS = Function.prototype.toString
            // 需要回傳 [native code] 的原生方法集合（不污染普通函數）
            const _nativeLike = new Set([observeFn])
            // Storage 的方法也被探測為「原生」（noNew + noProto + isNative）
            for (const k of ['setItem', 'getItem', 'removeItem', 'clear']) {
                try {
                    _nativeLike.add(StoragePolyfill.prototype[k])
                } catch (e) {}
            }
            const _ftsHost = {
                toString() {
                    if (this === _ftsHost.toString) return 'function toString() { [native code] }'
                    if (_nativeLike.has(this)) return 'function observe() { [native code] }'
                    return _origFTS.call(this)
                },
            }
            try {
                Function.prototype.toString = _ftsHost.toString
            } catch (e) {}
            function MutationObserverPolyfill() {}
            MutationObserverPolyfill.prototype.observe = observeFn
            MutationObserverPolyfill.prototype.disconnect = function disconnect() {}

            // 檢查變體要求 FileReader/Element/Node 存在
            // 且 Element.prototype.__proto__ === Node.prototype
            // NATIVE 檢查：Node.prototype.appendChild.call({},{}) 須拋 TypeError
            function NodePolyfill() {}
            NodePolyfill.prototype.appendChild = function appendChild(child) {
                if (!(this instanceof NodePolyfill)) {
                    throw new TypeError("Failed to execute 'appendChild' on 'Node': illegal invocation")
                }
                return child
            }
            _nativeLike.add(NodePolyfill.prototype.appendChild)
            function ElementPolyfill() {}
            ElementPolyfill.prototype = Object.create(NodePolyfill.prototype)
            function FileReaderPolyfill() {}
            function HTMLDocumentPolyfill() {}
            function WindowPolyfill() {}
            // window instanceof Window 檢查（Symbol.hasInstance 由 JSC 支援）
            try {
                Object.defineProperty(WindowPolyfill, Symbol.hasInstance, {
                    value: function (instance) {
                        return instance === globalThis || instance instanceof WindowPolyfill
                    },
                    configurable: true,
                })
            } catch (e) {}

            setGlobal('MutationObserver', MutationObserverPolyfill)
            setGlobal('Node', NodePolyfill)
            setGlobal('Element', ElementPolyfill)
            setGlobal('FileReader', FileReaderPolyfill)
            setGlobal('HTMLDocument', HTMLDocumentPolyfill)
            setGlobal('Window', WindowPolyfill)

            setGlobal('window', globalThis)
            setGlobal('self', globalThis)
            //   站方邏輯為 if (window.top !== window.self) 才寫入 vkey，
            //   top 必須與 self 是不同物件
            setGlobal('top', {})

            const docMock = {
                // PROTO 檢查：String(document) === '[object HTMLDocument]'
                [Symbol.toStringTag]: 'HTMLDocument',
                body: {
                    style: {},
                    appendChild: function (el) {
                        return el
                    },
                    removeChild: function (el) {
                        return el
                    },
                },
                documentElement: {
                    style: {},
                    appendChild: function (el) {
                        return el
                    },
                    removeChild: function (el) {
                        return el
                    },
                },
                head: {
                    style: {},
                    appendChild: function (el) {
                        return el
                    },
                    removeChild: function (el) {
                        return el
                    },
                },
                cookie: '',
                referrer: appConfig.site + '/',
                visibilityState: 'visible',
                hidden: false,
                // PROTO 檢查：nodeType===9、instanceof HTMLDocument、[object HTMLDocument]
                nodeType: 9,
                // CSS style 解析：cssText 設定的 kebab-case 轉 camelCase 可讀取
                createStyle: function () {
                    const self = {}
                    const props = {}
                    const getters = {
                        // 支援常見的 kebab → camel 映射
                        fontSize: 'font-size',
                        fontFamily: 'font-family',
                        fontWeight: 'font-weight',
                        marginTop: 'margin-top',
                        marginBottom: 'margin-bottom',
                        marginLeft: 'margin-left',
                        marginRight: 'margin-right',
                        paddingTop: 'padding-top',
                        paddingBottom: 'padding-bottom',
                        paddingLeft: 'padding-left',
                        paddingRight: 'padding-right',
                        display: 'display',
                        position: 'position',
                        width: 'width',
                        height: 'height',
                        maxWidth: 'max-width',
                        maxHeight: 'max-height',
                        visibility: 'visibility',
                        boxSizing: 'box-sizing',
                        flex: 'flex',
                        flexGrow: 'flex-grow',
                        flexShrink: 'flex-shrink',
                        flexBasis: 'flex-basis',
                        border: 'border',
                    }
                    const style = new Proxy(
                        {},
                        {
                            set(target, key, value) {
                                if (key === 'cssText') {
                                    // 解析 css 宣告
                                    const decls = String(value).split(';')
                                    for (const decl of decls) {
                                        const idx = decl.indexOf(':')
                                        if (idx === -1) continue
                                        const rawProp = decl.slice(0, idx).trim()
                                        const rawVal = decl.slice(idx + 1).trim()
                                        if (!rawProp) continue
                                        // 存原始屬性（kebab）
                                        props[rawProp] = rawVal
                                        // 轉 camel 並存
                                        const camel = rawProp.replace(/-([a-z])/g, (m, c) => c.toUpperCase())
                                        target[camel] = rawVal
                                    }
                                    target.cssText = String(value)
                                    return true
                                }
                                target[key] = value
                                return true
                            },
                            get(target, key) {
                                if (key in target) return target[key]
                                return undefined
                            },
                            has(target, key) {
                                return key in target
                            },
                        },
                    )
                    Object.defineProperty(style, 'cssText', {
                        get() {
                            return props.cssText || ''
                        },
                        set(v) {
                            props.cssText = String(v)
                        },
                    })
                    return { style: style, props: props, getters: getters }
                },
                createElement: function (tag) {
                    if (tag === 'canvas') {
                        return {
                            width: 300,
                            height: 150,
                            style: {},
                            getContext: function (type) {
                                if (type === '2d') {
                                    let gradientWait = 0
                                    return {
                                        measureText: (text) => ({ width: text.length * 10 }),
                                        fillText: () => {},
                                        strokeText: () => {},
                                        fillRect: () => {},
                                        clearRect: () => {},
                                        beginPath: () => {},
                                        arc: () => {},
                                        fill: () => {},
                                        // 新變體檢查：getImageData 須回傳完整像素資料
                                        // 且 alpha 總和 > 20。GRADIENT 檢查在 (w=h=1) 時
                                        // 須回傳紅藍混合色（R>70,B>70,G<40,A=255）
                                        getImageData: function (x, y, w, h) {
                                            const width = Math.max(w || 1, 1)
                                            const height = Math.max(h || 1, 1)
                                            if (width === 1 && height === 1) {
                                                // GRADIENT 探測：填充 linear-gradient 後取中點像素
                                                return {
                                                    data: new Uint8ClampedArray([128, 0, 127, 255]),
                                                    width: 1,
                                                    height: 1,
                                                }
                                            }
                                            const size = width * height * 4
                                            const data = new Uint8ClampedArray(size)
                                            for (let i = 3; i < size; i += 4) data[i] = 255
                                            return { data: data, width: width, height: height }
                                        },
                                        createLinearGradient() {
                                            return {
                                                addColorStop() {},
                                            }
                                        },
                                        createRadialGradient() {
                                            return {
                                                addColorStop() {},
                                            }
                                        },
                                        putImageData: () => {},
                                        font: '',
                                        fillStyle: '',
                                        textBaseline: '',
                                    }
                                }
                                if (type === 'webgl' || type === 'experimental-webgl') {
                                    return {
                                        getParameter: () => 'WebGL Mock',
                                        getExtension: () => null,
                                        getSupportedExtensions: () => [],
                                    }
                                }
                                return null
                            },
                            toDataURL: () =>
                                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                        }
                    }
                    if (tag === 'script') {
                        return { src: '', type: '', async: false, onload: null, onerror: null }
                    }
                    if (tag === 'style') {
                        // CSSRULES 檢查：style.sheet.cssRules.length > 0
                        const el = {
                            textContent: '',
                            sheet: {
                                cssRules: [{ cssText: '.v7_t{width:168px;}' }],
                                insertRule() {},
                            },
                            style: {},
                        }
                        return el
                    }
                    // 通用元素（含 div）：LAYOUT 檢查用。
                    // 帶 style 物件（cssText 解析 + camelCase），offsetWidth 依 css 提供。
                    const styleObj = {}
                    const props = {}
                    Object.defineProperty(styleObj, 'cssText', {
                        get() {
                            return props.cssText || ''
                        },
                        set(v) {
                            props.cssText = String(v)
                            // kebab → camel
                            const all = String(v).split(';')
                            for (const decl of all) {
                                const idx = decl.indexOf(':')
                                if (idx === -1) continue
                                const rawProp = decl.slice(0, idx).trim()
                                const rawVal = decl.slice(idx + 1).trim()
                                if (rawProp) {
                                    const camel = rawProp.replace(/-([a-z])/g, (m, c) => c.toUpperCase())
                                    styleObj[camel] = rawVal
                                    props[rawProp] = rawVal
                                }
                            }
                        },
                    })
                    const element = {
                        style: styleObj,
                        children: [],
                        parentNode: null,
                        _computedWidth: null,
                        getAttribute: () => null,
                        setAttribute: () => {},
                        appendChild: function (child) {
                            element.children.push(child)
                            child.parentNode = element
                            // 若容器是 flex，立即計算子元素佈局寬（Chrome flex 算法近似）
                            element._layoutChildren()
                            return child
                        },
                        removeChild: function (child) {
                            const i = element.children.indexOf(child)
                            if (i > -1) element.children.splice(i, 1)
                            child.parentNode = null
                            return child
                        },
                    }
                    // Chrome flex 規範算法：display:flex，positive free 依 grow 分配，
                    // 逐項 clamp 到 max-width 並剩餘空間重算（frozen 項固定）
                    element._layoutChildren = function () {
                        const parentW = parseFloat(styleObj.width)
                        if (styleObj.display !== 'flex' || !parentW || !element.children.length) return
                        const items = element.children.map((c) => {
                            const cs = c.style || {}
                            const flex = String(cs.flex || '').split(' ')
                            return {
                                el: c,
                                grow: parseFloat(flex[0]) || parseFloat(cs.flexGrow) || 0,
                                basis: parseFloat(flex[2] || cs.flexBasis || 0) || 0,
                                maxW: parseFloat(cs.maxWidth) || Infinity,
                                frozen: false,
                                computed: 0,
                            }
                        })
                        // 初始 hypothetical（basis 依 max-width clamp）
                        for (const it of items) {
                            it.computed = Math.min(it.basis, it.maxW)
                        }
                        let free = parentW - items.reduce((s, it) => s + it.computed, 0)
                        // positive free：逐輪分配，超限即 frozen
                        for (let pass = 0; pass < items.length + 1; pass++) {
                            if (free <= 0) break
                            const flexTotal = items.reduce((s, it) => s + (it.frozen ? 0 : it.grow), 0)
                            if (flexTotal <= 0) break
                            let allocated = 0
                            for (const it of items) {
                                if (it.frozen) continue
                                const share = free * (it.grow / flexTotal)
                                const target = it.computed + share
                                if (target > it.maxW) {
                                    it.computed = it.maxW
                                    it.frozen = true
                                } else {
                                    it.computed = target
                                    allocated += share
                                }
                            }
                            if (allocated === 0) break
                            free = parentW - items.reduce((s, it) => s + it.computed, 0)
                        }
                        // negative free（簡化：正常 shrink）
                        if (free < 0) {
                            const shrinkTotal = items.reduce((s, it) => s + it.basis, 0)
                            for (const it of items) {
                                if (shrinkTotal > 0) {
                                    it.computed = it.basis + free * (it.basis / shrinkTotal)
                                    it.computed = Math.max(it.computed, 0)
                                }
                            }
                        }
                        for (const it of items) it.el._computedWidth = it.computed
                    }
                    // offsetWidth：LAYOUT（120×40）/ FLEX 佈局 / 顯式 width / max-width
                    Object.defineProperty(element, 'offsetWidth', {
                        get() {
                            if (element._computedWidth != null) return Math.round(element._computedWidth)
                            const w = styleObj.width || styleObj.maxWidth
                            if (styleObj.display === 'flex') {
                                return parseFloat(styleObj.width) || 369
                            }
                            return parseFloat(w) || 120
                        },
                    })
                    Object.defineProperty(element, 'offsetHeight', {
                        get() {
                            return parseFloat(styleObj.height) || 40
                        },
                    })
                    return element
                },
                // 新變體透過 play_iframe 的 postMessage 傳遞 ckey
                getElementById: function (id) {
                    if (id === 'play_iframe') {
                        return {
                            contentWindow: {
                                postMessage: function (msg, origin) {
                                    if (msg && typeof msg === 'object' && msg.ckey) {
                                        capturedCkey = msg.ckey
                                    }
                                },
                            },
                        }
                    }
                    return null
                },
                getElementsByTagName: () => [],
                querySelector: () => null,
                querySelectorAll: () => [],
                addEventListener: () => {},
                removeEventListener: () => {},
            }
            // instanceof HTMLDocument 檢查
            try {
                Object.setPrototypeOf(docMock, HTMLDocumentPolyfill.prototype)
            } catch (e) {}
            setGlobal('document', docMock)

            setGlobal('navigator', {
                userAgent: CHROME_UA,
                plugins: { length: 3 },
                mimeTypes: { length: 2 },
                language: 'zh-TW',
                languages: ['zh-TW', 'zh', 'en'],
                platform: 'Win32',
                hardwareConcurrency: 8,
                deviceMemory: 8,
                maxTouchPoints: 0,
                webdriver: false,
                cookieEnabled: true,
                onLine: true,
            })

            setGlobal('performance', {
                now: () => Date.now(),
                timing: { navigationStart: Date.now() },
            })
            setGlobal('history', { length: 3, state: null, pushState: () => {}, replaceState: () => {} })

            const parsedUrl = new URL(playerUrl)
            setGlobal('location', {
                href: playerUrl,
                hostname: parsedUrl.hostname,
                host: parsedUrl.host,
                protocol: parsedUrl.protocol,
                pathname: parsedUrl.pathname,
                search: parsedUrl.search,
                hash: '',
                origin: parsedUrl.protocol + '//' + parsedUrl.host,
            })

            setGlobal('crypto', {
                getRandomValues: (arr) => {
                    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
                    return arr
                },
                subtle: {},
            })
            setGlobal('screen', {
                width: 1920,
                height: 1080,
                availWidth: 1920,
                availHeight: 1040,
                colorDepth: 24,
                pixelDepth: 24,
            })
            setGlobal('devicePixelRatio', 1)
            setGlobal('innerWidth', 1920)
            setGlobal('innerHeight', 1080)

            if (typeof globalThis.requestAnimationFrame !== 'function') {
                setGlobal('requestAnimationFrame', (cb) => 1)
            }

            if (typeof globalThis.atob !== 'function') {
                setGlobal('atob', _atob)
            }
            if (typeof globalThis.btoa !== 'function') {
                setGlobal('btoa', _btoa)
            }
            setGlobal(
                'IntersectionObserver',
                class {
                    observe() {}
                    disconnect() {}
                },
            )
            setGlobal(
                'ResizeObserver',
                class {
                    observe() {}
                    disconnect() {}
                },
            )
            setGlobal('addEventListener', () => {})
            setGlobal('removeEventListener', () => {})
            setGlobal('dispatchEvent', () => {})

            return () => {
                // 合併：vkey JSON（ref/ip/time，新變體不含 ckey）+ postMessage 攔截的 ckey
                if (capturedData && typeof capturedData === 'object' && !capturedData.ckey && capturedCkey) {
                    capturedData.ckey = capturedCkey
                }
                return capturedData
            }
        }

        async function extractVkeyJS(pageUrl, debug = false, maxRetries = 4) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                if (attempt > 1) sleep(800)

                try {
                    const result = await _extractOnce(pageUrl, debug)
                    if (result && result.vkey && result.device) return result

                    if (debug) $print(`[DEBUG] 第 ${attempt} 次嘗試 vkey 為空，準備重試`)
                } catch (err) {
                    if (debug) $print(`[DEBUG] 第 ${attempt} 次嘗試失敗: ${err.message}`)
                }
            }
            return null
        }

        async function _extractOnce(pageUrl, debug) {
            const playerRes = await $fetch.get(pageUrl, {
                headers: {
                    'User-Agent': CHROME_UA,
                    referer: appConfig.site + '/',
                },
            })
            const pageHtml = playerRes.data

            const deviceMatch = pageHtml.match(/params\['device'\]\s*=\s*'(\w+)'/)
            if (!deviceMatch) throw new Error('找不到 device')
            const device = deviceMatch[1]

            // 提取完整性檢查 JS：marker 後到 </script>（對齊官方 plugin 做法）
            let integrityJs = ''
            if (pageHtml.includes('/*-- 浏览器完整性检查 --*/')) {
                integrityJs = pageHtml.split('/*-- 浏览器完整性检查 --*/')[1].split('</script>')[0]
            } else {
                // 舊格式 fallback
                const legacy = pageHtml.match(/function __\(\) \{([\s\S]*?)\n\}/)
                if (legacy) integrityJs = legacy[0]
            }
            if (!integrityJs) throw new Error('無法找到瀏覽器完整性檢查的 script')

            const getCapturedData = setupBrowserEnv()

            try {
                const fn = new Function(integrityJs + '\nif (typeof __ === "function") __()')
                fn()
            } catch (evalErr) {
                if (debug) $print(`[DEBUG] 執行錯誤（嘗試繼續）: ${evalErr.message}`)
            }

            sleep(200)
            let vkey = getCapturedData()
            if (typeof vkey === 'string') {
                // 格式2：sessionStorage.setItem('vkey', JSON.stringify({ckey:'..',ref:'..',ip:'..',time:'..'}))
                const m = vkey.match(/\{ckey:'(\w+)',ref:'(.*?)',ip:'(.*?)',time:'(\d+)'\}/)
                if (m) vkey = { ckey: m[1], ref: m[2], ip: m[3], time: m[4] }
            }
            if (!vkey || !vkey.ckey) throw new Error('vkey 未取得')

            return { device, vkey }
        }

        const playerUrl = `https://player.novipnoad.net/v1/?url=${vid}&pkey=${pkey}&ref=${encodeURIComponent(ref)}`
        const result = await extractVkeyJS(playerUrl, false, 8)
        if (!result) throw new Error('vkey 提取失敗')
        const vkey = result.vkey

        // get jsapi
        sleep(200)
        const phpUrl = `https://player.novipnoad.net/v1/player.php?id=${vid}&device=${result.device}`
        const phpres = await $fetch.get(phpUrl, {
            headers: {
                'User-Agent': CHROME_UA,
                referer: playerUrl,
            },
        })

        const jsapiMatch =
            phpres.data.match(/const\s+jsapi\s*=\s*'(.*?)'\s*;/) || phpres.data.match(/jsapi\s*=\s*'(.*?)'/)
        if (!jsapiMatch) throw new Error('jsapi 未取得')

        const jsUrl =
            jsapiMatch[1] +
            '?ckey=' +
            vkey.ckey.toUpperCase() +
            '&ref=' +
            encodeURIComponent(vkey.ref) +
            '&ip=' +
            vkey.ip +
            '&time=' +
            vkey.time

        // get play url
        sleep(200)
        const jsres = await $fetch.get(jsUrl, {
            headers: {
                'User-Agent': CHROME_UA,
                referer: 'https://player.novipnoad.net/',
            },
        })
        const videoMatch = jsres.data.match(/var\s+videoUrl\s*=\s*JSON\.decrypt\(\s*['"](.*?)['"]\s*\)\s*;/)
        if (!videoMatch) throw new Error('videoUrl 未取得')
        const videoJson = decryptUrl(videoMatch[1], rc4Key)
        if (!videoJson.quality || videoJson.quality.length === 0) throw new Error('quality 列表為空')
        const idx = videoJson.defaultQuality < videoJson.quality.length ? videoJson.defaultQuality : 0
        const playUrl = videoJson.quality[idx].url
        $print(`playUrl: ${playUrl}`)

        return jsonify({
            urls: [playUrl],
            headers: {
                'User-Agent': CHROME_UA,
                Referer: 'https://player.novipnoad.net/',
                Origin: 'https://player.novipnoad.net',
            },
        })
    } catch (error) {
        $print('getPlayinfo error: ' + error)
        return jsonify({ urls: [] })
    }
}

let _cachedDecryptKey = null
async function getDecryptKey() {
    if (_cachedDecryptKey) return _cachedDecryptKey
    const keyUrls = [
        'https://raw.githubusercontent.com/muedsa/novipnoad-plugin/refs/heads/main/key',
        'https://ghfast.top/https://raw.githubusercontent.com/muedsa/novipnoad-plugin/refs/heads/main/key',
        'https://gh-proxy.com/raw.githubusercontent.com/muedsa/novipnoad-plugin/refs/heads/main/key',
    ]
    for (const url of keyUrls) {
        try {
            const { data } = await $fetch.get(url, {
                headers: { 'User-Agent': UA },
            })
            const key = String(data).trim()
            if (/^[0-9a-f]{8}$/.test(key)) {
                _cachedDecryptKey = key
                return key
            }
        } catch (e) {}
    }
    return DEFAULT_DECRYPT_KEY
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/page/${page}/?s=${text}`

    const { data } = await $fetch.get(url, {
        headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,/;q=0.8',
            'User-Agent':
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        },
    })

    const $ = cheerio.load(data)

    $('.search-listing-content .video-item').each((_, element) => {
        const vodUrl = $(element).find('.item-thumbnail a').attr('href')
        const vodPic = $(element).find('.item-thumbnail img').attr('data-original')
        const vodName = $(element).find('.item-thumbnail a').attr('title')
        const vodDiJiJi = $(element).find('span.remarks').text()
        cards.push({
            vod_id: vodUrl.match(/net\/.+\/(\d+)\.html/)[1],
            vod_name: vodName.replace(/^(【.*?】)/g, '').trim(),
            vod_pic: vodPic,
            vod_remarks: vodDiJiJi.trim(),
            url: vodUrl,
            ext: {
                url: vodUrl,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

function decryptUrl(_0x395610, key) {
    var _0x15159f = key || DEFAULT_DECRYPT_KEY
    var _0x36346e = _0x2b01e7(_0x395610, _0x15159f)
    if (!_0x36346e.startsWith('{')) throw new Error('解密失敗，key 可能已更換')
    return JSON.parse(_0x36346e)
}

function _0x2b01e7(_0x12f758, _0xda9b8e) {
    var b = '3.3.1'
    var _0x3bf069 = _atob(_0x12f758)
    for (var _0x19fa71, _0x300ace = [], _0x18815b = 0, _0xe5da02 = '', _0x1d31f3 = 0; 256 > _0x1d31f3; _0x1d31f3++) {
        _0x300ace[_0x1d31f3] = _0x1d31f3
    }
    for (_0x1d31f3 = 0; 256 > _0x1d31f3; _0x1d31f3++) {
        _0x18815b = (_0x18815b + _0x300ace[_0x1d31f3] + _0xda9b8e.charCodeAt(_0x1d31f3 % _0xda9b8e.length)) % 256
        _0x19fa71 = _0x300ace[_0x1d31f3]
        _0x300ace[_0x1d31f3] = _0x300ace[_0x18815b]
        _0x300ace[_0x18815b] = _0x19fa71
    }
    for (b = _0x18815b = _0x1d31f3 = 0; b < _0x3bf069.length; b++) {
        _0x1d31f3 = (_0x1d31f3 + 1) % 256
        _0x18815b = (_0x18815b + _0x300ace[_0x1d31f3]) % 256
        _0x19fa71 = _0x300ace[_0x1d31f3]
        _0x300ace[_0x1d31f3] = _0x300ace[_0x18815b]
        _0x300ace[_0x18815b] = _0x19fa71
        _0xe5da02 += String.fromCharCode(
            _0x3bf069.charCodeAt(b) ^ _0x300ace[(_0x300ace[_0x1d31f3] + _0x300ace[_0x18815b]) % 256],
        )
    }
    return _0xe5da02
}

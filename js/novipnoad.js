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
    ver: 20260904,
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
            // NATIVE 檢查：EventTarget.prototype.addEventListener 須存在、
            // new 拋 TypeError（方法簡寫無 prototype，不可構造）
            function EventTargetPolyfill() {}
            EventTargetPolyfill.prototype.addEventListener = {
                addEventListener() {
                    if (!(this instanceof EventTargetPolyfill)) {
                        throw new TypeError(
                            "Failed to execute 'addEventListener' on 'EventTarget': illegal invocation",
                        )
                    }
                },
            }.addEventListener
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
            setGlobal('EventTarget', EventTargetPolyfill)
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
                        // GRADIENT 雙點探測：站方以 createLinearGradient 灌紅藍漸變後，
                        // 在左右兩點採樣（左偏紅 R>150，右偏藍 B>150），須按 x 插值回應
                        const canvasEl = {
                            width: 300,
                            height: 150,
                            style: {},
                        }
                        canvasEl.getContext = function (type) {
                            if (type === '2d') {
                                const ctx = {
                                    _grad: null,
                                    _gradFilled: false,
                                    measureText: (text) => ({ width: text.length * 10 }),
                                    fillText: () => {},
                                    strokeText: () => {},
                                    clearRect: () => {},
                                    beginPath: () => {},
                                    arc: () => {},
                                    fill: () => {},
                                    putImageData: () => {},
                                    font: '',
                                    fillStyle: '',
                                    textBaseline: '',
                                }
                                function _parseColor(c) {
                                    c = String(c).trim().toLowerCase()
                                    const names = {
                                        red: [255, 0, 0],
                                        blue: [0, 0, 255],
                                        black: [0, 0, 0],
                                        white: [255, 255, 255],
                                        green: [0, 128, 0],
                                        lime: [0, 255, 0],
                                    }
                                    if (names[c]) return names[c]
                                    let m = c.match(/^#([0-9a-f]{6})$/)
                                    if (m) {
                                        const v = parseInt(m[1], 16)
                                        return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
                                    }
                                    m = c.match(/^#([0-9a-f]{3})$/)
                                    if (m) {
                                        return [
                                            parseInt(m[1][0] + m[1][0], 16),
                                            parseInt(m[1][1] + m[1][1], 16),
                                            parseInt(m[1][2] + m[1][2], 16),
                                        ]
                                    }
                                    m = c.match(/rgba?\(([^)]+)\)/)
                                    if (m) {
                                        const p = m[1].split(',').map((v) => parseFloat(v) || 0)
                                        return [p[0], p[1], p[2]]
                                    }
                                    return [0, 0, 0]
                                }
                                function _sampleGrad(t) {
                                    const stops = ctx._grad.stops.slice().sort((a, b) => a.off - b.off)
                                    t = Math.max(0, Math.min(1, t))
                                    let a = stops[0]
                                    let b = stops[stops.length - 1]
                                    for (let i = 0; i < stops.length - 1; i++) {
                                        if (t >= stops[i].off && t <= stops[i + 1].off) {
                                            a = stops[i]
                                            b = stops[i + 1]
                                            break
                                        }
                                    }
                                    const span = b.off - a.off || 1
                                    const k = (t - a.off) / span
                                    return [
                                        Math.round(a.r + (b.r - a.r) * k),
                                        Math.round(a.g + (b.g - a.g) * k),
                                        Math.round(a.b + (b.b - a.b) * k),
                                    ]
                                }
                                ctx.fillRect = function () {
                                    if (ctx.fillStyle && ctx.fillStyle.stops) ctx._gradFilled = true
                                }
                                // 新變體檢查：getImageData 須回傳完整像素資料
                                // 且 alpha 總和 > 20。舊 GRADIENT 檢查（1x1 中點紅藍混合
                                // R>70,B>70,G<40）由漸變插值自然滿足
                                ctx.getImageData = function (x, y, w, h) {
                                    const width = Math.max(w || 1, 1)
                                    const height = Math.max(h || 1, 1)
                                    const data = new Uint8ClampedArray(width * height * 4)
                                    const useGrad =
                                        ctx._gradFilled &&
                                        ctx._grad &&
                                        ctx._grad.stops.length > 0 &&
                                        canvasEl.width > 1
                                    for (let j = 0; j < height; j++) {
                                        for (let i = 0; i < width; i++) {
                                            const idx = (j * width + i) * 4
                                            let r = 0
                                            let g = 0
                                            let b = 0
                                            if (useGrad) {
                                                const x0 = ctx._grad.x0 || 0
                                                let x1 = ctx._grad.x1
                                                if (!(x1 > x0)) x1 = canvasEl.width
                                                const t = (x + i - x0) / (x1 - x0 || 1)
                                                const c = _sampleGrad(t)
                                                r = c[0]
                                                g = c[1]
                                                b = c[2]
                                            } else if (width === 1 && height === 1) {
                                                r = 128
                                                g = 0
                                                b = 127
                                            }
                                            data[idx] = r
                                            data[idx + 1] = g
                                            data[idx + 2] = b
                                            data[idx + 3] = 255
                                        }
                                    }
                                    return { data: data, width: width, height: height }
                                }
                                ctx.createLinearGradient = function (x0, y0, x1, y1) {
                                    const grad = {
                                        x0: x0,
                                        x1: x1,
                                        stops: [],
                                        addColorStop: function (off, color) {
                                            const c = _parseColor(color)
                                            grad.stops.push({ off: off, r: c[0], g: c[1], b: c[2] })
                                            ctx._grad = grad
                                        },
                                    }
                                    return grad
                                }
                                ctx.createRadialGradient = function () {
                                    return {
                                        addColorStop() {},
                                    }
                                }
                                return ctx
                            }
                            if (type === 'webgl' || type === 'experimental-webgl') {
                                return {
                                    getParameter: () => 'WebGL Mock',
                                    getExtension: () => null,
                                    getSupportedExtensions: () => [],
                                }
                            }
                            return null
                        }
                        canvasEl.toDataURL = () =>
                            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                        return canvasEl
                    }
                    if (tag === 'script') {
                        return { src: '', type: '', async: false, onload: null, onerror: null }
                    }
                    if (tag === 'style') {
                        // CSSRULES 檢查：sheet.cssRules 須動態回顯 textContent
                        // （站方隨機類名/寬度，如 .zenvuioa{width:218px}，寫死即失效）
                        const el = {
                            textContent: '',
                            style: {},
                        }
                        el.sheet = {
                            insertRule() {},
                        }
                        Object.defineProperty(el.sheet, 'cssRules', {
                            get() {
                                if (el.textContent) return [{ cssText: el.textContent }]
                                return [{ cssText: '.v7_t{width:168px;}' }]
                            },
                        })
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
                    // 通用盒模型解析：支援 px / % / calc(% - px)，% 相對父 content 寬
                    // （新變體 LAYOUT：452px border-box + 100% flex + calc(43% - 12px），數值隨機）
                    function _padTotal(st) {
                        const pad = st.padding || st.paddingLeft || ''
                        if (!pad) {
                            const t = parseFloat(st.paddingTop) || 0
                            const l = parseFloat(st.paddingLeft) || 0
                            const r = parseFloat(st.paddingRight) || 0
                            if (t || l || r) return l + r
                            return 0
                        }
                        const nums = String(pad)
                            .split(' ')
                            .map((v) => parseFloat(v) || 0)
                        if (nums.length === 1) return nums[0] * 2
                        if (nums.length === 2) return nums[1] * 2
                        if (nums.length >= 4) return nums[1] + nums[3]
                        return nums[0] * 2
                    }
                    function _resolveOffset(el, depth) {
                        if (!el || !el.style) return 0
                        if (depth > 10) return 0
                        const st = el.style
                        const raw = (st.width || '').trim()
                        // 父 content 寬（遞迴）
                        let parentContent = null
                        if (el.parentNode && el.parentNode.style) {
                            const p = el.parentNode
                            const pRaw = (p.style.width || '').trim()
                            if (pRaw) {
                                const pOff = _resolveOffset(p, depth + 1)
                                const pPad = _padTotal(p.style)
                                parentContent =
                                    p.style.boxSizing === 'border-box' ? pOff - pPad : pOff - pPad
                                if (p.style.boxSizing !== 'border-box') {
                                    // content-box：width 即 content
                                    const m = pRaw.match(/^([\d.]+)px$/)
                                    if (m) parentContent = parseFloat(m[1])
                                    else parentContent = pOff - pPad
                                }
                            }
                        }
                        if (!raw) {
                            // 無寬度：block 撐滿父 content，否則舊預設 120
                            if (parentContent != null && parentContent > 0) return parentContent
                            const mw = st.maxWidth || ''
                            if (mw) return parseFloat(mw) || 120
                            if (st.display === 'flex') return parentContent || 369
                            return 120
                        }
                        let content = null
                        let mPx = raw.match(/^([\d.]+)px$/)
                        if (mPx) {
                            const v = parseFloat(mPx[1])
                            content = st.boxSizing === 'border-box' ? v - _padTotal(st) : v
                            return st.boxSizing === 'border-box' ? v : v + _padTotal(st)
                        }
                        let mPct = raw.match(/^([\d.]+)%$/)
                        if (mPct) {
                            if (parentContent == null) return 369
                            content = (parentContent * parseFloat(mPct[1])) / 100
                            return st.boxSizing === 'border-box' ? content + _padTotal(st) : content
                        }
                        let mCalc = raw.match(/calc\(\s*([\d.]+)%\s*-\s*([\d.]+)px\s*\)/)
                        if (mCalc && parentContent != null) {
                            content = (parentContent * parseFloat(mCalc[1])) / 100 - parseFloat(mCalc[2])
                            return st.boxSizing === 'border-box' ? content + _padTotal(st) : content
                        }
                        const f = parseFloat(raw)
                        if (!isNaN(f)) return f
                        return 120
                    }
                    // offsetWidth：LAYOUT（120×40）/ FLEX 佈局 / 通用盒模型 / max-width
                    Object.defineProperty(element, 'offsetWidth', {
                        get() {
                            if (element._computedWidth != null) return Math.round(element._computedWidth)
                            if (styleObj.display === 'flex' && !styleObj.width) {
                                return 369
                            }
                            const v = _resolveOffset(element, 0)
                            if (v) return Math.round(v)
                            const w = styleObj.width || styleObj.maxWidth
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

            // 新變體 ckey 經 queueMicrotask/Promise.then 非同步 postMessage 投遞，
            // busy-wait 會卡住 event loop 使其永不執行，須先 await 讓 microtask flush
            try {
                await Promise.resolve()
            } catch (e) {}
            try {
                await new Promise(function (r) {
                    try {
                        setTimeout(r, 50)
                    } catch (e2) {
                        r()
                    }
                })
            } catch (e) {}
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

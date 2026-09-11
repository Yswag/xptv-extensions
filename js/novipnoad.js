const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)'

const CHROME_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'

const PLAYER_ORIGIN = 'https://player.novipnoad.net'

const PLAY_HEADERS = {
    'User-Agent': CHROME_UA,
    Referer: PLAYER_ORIGIN + '/',
    Origin: PLAYER_ORIGIN,
}

const DEFAULT_DECRYPT_KEY = '52b7ac39'

const appConfig = {
    ver: 20260911,
    title: 'NO視頻',
    site: 'https://www.novipnoad.net',
}

// ---------------------------------------------------------------------------
// 基礎工具
// ---------------------------------------------------------------------------

function sleep(ms) {
    const end = Date.now() + ms
    while (Date.now() < end) {}
}

// https://github.com/NanoCat-Me/utils/blob/main/URL.mjs
class URL {
    constructor(url, base = undefined) {
        this.#parse(url, base)
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

const _B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function _atob(str) {
    str = String(str).replace(/[^A-Za-z0-9+/]/g, '')
    let result = ''
    let i = 0
    while (i < str.length) {
        const e1 = _B64.indexOf(str[i++])
        const e2 = _B64.indexOf(str[i++])
        const e3 = _B64.indexOf(str[i++])
        const e4 = _B64.indexOf(str[i++])
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
        const c2 = str.charCodeAt(i++)
        const c3 = str.charCodeAt(i++)
        result += _B64[c1 >> 2]
        result += _B64[((c1 & 0x3) << 4) | (isNaN(c2) ? 0 : c2 >> 4)]
        result += isNaN(c2) ? '=' : _B64[((c2 & 0xf) << 2) | (isNaN(c3) ? 0 : c3 >> 6)]
        result += isNaN(c3) ? '=' : _B64[c3 & 0x3f]
    }
    return result
}

// ---------------------------------------------------------------------------
// 瀏覽器環境 mock（供站方完整性檢查腳本執行）
// ---------------------------------------------------------------------------

function setGlobal(name, value) {
    try {
        Object.defineProperty(globalThis, name, { get: () => value, configurable: true })
    } catch (e) {}
    if (globalThis[name] === undefined) {
        try {
            globalThis[name] = value
        } catch (e2) {}
    }
}

// 建立 mock 環境，回傳讀取「捕獲到的 vkey」的函式。
function createBrowserEnv(playerUrl) {
    let capturedVkey = null
    let capturedCkey = null

    // Function.prototype.toString 自檢需回傳 [native code] 的方法集合。
    const nativeLike = new Set()

    function storageIllegal(method) {
        return new TypeError(`Failed to execute '${method}' on 'Storage': illegal invocation`)
    }

    function createStorageClass() {
        const store = {}
        function StoragePolyfill() {}
        Object.assign(StoragePolyfill.prototype, {
            setItem(key, value) {
                if (!(this instanceof StoragePolyfill)) throw storageIllegal('setItem')
                store[key] = value
                if (key === 'vkey') {
                    try {
                        capturedVkey = JSON.parse(value)
                    } catch (e) {
                        capturedVkey = value
                    }
                }
            },
            getItem(key) {
                if (!(this instanceof StoragePolyfill)) throw storageIllegal('getItem')
                return store[key] || null
            },
            removeItem(key) {
                if (!(this instanceof StoragePolyfill)) throw storageIllegal('removeItem')
                delete store[key]
            },
            clear() {
                Object.keys(store).forEach((k) => delete store[k])
            },
        })
        return StoragePolyfill
    }

    const StoragePolyfill = createStorageClass()
    for (const k of ['setItem', 'getItem', 'removeItem', 'clear']) {
        try {
            nativeLike.add(StoragePolyfill.prototype[k])
        } catch (e) {}
    }
    const storageObj = new StoragePolyfill()
    storageObj[Symbol.toStringTag] = 'Storage'
    setGlobal('sessionStorage', storageObj)
    setGlobal('localStorage', storageObj)
    setGlobal('Storage', StoragePolyfill)

    const observeFn = function observe() {}
    nativeLike.add(observeFn)
    const originalFunctionToString = Function.prototype.toString
    const toStringHost = {
        toString() {
            if (this === toStringHost.toString) return 'function toString() { [native code] }'
            if (nativeLike.has(this)) return 'function observe() { [native code] }'
            return originalFunctionToString.call(this)
        },
    }
    try {
        Function.prototype.toString = toStringHost.toString
    } catch (e) {}

    function MutationObserverPolyfill() {}
    MutationObserverPolyfill.prototype.observe = observeFn
    MutationObserverPolyfill.prototype.disconnect = function disconnect() {}

    function NodePolyfill() {}
    NodePolyfill.prototype.appendChild = function appendChild(child) {
        if (!(this instanceof NodePolyfill)) {
            throw new TypeError("Failed to execute 'appendChild' on 'Node': illegal invocation")
        }
        return child
    }
    nativeLike.add(NodePolyfill.prototype.appendChild)

    function ElementPolyfill() {}
    ElementPolyfill.prototype = Object.create(NodePolyfill.prototype)

    function FileReaderPolyfill() {}

    function HTMLDocumentPolyfill() {}

    function EventTargetPolyfill() {}
    EventTargetPolyfill.prototype.addEventListener = {
        addEventListener() {
            if (!(this instanceof EventTargetPolyfill)) {
                throw new TypeError("Failed to execute 'addEventListener' on 'EventTarget': illegal invocation")
            }
        },
    }.addEventListener

    function WindowPolyfill() {}
    try {
        Object.defineProperty(WindowPolyfill, Symbol.hasInstance, {
            value: (instance) => instance === globalThis || instance instanceof WindowPolyfill,
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
    // 站方邏輯要求 top !== self。
    setGlobal('top', {})

    try {
        Error.prepareStackTrace = (err) =>
            (err && err.name ? err.name : 'Error') + '\n    at __ (' + playerUrl + ':1:1)'
    } catch (e) {}

    const docMock = createDocumentMock((ckey) => {
        capturedCkey = ckey
    })
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

    if (typeof globalThis.requestAnimationFrame !== 'function') setGlobal('requestAnimationFrame', () => 1)
    if (typeof globalThis.atob !== 'function') setGlobal('atob', _atob)
    if (typeof globalThis.btoa !== 'function') setGlobal('btoa', _btoa)

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

    return function getCaptured() {
        if (capturedVkey && typeof capturedVkey === 'object' && !capturedVkey.ckey && capturedCkey) {
            capturedVkey.ckey = capturedCkey
        }
        return capturedVkey
    }
}

function createDocumentMock(onCkey) {
    return {
        [Symbol.toStringTag]: 'HTMLDocument',
        body: createContainerMock(),
        documentElement: createContainerMock(),
        head: createContainerMock(),
        cookie: '',
        referrer: appConfig.site + '/',
        visibilityState: 'visible',
        hidden: false,
        nodeType: 9,
        createStyle: createStyleMock,
        createElement: createElementMock,
        getElementById(id) {
            if (id === 'play_iframe') {
                return {
                    contentWindow: {
                        postMessage(msg) {
                            if (msg && typeof msg === 'object' && msg.ckey) onCkey(msg.ckey)
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
}

function createContainerMock() {
    return {
        style: {},
        appendChild: (el) => el,
        removeChild: (el) => el,
    }
}

function createElementMock(tag) {
    if (tag === 'canvas') return createCanvasMock()
    if (tag === 'script') return { src: '', type: '', async: false, onload: null, onerror: null }
    if (tag === 'style') return createStyleElementMock()
    return createGenericElementMock()
}

// <style>：sheet.cssRules 需動態回顯 textContent（站方隨機類名/寬度）。
function createStyleElementMock() {
    const el = { textContent: '', style: {} }
    el.sheet = { insertRule() {} }
    Object.defineProperty(el.sheet, 'cssRules', {
        get() {
            if (el.textContent) return [{ cssText: el.textContent }]
            return [{ cssText: '.v7_t{width:168px;}' }]
        },
    })
    return el
}

function createCanvasMock() {
    const canvasEl = { width: 300, height: 150, style: {} }

    canvasEl.getContext = function (type) {
        if (type === 'webgl' || type === 'experimental-webgl') {
            return {
                getParameter: () => 'WebGL Mock',
                getExtension: () => null,
                getSupportedExtensions: () => [],
            }
        }
        if (type !== '2d') return null

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

        function sampleGradient(t) {
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

        // getImageData 需回傳完整像素資料；漸變填充時按 x 插值取樣。
        ctx.getImageData = function (x, y, w, h) {
            const width = Math.max(w || 1, 1)
            const height = Math.max(h || 1, 1)
            const data = new Uint8ClampedArray(width * height * 4)
            const useGrad = ctx._gradFilled && ctx._grad && ctx._grad.stops.length > 0 && canvasEl.width > 1
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
                        const c = sampleGradient(t)
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
                    const c = parseColor(color)
                    grad.stops.push({ off: off, r: c[0], g: c[1], b: c[2] })
                    ctx._grad = grad
                },
            }
            return grad
        }
        ctx.createRadialGradient = function () {
            return { addColorStop() {} }
        }
        return ctx
    }

    canvasEl.toDataURL = () =>
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    return canvasEl
}

function parseColor(c) {
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
        return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)]
    }
    m = c.match(/rgba?\(([^)]+)\)/)
    if (m) {
        const p = m[1].split(',').map((v) => parseFloat(v) || 0)
        return [p[0], p[1], p[2]]
    }
    return [0, 0, 0]
}

function createStyleMock() {
    const props = {}
    const getters = {
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
                    props.cssText = String(value)
                    applyCssText(target, props, value)
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
}

function createGenericElementMock() {
    const styleObj = {}
    const props = {}
    Object.defineProperty(styleObj, 'cssText', {
        get() {
            return props.cssText || ''
        },
        set(v) {
            props.cssText = String(v)
            applyCssText(styleObj, props, v)
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
            layoutFlexChildren(element, styleObj)
            return child
        },
        removeChild: function (child) {
            const i = element.children.indexOf(child)
            if (i > -1) element.children.splice(i, 1)
            child.parentNode = null
            return child
        },
    }

    Object.defineProperty(element, 'offsetWidth', {
        get() {
            if (element._computedWidth != null) return Math.round(element._computedWidth)
            if (styleObj.display === 'flex' && !styleObj.width) return 369
            const v = resolveOffsetWidth(element, 0)
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
}

// 解析 cssText 並同時寫入 kebab 原始屬性與 camelCase 屬性。
function applyCssText(target, props, cssText) {
    for (const decl of String(cssText).split(';')) {
        const idx = decl.indexOf(':')
        if (idx === -1) continue
        const rawProp = decl.slice(0, idx).trim()
        const rawVal = decl.slice(idx + 1).trim()
        if (!rawProp) continue
        props[rawProp] = rawVal
        target[rawProp.replace(/-([a-z])/g, (m, c) => c.toUpperCase())] = rawVal
    }
}

// 近似 Chrome flex 算法：依 grow 分配剩餘空間，逐項 clamp 至 max-width 後重算。
function layoutFlexChildren(element, styleObj) {
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
    for (const it of items) it.computed = Math.min(it.basis, it.maxW)

    let free = parentW - items.reduce((s, it) => s + it.computed, 0)
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

// 盒模型寬度：支援 px / % / calc(% - px)，% 相對父 content 寬。
function resolveOffsetWidth(el, depth) {
    if (!el || !el.style) return 0
    if (depth > 10) return 0
    const st = el.style
    const raw = (st.width || '').trim()

    let parentContent = null
    if (el.parentNode && el.parentNode.style) {
        const p = el.parentNode
        const pRaw = (p.style.width || '').trim()
        if (pRaw) {
            const pOff = resolveOffsetWidth(p, depth + 1)
            const pPad = totalHorizontalPadding(p.style)
            if (p.style.boxSizing !== 'border-box') {
                const m = pRaw.match(/^([\d.]+)px$/)
                parentContent = m ? parseFloat(m[1]) : pOff - pPad
            } else {
                parentContent = pOff - pPad
            }
        }
    }

    if (!raw) {
        if (parentContent != null && parentContent > 0) return parentContent
        if (st.maxWidth) return parseFloat(st.maxWidth) || 120
        if (st.display === 'flex') return parentContent || 369
        return 120
    }

    const mPx = raw.match(/^([\d.]+)px$/)
    if (mPx) {
        const v = parseFloat(mPx[1])
        return st.boxSizing === 'border-box' ? v : v + totalHorizontalPadding(st)
    }
    const mPct = raw.match(/^([\d.]+)%$/)
    if (mPct) {
        if (parentContent == null) return 369
        const content = (parentContent * parseFloat(mPct[1])) / 100
        return st.boxSizing === 'border-box' ? content + totalHorizontalPadding(st) : content
    }
    const mCalc = raw.match(/calc\(\s*([\d.]+)%\s*-\s*([\d.]+)px\s*\)/)
    if (mCalc && parentContent != null) {
        const content = (parentContent * parseFloat(mCalc[1])) / 100 - parseFloat(mCalc[2])
        return st.boxSizing === 'border-box' ? content + totalHorizontalPadding(st) : content
    }
    const f = parseFloat(raw)
    if (!isNaN(f)) return f
    return 120
}

function totalHorizontalPadding(st) {
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

// ---------------------------------------------------------------------------
// RC4 解密與 key 還原
// ---------------------------------------------------------------------------

let _cachedDecryptKey = null

function rc4Decrypt(cipher, key) {
    var b = '3.3.1'
    var _0x3bf069 = _atob(cipher)
    for (var _0x19fa71, _0x300ace = [], _0x18815b = 0, _0xe5da02 = '', _0x1d31f3 = 0; 256 > _0x1d31f3; _0x1d31f3++) {
        _0x300ace[_0x1d31f3] = _0x1d31f3
    }
    for (_0x1d31f3 = 0; 256 > _0x1d31f3; _0x1d31f3++) {
        _0x18815b = (_0x18815b + _0x300ace[_0x1d31f3] + key.charCodeAt(_0x1d31f3 % key.length)) % 256
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

function extractJqueryUrls(html) {
    const urls = []
    if (!html) return urls
    const re = /<script[^>]+src=["']([^"']*jquery[^"']*)["']/gi
    let m
    while ((m = re.exec(html))) {
        let u = m[1]
        if (!u) continue
        if (u.startsWith('//')) u = 'https:' + u
        else if (u.startsWith('/')) u = PLAYER_ORIGIN + u
        else if (!/^https?:/i.test(u)) u = PLAYER_ORIGIN + '/' + u
        if (!urls.includes(u)) urls.push(u)
    }
    return urls
}

function extractKeyFromJquery(js) {
    const e = js.lastIndexOf('=eval(')
    if (e < 0) return null
    const ifi = js.indexOf('if(', e)
    if (ifi < 0) return null
    const arrs = js.slice(e, ifi).match(/\[0x[0-9a-f]{1,2}(?:,0x[0-9a-f]{1,2})*\]/gi) || []
    if (arrs.length < 5) return null
    let key = ''
    for (let i = 0; i < 5; i++) {
        for (const n of arrs[i].slice(1, -1).split(',')) key += String.fromCharCode(parseInt(n, 16))
    }
    return key || null
}

async function collectDynamicKeys(htmls) {
    const keys = []
    const urls = []
    for (const h of htmls) {
        for (const u of extractJqueryUrls(h)) if (!urls.includes(u)) urls.push(u)
    }
    for (const u of urls) {
        try {
            const { data } = await $fetch.get(u, {
                headers: { 'User-Agent': CHROME_UA, referer: PLAYER_ORIGIN + '/' },
            })
            const k = extractKeyFromJquery(String(data))
            if (k && !keys.includes(k)) keys.push(k)
        } catch (e) {}
    }
    return keys
}

// 逐一嘗試候選 key，回傳首個解出合法 quality JSON 的結果。
function tryDecryptAll(cipher, keys) {
    for (const key of keys) {
        if (!key) continue
        try {
            const out = rc4Decrypt(cipher, key)
            if (out && out.charAt(0) === '{') {
                const obj = JSON.parse(out)
                if (obj && obj.quality) return { obj, key }
            }
        } catch (e) {}
    }
    return null
}

// ---------------------------------------------------------------------------
// 播放鏈解析
// ---------------------------------------------------------------------------

function extractIntegrityJs(pageHtml) {
    const marker = '/*-- 浏览器完整性检查 --*/'
    if (pageHtml.includes(marker)) return pageHtml.split(marker)[1].split('</script>')[0]
    const legacy = pageHtml.match(/function __\(\) \{([\s\S]*?)\n\}/)
    return legacy ? legacy[0] : ''
}

function normalizeVkey(raw) {
    if (typeof raw !== 'string') return raw
    const m = raw.match(/\{ckey:'(\w+)',ref:'(.*?)',ip:'(.*?)',time:'(\d+)'\}/)
    return m ? { ckey: m[1], ref: m[2], ip: m[3], time: m[4] } : raw
}

// 站方以 microtask 非同步投遞 ckey，需讓出 event loop 才會執行。
async function flushMicrotasks() {
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
}

async function fetchPlayerContext(playerUrl) {
    const { data: pageHtml } = await $fetch.get(playerUrl, {
        headers: { 'User-Agent': CHROME_UA, referer: appConfig.site + '/' },
    })
    const deviceMatch = pageHtml.match(/params\['device'\]\s*=\s*'(\w+)'/)
    if (!deviceMatch) throw new Error('找不到 device')
    const integrityJs = extractIntegrityJs(pageHtml)
    if (!integrityJs) throw new Error('無法找到瀏覽器完整性檢查的 script')
    return { device: deviceMatch[1], integrityJs, pageHtml }
}

async function runIntegrityCheck(integrityJs, playerUrl, debug) {
    const getCaptured = createBrowserEnv(playerUrl)
    try {
        new Function(integrityJs + '\nif (typeof __ === "function") __()')()
    } catch (err) {
        if (debug) $print(`[DEBUG] 執行錯誤（嘗試繼續）: ${err.message}`)
    }
    await flushMicrotasks()
    sleep(200)
    return getCaptured()
}

async function extractVkey(playerUrl, debug = false, maxRetries = 4) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (attempt > 1) sleep(800)
        try {
            const ctx = await fetchPlayerContext(playerUrl)
            const vkey = normalizeVkey(await runIntegrityCheck(ctx.integrityJs, playerUrl, debug))
            if (vkey && vkey.ckey) return { device: ctx.device, vkey, pageHtml: ctx.pageHtml }
            if (debug) $print(`[DEBUG] 第 ${attempt} 次嘗試 vkey 為空，準備重試`)
        } catch (err) {
            if (debug) $print(`[DEBUG] 第 ${attempt} 次嘗試失敗: ${err.message}`)
        }
    }
    return null
}

function buildJsapiUrl(jsapi, vkey) {
    return (
        jsapi +
        '?ckey=' +
        vkey.ckey.toUpperCase() +
        '&ref=' +
        encodeURIComponent(vkey.ref) +
        '&ip=' +
        vkey.ip +
        '&time=' +
        vkey.time
    )
}

// 站方拒絕時回純 JSON（非 JSON.decrypt），與解密失敗區分開。
function rejectionError(jsText) {
    const plain = jsText.match(/var\s+videoUrl\s*=\s*(\{[\s\S]*\})\s*;?\s*$/)
    if (plain) {
        let info = {}
        try {
            info = JSON.parse(plain[1])
        } catch (e) {}
        return new Error(`站方拒絕（code=${info.code || '?'} ${info.msg || ''}）`)
    }
    return new Error('videoUrl 未取得')
}

async function resolvePlayUrl(jsText, htmls) {
    const cipherMatch = jsText.match(/var\s+videoUrl\s*=\s*JSON\.decrypt\(\s*['"](.*?)['"]\s*\)\s*;/)
    if (!cipherMatch) throw rejectionError(jsText)

    const keys = []
    if (_cachedDecryptKey) keys.push(_cachedDecryptKey)
    if (!keys.includes(DEFAULT_DECRYPT_KEY)) keys.push(DEFAULT_DECRYPT_KEY)

    let hit = tryDecryptAll(cipherMatch[1], keys)
    if (!hit) {
        // 快路徑失敗才抓 jQuery（僅在 key 輪換時發生）。
        for (const k of await collectDynamicKeys(htmls)) {
            if (!keys.includes(k)) keys.push(k)
        }
        hit = tryDecryptAll(cipherMatch[1], keys)
    }
    if (!hit) throw new Error('解密失敗，key 可能已更換（已嘗試: ' + keys.join(',') + '）')

    _cachedDecryptKey = hit.key
    const video = hit.obj
    if (!video.quality || video.quality.length === 0) throw new Error('quality 列表為空')
    const idx = video.defaultQuality < video.quality.length ? video.defaultQuality : 0
    return video.quality[idx].url
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const { vid, pkey, ref } = ext

    try {
        if (!vid || !pkey || !ref) throw new Error('缺少 vid/pkey/ref')

        const playerUrl = `${PLAYER_ORIGIN}/v1/?url=${vid}&pkey=${pkey}&ref=${encodeURIComponent(ref)}`
        const ctx = await extractVkey(playerUrl, false, 8)
        if (!ctx) throw new Error('vkey 提取失敗')

        sleep(200)
        const phpUrl = `${PLAYER_ORIGIN}/v1/player.php?id=${vid}&device=${ctx.device}`
        const { data: phpHtml } = await $fetch.get(phpUrl, {
            headers: { 'User-Agent': CHROME_UA, referer: playerUrl },
        })
        const jsapiMatch = phpHtml.match(/const\s+jsapi\s*=\s*'(.*?)'\s*;/) || phpHtml.match(/jsapi\s*=\s*'(.*?)'/)
        if (!jsapiMatch) throw new Error('jsapi 未取得')

        sleep(200)
        const { data: jsText } = await $fetch.get(buildJsapiUrl(jsapiMatch[1], ctx.vkey), {
            headers: { 'User-Agent': CHROME_UA, referer: PLAYER_ORIGIN + '/' },
        })

        const playUrl = await resolvePlayUrl(jsText, [phpHtml, ctx.pageHtml])
        $print(`playUrl: ${playUrl}`)

        return jsonify({ urls: [playUrl], headers: [{ ...PLAY_HEADERS }] })
    } catch (error) {
        $print('getPlayinfo error: ' + error)
        return jsonify({ urls: [] })
    }
}

// ---------------------------------------------------------------------------
// XPTV 介面
// ---------------------------------------------------------------------------

async function getLocalInfo() {
    return jsonify({ ver: 1, name: appConfig.title, api: 'novipnoad', type: 3 })
}

async function getConfig() {
    const config = { ...appConfig }
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    const list = [
        { name: '电影', url: `${appConfig.site}/movie/` },
        { name: '動畫', url: `${appConfig.site}/anime/` },
        { name: '綜藝', url: `${appConfig.site}/shows/` },
        { name: '欧美剧', url: `${appConfig.site}/tv/western/` },
        { name: '日剧', url: `${appConfig.site}/tv/japan/` },
        { name: '韩剧', url: `${appConfig.site}/tv/korea/` },
        { name: '台剧', url: `${appConfig.site}/tv/taiwan/` },
        { name: '泰剧', url: `${appConfig.site}/tv/thailand/` },
        { name: '港剧', url: `${appConfig.site}/tv/hongkong/` },
        { name: '土耳其剧', url: `${appConfig.site}/tv/turkey/` },
    ]
    // id 供只帶 id 的呼叫端使用。
    return list.map((t) => ({ name: t.name, ext: { url: t.url, id: t.url } }))
}

// 分類列表排序（站方 ?orderby= 參數）。
const ORDERBY_FILTER = {
    key: 'orderby',
    name: '排序',
    value: [
        { n: '最新', v: '' },
        { n: '最多播放', v: 'view' },
        { n: '最多点赞', v: 'like' },
        { n: '最多评论', v: 'comment' },
        { n: '按标题', v: 'title' },
    ],
}

async function getCards(ext) {
    ext = argsify(ext)
    const cards = []
    let { page = 1, url } = ext
    if (!url) url = ext.id
    if (!url) return jsonify({ list: cards })

    const orderby = (ext.filters && ext.filters.orderby) || ''
    if (page > 1) url += `page/${page}/`
    if (orderby) url += `?orderby=${encodeURIComponent(orderby)}`

    const { data } = await $fetch.get(url, {
        headers: { 'User-Agent': UA },
    })
    if (data.includes('Just a moment...')) $utils.openSafari(url, UA)

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
            ext: { url: link },
        })
    })

    return jsonify({ list: cards, filter: [ORDERBY_FILTER] })
}

async function getTracks(ext) {
    ext = argsify(ext)
    const tracks = []
    const url = ext.url

    const { data } = await $fetch.get(url, {
        headers: { 'User-Agent': UA },
    })
    if (data.includes('Just a moment...')) $utils.openSafari(url, UA)

    const $ = cheerio.load(data)

    // <script>window.playInfo={vid:"…",pkey:"…"};</script>
    let vid = ''
    let pkey = ''
    const playInfoMatch =
        data.match(/window\.playInfo\s*=\s*(\{[^<]*?\})\s*;\s*<\/script>/) ||
        data.match(/window\.playInfo\s*=\s*(\{[^<]*?\})\s*;/)
    if (playInfoMatch) {
        try {
            // key 無引號的類 JSON，僅補 { 或 , 後的 key 引號。
            const info = JSON.parse(playInfoMatch[1].replace(/([{,])\s*(\w+)\s*:/g, '$1"$2":'))
            vid = info.vid || ''
            pkey = info.pkey || ''
        } catch (e) {
            $print('playInfo parse error: ' + e)
        }
    }
    if (!pkey) {
        const legacy = $('.item-content script').text()
        const pkeyMatch = legacy.match(/pkey:"(.*)"/) || data.match(/pkey:"([^"]*)"/)
        if (pkeyMatch) pkey = pkeyMatch[1]
        if (!vid && legacy.includes('vid:')) {
            const vidMatch = legacy.match(/vid:"(.*)",/)
            if (vidMatch) vid = vidMatch[1]
        }
    }

    let pageUrl = $('meta[property="og:url"]').attr('content') || ''
    if (!pageUrl && ext.url) pageUrl = String(ext.url).startsWith('http') ? ext.url : `${appConfig.site}${ext.url}`

    if (vid) {
        tracks.push({ name: '播放', pan: '', ext: { vid, pkey, ref: pageUrl } })
    } else {
        $('.multilink-btn[data-vid]').each((_, element) => {
            tracks.push({
                name: $(element).text(),
                pan: '',
                ext: { vid: $(element).attr('data-vid'), pkey, ref: pageUrl },
            })
        })
    }

    return jsonify({ list: [{ title: '默认分组', tracks }] })
}

async function search(ext) {
    ext = argsify(ext)
    const cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `${appConfig.site}/page/${page}/?s=${text}`

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
            ext: { url: vodUrl },
        })
    })

    return jsonify({ list: cards })
}

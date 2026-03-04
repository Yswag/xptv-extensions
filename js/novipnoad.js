const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)'

function sleep(ms) {
    const end = Date.now() + ms
    while (Date.now() < end) {}
}

// https://github.com/NanoCat-Me/utils/blob/main/URL.mjs
class URL {
    constructor(url, base = undefined) {
        const name = 'URL'
        const version = '2.1.2'
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
    ver: 20251119,
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
        const id = $(element).find('h3 a').attr('rel')
        const title = $(element).find('h3 a').attr('title')
        const cover = $(element).find('img').attr('data-original')
        const subTitle = $(element).find('span.remarks').text()
        cards.push({
            vod_id: id,
            vod_name: title.replace(/^(【.*?】)/g, '').trim(),
            vod_pic: cover,
            vod_remarks: subTitle,
            url: `${appConfig.site}/movie/${id}.html`,
            ext: {
                url: `${appConfig.site}/movie/${id}.html`,
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
    let playInfo = $('.item-content script').text()
    let pkey = playInfo.match(/pkey:"(.*)"/)[1]
    let ref = $('meta[property="og:url"]')
        .attr('content')
        .match(/\.net(.*)/)[1]

    if (playInfo.includes('vid:')) {
        let vid = playInfo.match(/vid:"(.*)",/)[1]
        tracks.push({
            name: `播放`,
            pan: '',
            ext: {
                vid,
                pkey,
                ref,
            },
        })
    } else {
        let btns = $('.multilink-btn')
        btns.each((_, element) => {
            let name = $(element).text()
            let vid = $(element).attr('data-vid')
            tracks.push({
                name: `${name}`,
                pan: '',
                ext: {
                    vid,
                    pkey,
                    ref,
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
        // get vkey
        // 設置瀏覽器環境模擬
        function setGlobal(name, value) {
            try {
                globalThis[name] = value
                // 部分 getter 賦值不拋錯但也不生效，需驗證
                if (globalThis[name] !== value) throw new Error('no-op')
            } catch {
                Object.defineProperty(globalThis, name, {
                    value,
                    writable: true,
                    configurable: true,
                    enumerable: false,
                })
            }
        }
        function setupBrowserEnv(playerUrl, debug = false) {
            const storage = {}
            let capturedData = null
            let functionCalled = false

            const sessionStorageMock = {
                setItem: (key, value) => {
                    storage[key] = value
                    functionCalled = true
                    if (debug) $print(`[DEBUG] sessionStorage.setItem("${key}", ...)`)
                    try {
                        capturedData = JSON.parse(value)
                    } catch (e) {
                        capturedData = value
                    }
                },
                getItem: (key) => storage[key] || null,
                removeItem: (key) => delete storage[key],
                clear: () => Object.keys(storage).forEach((k) => delete storage[k]),
            }

            setGlobal('sessionStorage', sessionStorageMock)
            setGlobal('localStorage', sessionStorageMock)
            setGlobal('window', globalThis)
            setGlobal('self', globalThis)
            setGlobal('top', globalThis)
            setGlobal('parent', globalThis)

            setGlobal('document', {
                body: { style: {} },
                head: {},
                cookie: '',
                referrer: 'https://www.novipnoad.net/',
                createElement: function (tag) {
                    if (tag === 'canvas') {
                        return {
                            width: 300,
                            height: 150,
                            style: {},
                            getContext: function (type) {
                                if (type === '2d') {
                                    return {
                                        measureText: (text) => ({ width: text.length * 10 }),
                                        fillText: () => {},
                                        fillRect: () => {},
                                        clearRect: () => {},
                                        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
                                        putImageData: () => {},
                                        font: '',
                                        fillStyle: '',
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
                    return { style: {}, getAttribute: () => null, setAttribute: () => {} }
                },
                getElementById: () => null,
                getElementsByTagName: () => [],
                querySelector: () => null,
                querySelectorAll: () => [],
                addEventListener: () => {},
                removeEventListener: () => {},
            })

            setGlobal('navigator', {
                userAgent:
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
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
                memory: { jsHeapSizeLimit: 2172649472, totalJSHeapSize: 20971520, usedJSHeapSize: 10485760 },
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
                origin: parsedUrl.origin,
            })

            setGlobal('crypto', {
                getRandomValues: (arr) => {
                    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
                    return arr
                },
                subtle: {},
            })
            setGlobal('getComputedStyle', () => ({
                getPropertyValue: () => '',
                display: 'block',
                visibility: 'visible',
            }))
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
            setGlobal('outerWidth', 1920)
            setGlobal('outerHeight', 1080)

            const _origGetProto = Object.getPrototypeOf.bind(Object)
            Object.getPrototypeOf = (obj) => {
                if (obj === null || obj === undefined) return null
                return _origGetProto(obj)
            }

            setGlobal('XMLHttpRequest', function () {
                return {
                    open: () => {},
                    send: () => {},
                    setRequestHeader: () => {},
                    addEventListener: () => {},
                    readyState: 4,
                    status: 200,
                    responseText: '',
                }
            })
            setGlobal('fetch', () =>
                Promise.resolve({ json: () => Promise.resolve({}), text: () => Promise.resolve('') }),
            )

            if (typeof globalThis.atob !== 'function') {
                setGlobal('atob', _atob)
            }
            if (typeof globalThis.btoa !== 'function') {
                setGlobal('btoa', _btoa)
            }
            setGlobal(
                'MutationObserver',
                class {
                    observe() {}
                    disconnect() {}
                },
            )
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
                if (!functionCalled && debug) {
                    $print('[DEBUG] ✗ sessionStorage.setItem 未被調用，函數可能提前退出')
                }
                return capturedData
            }
        }

        async function extractVkeyJS(url, debug = false, maxRetries = 5) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                if (attempt > 1) {
                    const delay = 800
                    if (debug) $print(`[DEBUG] 第 ${attempt} 次嘗試，等待 ${delay}ms...`)
                    await sleep(delay)
                }

                try {
                    const result = await _extractOnce(url, debug)
                    if (result.vkey && result.device) return result

                    if (debug) $print(`[DEBUG] 第 ${attempt} 次嘗試返回 null，準備重試`)
                } catch (err) {
                    if (debug) $print(`[DEBUG] 第 ${attempt} 次嘗試失敗: ${err.message}`)
                }
            }
        }
        async function _extractOnce(url, debug) {
            const player = await $fetch.get(url, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
                    referer: 'https://www.novipnoad.net',
                },
            })
            const $player = cheerio.load(player.data)

            let obfuscatedCode = null
            $player('script').each((i, script) => {
                const content = $player(script).html()
                if (content && content.includes('/*-- 浏览器完整性检查 --*/')) {
                    const match = content.match(/function __\(\) \{[\s\S]*?\n\}/)
                    if (match) obfuscatedCode = match[0]
                }
            })

            if (!obfuscatedCode) {
                throw new Error('無法找到包含瀏覽器完整性檢查的 script 區塊')
            }

            if (debug) {
                $print('[DEBUG] 混淆代碼長度:', obfuscatedCode.length)
            }

            const getCapturedData = setupBrowserEnv(playerUrl, debug)

            try {
                const fn = new Function(obfuscatedCode + '\nif (typeof __ === "function") __()')
                fn()
            } catch (evalErr) {
                if (debug) $print(`[DEBUG] 執行錯誤（嘗試繼續）: ${evalErr.message}`)
            }

            await sleep(200)
            const device = player.data.match(/params\['device'\] = '(\w+)';/)[1]

            return {
                device,
                vkey: getCapturedData(),
            }
        }

        const playerUrl = `https://player.novipnoad.net/v1/?url=${vid}&pkey=${pkey}&ref=${ref}`
        const result = await extractVkeyJS(playerUrl, false, 10)
        const vkey = result.vkey

        // get jsapi
        const phpUrl = `https://player.novipnoad.net/v1/player.php?id=${vid}&device=${result.device}`
        const phpres = await $fetch.get(phpUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
                referer: playerUrl,
            },
        })

        let jsapi = phpres.data.match(/jsapi = '(.*)';/)[1]
        jsapi =
            jsapi +
            '?ckey=' +
            vkey.ckey.toUpperCase() +
            '&ref=' +
            encodeURIComponent(vkey.ref) +
            '&ip=' +
            vkey.ip +
            '&time=' +
            vkey.time

        // get play url
        const jsres = await $fetch.get(jsapi, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
                referer: 'https://www.novipnoad.net',
            },
        })
        let playUrl = jsres.data.match(/decrypt\("(.*)"\)/)[1]
        playUrl = decryptUrl(playUrl)
        playUrl = playUrl.quality[playUrl.defaultQuality].url
        $print(`playUrl: ${playUrl}`)

        return jsonify({ urls: [playUrl], headers: { 'User-Agent': UA } })
    } catch (error) {
        $print(error)
    }
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

function decryptUrl(_0x395610) {
    // jq
    var _0x15159f = 'ce974576'
    var _0x36346e = _0x2b01e7(_0x395610, _0x15159f)
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

const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)'

const CHROME_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// RC4 解密 key 的最後已知值
const DEFAULT_DECRYPT_KEY = 'ce974576'

function sleep(ms) {}

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
        // 直接取卡片真實連結（不同分類路徑不同：/movie/、/anime/、/tv/...）
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

        // RC4 解密 key：優先從 GitHub 取最新（站方會輪換），失敗用預設
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
            const storage = {}
            let capturedData = null

            const sessionStorageMock = {
                setItem: (key, value) => {
                    storage[key] = value
                    if (key === 'vkey') {
                        try {
                            capturedData = JSON.parse(value)
                        } catch (e) {
                            capturedData = value
                        }
                    }
                },
                getItem: (key) => storage[key] || null,
                removeItem: (key) => delete storage[key],
                clear: () => Object.keys(storage).forEach((k) => delete storage[k]),
            }

            // 檢查變體要求 String(sessionStorage) === '[object Storage]'
            const storageObj = {}
            storageObj[Symbol.toStringTag] = 'Storage'
            Object.assign(storageObj, sessionStorageMock)

            setGlobal('sessionStorage', storageObj)
            setGlobal('localStorage', storageObj)

            // 檢查變體要求 MutationObserver.prototype.toString 含 [native code]
            const observeFn = function observe() {}
            const _origFTS = Function.prototype.toString
            try {
                Function.prototype.toString = function () {
                    if (this === observeFn) return 'function observe() { [native code] }'
                    return _origFTS.call(this)
                }
            } catch (e) {}
            function MutationObserverPolyfill() {}
            MutationObserverPolyfill.prototype.observe = observeFn
            MutationObserverPolyfill.prototype.disconnect = function disconnect() {}

            // 檢查變體要求 FileReader/Element/Node 存在
            // 且 Element.prototype.__proto__ === Node.prototype
            function NodePolyfill() {}
            function ElementPolyfill() {}
            ElementPolyfill.prototype = Object.create(NodePolyfill.prototype)
            function FileReaderPolyfill() {}

            setGlobal('MutationObserver', MutationObserverPolyfill)
            setGlobal('Node', NodePolyfill)
            setGlobal('Element', ElementPolyfill)
            setGlobal('FileReader', FileReaderPolyfill)

            setGlobal('window', globalThis)
            setGlobal('self', globalThis)
            // ★ 核心修復：站方邏輯為 if (window.top !== window.self) 才寫入 vkey，
            //   top 必須與 self 是不同物件 ★
            setGlobal('top', {})

            setGlobal('document', {
                body: { style: {} },
                head: {},
                cookie: '',
                referrer: appConfig.site + '/',
                visibilityState: 'visible',
                hidden: false,
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
                                        strokeText: () => {},
                                        fillRect: () => {},
                                        clearRect: () => {},
                                        beginPath: () => {},
                                        arc: () => {},
                                        fill: () => {},
                                        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
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

            return () => capturedData
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
        const result = await extractVkeyJS(playerUrl, false, 4)
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
        console.log(`playUrl: ${playUrl}`)

        return jsonify({
            urls: [playUrl],
            headers: {
                'User-Agent': CHROME_UA,
                Referer: 'https://player.novipnoad.net/',
                Origin: 'https://player.novipnoad.net',
            },
        })
    } catch (error) {
        console.log('getPlayinfo error: ' + error)
        return jsonify({ urls: [] })
    }
}

// 動態取得站方 RC4 key（對齊 plugin 的多源 fallback，含快取）
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

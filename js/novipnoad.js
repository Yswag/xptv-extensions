const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)'

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
    let list = []
    let ignore = ['首页', '剧集']
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    const { data } = await $fetch.get(appConfig.site, {
        headers: {
            'User-Agent': UA,
        },
    })
    if (data.includes('Just a moment...')) {
        $utils.openSafari(appConfig.site, UA)
    }
    const $ = cheerio.load(data)

    let allClass = $('.main-menu .nav-ul-menu a')
    allClass.each((i, e) => {
        const name = $(e).text()
        const href = $(e).attr('href')
        const isIgnore = isIgnoreClassName(name)
        if (isIgnore) return

        list.push({
            name,
            ext: {
                url: href,
            },
        })
    })

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, url } = ext

    if (page > 1) {
        url += `/page/${page}/`
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
        const TWO_DIMEN_ARR_REGEX = /var\s+[a-zA-Z_$][a-zA-Z0-9_$]*=\[(\[[0-9,\[\]]+])];/
        const ONE_DIMEN_ARR_REGEX = /var\s+[a-zA-Z_$][a-zA-Z0-9_$]*=\s*\(([0-9,]+)\];/
        const ARG_A_B_REGEX =
            /var\s+[a-zA-Z_$][a-zA-Z0-9_$]*=(\d+),*[a-zA-Z_$][a-zA-Z0-9_$]*=(\d+);var\s+[a-zA-Z_$][a-zA-Z0-9_$]*='';/
        const ARG_A_REGEX = /var\s+[a-zA-Z_$][a-zA-Z0-9_$]*=(\d+);var\s+[a-zA-Z_$][a-zA-Z0-9_$]*='';/
        const SPLIT_BASE64_REGEX = /[a-zA-Z_$][a-zA-Z0-9_$]*\+='([A-Za-z0-9+/=]+)'\+[a-zA-Z_$][a-zA-Z0-9_$]*;/g

        const V_KEY_JS_PARSERS = [
            /** ---------------- Parser 0 ---------------- */
            function (jsText) {
                const twoDimen = jsText.match(TWO_DIMEN_ARR_REGEX)
                const twoDimenArrStr = twoDimen?.[1]
                if (!twoDimenArrStr) throw new Error('failed: vKeyJs twoDimenArrStr')

                const oneDimen = jsText.match(ONE_DIMEN_ARR_REGEX)
                const oneDimenArrStr = oneDimen?.[1]
                if (!oneDimenArrStr) throw new Error('failed: vKeyJs oneDimenArrStr')

                const dataArrList = JSON.parse(`[${twoDimenArrStr.replace(/,$/, '')}]`)
                const xorKeyList = oneDimenArrStr.split(',').map(Number)

                if (dataArrList.length !== xorKeyList.length)
                    throw new Error('failed: vKeyJs dataArrList.size!=xorKeyList.size')

                return dataArrList
                    .map((dataArr, index) => {
                        const xorKey = xorKeyList[index]
                        return dataArr.map((n) => String.fromCharCode(n ^ xorKey)).join('')
                    })
                    .join('')
            },

            /** ---------------- Parser 1 ---------------- */
            function (jsText) {
                const oneDimen = jsText.match(ONE_DIMEN_ARR_REGEX)
                const oneDimenArrStr = oneDimen?.[1]
                if (!oneDimenArrStr) throw new Error('failed: vKeyJs oneDimenArrStr')

                const dataArr = oneDimenArrStr.split(',').map(Number)

                const argAB = jsText.match(ARG_A_B_REGEX)
                if (!argAB) throw new Error('failed: vKeyJs argAB')

                const xorKey = parseInt(argAB[1])
                const m = parseInt(argAB[2])

                return dataArr.map((n) => String.fromCharCode((n - m) ^ xorKey)).join('')
            },

            /** ---------------- Parser 2 ---------------- */
            function (jsText) {
                const oneDimen = jsText.match(ONE_DIMEN_ARR_REGEX)
                const oneDimenArrStr = oneDimen?.[1]
                if (!oneDimenArrStr) throw new Error('failed: vKeyJs oneDimenArrStr')

                const dataArr = oneDimenArrStr.split(',').map(Number)

                const xorKeyMatch = jsText.match(ARG_A_REGEX)
                const xorKey = xorKeyMatch ? parseInt(xorKeyMatch[2]) : null
                if (!xorKey) throw new Error('failed: vKeyJs xorKey')

                return dataArr.map((n) => String.fromCharCode(n ^ xorKey)).join('')
            },

            /** ---------------- Parser 3 ---------------- */
            function (jsText) {
                const base64Matches = [...jsText.matchAll(SPLIT_BASE64_REGEX)]
                const base64Str = base64Matches.map((m) => m[1]).join('')

                if (!base64Str) throw new Error('failed: SPLIT_BASE64_REGEX')

                // const decoded = Buffer.from(base64Str, 'base64').toString('utf8')
                const decoded = base64decode(base64Str)
                const dataArr = decoded.split(',')

                const part = jsText.split(".split(',')")[1].split('for')[0]
                const varsMatch = part.match(/var\s+([a-zA-Z_$][\w$]*)\s*=\s*([^;]+);/g) || []

                let varsMap = {}
                varsMatch.forEach((v) => {
                    const m = v.match(/var\s+([a-zA-Z_$][\w$]*)\s*=\s*([^;]+);/)
                    if (m) {
                        const name = m[1]
                        const value = eval(m[2])
                        varsMap[name] = value
                    }
                })

                const varNames = Object.keys(varsMap)
                const arg0 = varsMap[varNames[2]]
                const arg1 = varsMap[varNames[1]]
                const arg2 = varsMap[varNames[3]]

                if (arg0 && arg1 && arg2) {
                    let decoded = ''
                    for (var i = 0; i < dataArr.length; i++) {
                        var _$3b14 = parseInt(dataArr[i])
                        var _$5860 = (_$3b14 - arg0) ^ arg1 ^ (i * arg2) % 256
                        decoded += String.fromCharCode(_$5860)
                    }
                    return decoded
                }
            },
        ]

        function extractVkeyJS(bodyHtml) {
            const start = '/*-- 浏览器完整性检查 --*/'
            const end = '</script>'

            const after = bodyHtml.split(start)[1] || ''
            return after.split(end)[0] || ''
        }

        function parseVKeyJs(bodyHtml) {
            for (const parser of V_KEY_JS_PARSERS) {
                try {
                    return parser(bodyHtml)
                } catch (e) {}
            }
        }

        const playerUrl = `https://player.novipnoad.net/v1/?url=${vid}&pkey=${pkey}&ref=${ref}`
        const player = await $fetch.get(playerUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
                referer: 'https://www.novipnoad.net',
            },
        })

        const device = player.data.match(/params\['device'\] = '(\w+)';/)[1]

        const fnCode = extractVkeyJS(player.data)
        const parsed = parseVKeyJs(fnCode)

        const decodedStr = parsed.match(/setItem\('vkey','(.+?)'\);/)[1]
        const vkey = JSON.parse(decodedStr)

        // get jsapi
        const phpUrl = `https://player.novipnoad.net/v1/player.php?id=${vid}&device=${device}`
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

        return jsonify({ urls: [playUrl] })
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
            _0x3bf069.charCodeAt(b) ^ _0x300ace[(_0x300ace[_0x1d31f3] + _0x300ace[_0x18815b]) % 256]
        )
    }
    return _0xe5da02
}

function _atob(b64) {
    var chars = {
        ascii: function () {
            return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
        },
        indices: function () {
            if (!this.cache) {
                this.cache = {}
                var ascii = chars.ascii()

                for (var c = 0; c < ascii.length; c++) {
                    var chr = ascii[c]
                    this.cache[chr] = c
                }
            }
            return this.cache
        },
    }
    var indices = chars.indices(),
        pos = b64.indexOf('='),
        padded = pos > -1,
        len = padded ? pos : b64.length,
        i = -1,
        data = ''

    while (i < len) {
        var code = (indices[b64[++i]] << 18) | (indices[b64[++i]] << 12) | (indices[b64[++i]] << 6) | indices[b64[++i]]
        if (code !== 0) {
            data += String.fromCharCode((code >>> 16) & 255, (code >>> 8) & 255, code & 255)
        }
    }

    if (padded) {
        data = data.slice(0, pos - b64.length)
    }

    return data
}

function base64decode(str) {
    let base64DecodeChars = new Array(
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        62,
        -1,
        -1,
        -1,
        63,
        52,
        53,
        54,
        55,
        56,
        57,
        58,
        59,
        60,
        61,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24,
        25,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        26,
        27,
        28,
        29,
        30,
        31,
        32,
        33,
        34,
        35,
        36,
        37,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        46,
        47,
        48,
        49,
        50,
        51,
        -1,
        -1,
        -1,
        -1,
        -1
    )
    let c1, c2, c3, c4
    let i, len, out
    len = str.length
    i = 0
    out = ''
    while (i < len) {
        do {
            c1 = base64DecodeChars[str.charCodeAt(i++) & 0xff]
        } while (i < len && c1 == -1)
        if (c1 == -1) break
        do {
            c2 = base64DecodeChars[str.charCodeAt(i++) & 0xff]
        } while (i < len && c2 == -1)
        if (c2 == -1) break
        out += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4))
        do {
            c3 = str.charCodeAt(i++) & 0xff
            if (c3 == 61) return out
            c3 = base64DecodeChars[c3]
        } while (i < len && c3 == -1)
        if (c3 == -1) break
        out += String.fromCharCode(((c2 & 0xf) << 4) | ((c3 & 0x3c) >> 2))
        do {
            c4 = str.charCodeAt(i++) & 0xff
            if (c4 == 61) return out
            c4 = base64DecodeChars[c4]
        } while (i < len && c4 == -1)
        if (c4 == -1) break
        out += String.fromCharCode(((c3 & 0x03) << 6) | c4)
    }
    return out
}

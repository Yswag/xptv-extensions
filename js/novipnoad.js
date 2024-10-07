const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
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

    // get vkey
    const playerUrl = `https://player.novipnoad.net/v1/?url=${vid}&pkey=${pkey}&ref=${ref}`
    const player = await $fetch.get(playerUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
            referer: 'https://www.novipnoad.net',
        },
    })
    const data = player.data.match(/decodeURIComponent\(escape\(r\)\)\}(.*)\)/)[1].replace(/["\(\)]/g, '')
    const device = player.data.match(/params\['device'\] = '(\w+)';/)[1]
    const config = data.split(',')
    const vkey = JSON.parse(
        getVkey(...config)
            .match(/JSON.stringify\((.*)\)\);/)[1]
            .replace(/'/g, '"')
            .replace(/(ckey|ref|ip|time):/g, '"$1":')
    )

    // get jsapi
    const phpUrl = `https://player.novipnoad.net/v1/player.php?id=${vid}&device=${device}`
    const phpres = await $fetch.get(phpUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
            referer: playerUrl,
        },
    })
    let jsapi = phpres.data.match(/jsapi = '(.*)';/)[1]
    jsapi = jsapi + '?ckey=' + vkey.ckey.toUpperCase() + '&ref=' + encodeURIComponent(vkey.ref) + '&ip=' + vkey.ip + '&time=' + vkey.time

    // get play url
    const jsres = await $fetch.get(jsapi, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
            referer: 'https://www.novipnoad.net',
        },
    })
    let playUrl = jsres.data.match(/decrypt\("(.*)"\)/)[1]
    playUrl = decryptUrl(playUrl)
    playUrl = playUrl.quality[playUrl.defaultQuality].url

    return jsonify({ urls: [playUrl] })
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

function getVkey(h, u, n, t, e, r) {
    r = ''
    for (var i = 0, len = h.length; i < len; i++) {
        var s = ''
        while (h[i] !== n[e]) {
            s += h[i]
            i++
        }
        for (var j = 0; j < n.length; j++) s = s.replace(new RegExp(n[j], 'g'), j)
        r += String.fromCharCode(_0xe31c(s, e, 10) - t)
    }
    return decodeURIComponent(escape(r))
}

function _0xe31c(d, e, f) {
    var g = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/'.split('')
    var h = g.slice(0, e)
    var i = g.slice(0, f)
    var j = d
        .split('')
        .reverse()
        .reduce(function (a, b, c) {
            if (h.indexOf(b) !== -1) return (a += h.indexOf(b) * Math.pow(e, c))
        }, 0)
    var k = ''
    while (j > 0) {
        k = i[j % f] + k
        j = (j - (j % f)) / f
    }
    return k || 0
}

function decryptUrl(_0x395610) {
    var _0x15159f = '5f3651b7'
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
        _0xe5da02 += String.fromCharCode(_0x3bf069.charCodeAt(b) ^ _0x300ace[(_0x300ace[_0x1d31f3] + _0x300ace[_0x18815b]) % 256])
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

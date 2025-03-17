const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '麻豆社',
    site: 'https://hongkongdollvideo.com',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    let list = []
    let ignore = ['亚洲成人视频']
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    const { data } = await $fetch.get(appConfig.site, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)

    let allClass = $('.scrollbar a')
    allClass.each((_, e) => {
        const name = $(e).text()
        const href = $(e).attr('href')
        const isIgnore = isIgnoreClassName(name)
        if (isIgnore) return

        list.push({
            name,
            ext: {
                url: encodeURI(href),
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
        url = url + page + '.html'
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.video-item').each((_, element) => {
        const href = $(element).find('.thumb a').attr('href')
        const title = $(element).find('.thumb a').attr('title')
        const cover = $(element).find('.thumb img').attr('data-src')
        const subTitle = $(element).find('.duratio').text().trim()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: href,
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
    const param = $('script:contains(__PAGE_PARAMS__)').text().split('var __PAGE_PARAMS__="')[1].split('"')[0]

    let playUrl = decode(param)

    tracks.push({
        name: '播放',
        pan: '',
        ext: {
            url: playUrl,
        },
    })

    function decode(_0x558b38) {
        let key = _0x558b38.slice(-32)
        let encrypedConf = _0x558b38.substring(0, _0x558b38.length - 32)
        let pageConfig = JSON.parse(xorDec(encrypedConf, key))

        let _0x1c9184 = pageConfig.player.param.id,
            _0x240fda = pageConfig.player.param.embedURL.substring(pageConfig.player.param.embedURL.lastIndexOf('/') + 1),
            _0x109b80 = _0x240fda.slice(-10),
            _0x2abb5a = base64Encode((_0x1c9184.toString() + '-' + _0x109b80.toString()).split('').reverse().join('')).replaceAll('=', ''),
            _0x5bf54d = strDecode(pageConfig.player.param.arg, _0x2abb5a)

        return _0x5bf54d
    }
    function xorDec(_0x3b697f, _0x37f8e7) {
        let _0x2bec78 = ''
        const _0x1f8156 = _0x37f8e7.length
        for (let _0x4b08c8 = 0; _0x4b08c8 < _0x3b697f.length; _0x4b08c8 += 2) {
            const _0x312f0e = _0x3b697f.substr(_0x4b08c8, 2),
                _0x33eb88 = String.fromCharCode(parseInt(_0x312f0e, 16)),
                _0x323ef5 = _0x37f8e7[(_0x4b08c8 / 2) % _0x1f8156]
            _0x2bec78 += String.fromCharCode(_0x33eb88.charCodeAt(0) ^ _0x323ef5.charCodeAt(0))
        }
        return _0x2bec78
    }
    function strDecode(_0x2cc089, _0x20ae1e) {
        _0x2cc089 = base64Decode(_0x2cc089)
        let _0x81a254 = _0x20ae1e.length,
            _0x24927e = ''
        for (let _0x69e784 = 0; _0x69e784 < _0x2cc089.length; _0x69e784++) {
            let _0x33fd0c = _0x69e784 % _0x81a254
            _0x24927e += String.fromCharCode(_0x2cc089.charCodeAt(_0x69e784) ^ _0x20ae1e.charCodeAt(_0x33fd0c))
        }
        return decodeURIComponent(base64Decode(_0x24927e))
    }
    function base64Encode(text) {
        return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text))
    }
    function base64Decode(text) {
        return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(text))
    }

    // const playConfig = JSON.parse(script.match(/CONFIG__=(.*?);/)[1])

    // // let obj = data.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]
    // // let eurl = JSON.parse(obj).embedUrl
    // if (playConfig) {
    //     let video_id = url.match(/\/video\/([0-9a-f]+)\.html/)[1]
    //     let embedUrl = playConfig.embedURL
    //     let video_arg = embedUrl.match(/.*?\/([a-f0-9]{20,})$/)[1]
    //     let timestamp = video_arg.substr(-10)
    //     let key = base64Encode((video_id + '-' + timestamp.toString()).split('').reverse().join('')).replaceAll('=', '')

    //     let videoSrc = strDecode(playConfig.arg, key)
    //     tracks.push({
    //         name: '播放',
    //         pan: '',
    //         ext: {
    //             url: videoSrc,
    //         },
    //     })

    //     function strDecode(string, key) {
    //         string = base64Decode(string)
    //         let len = key.length
    //         let code = ''
    //         for (let i = 0; i < string.length; i++) {
    //             let k = i % len
    //             code += String.fromCharCode(string.charCodeAt(i) ^ key.charCodeAt(k))
    //         }
    //         return decodeURIComponent(base64Decode(code))
    //     }
    // function base64Encode(text) {
    //     return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text))
    // }
    // function base64Decode(text) {
    //     return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(text))
    // }
    // }

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
    const url = ext.url

    return jsonify({ urls: [url] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/search/${text}/${page}.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.video-item').each((_, element) => {
        const href = $(element).find('.thumb a').attr('href')
        const title = $(element).find('.thumb a').attr('title')
        const cover = $(element).find('.thumb img').attr('data-src')
        const subTitle = $(element).find('.duratio').text().trim()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

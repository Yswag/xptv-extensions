const CryptoJS = createCryptoJS()
const cheerio = createCheerio()

const headers = {
    'User-Agent':
        'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
}

let appConfig = {
    ver: 20260902,
    title: '燒火電影',
    site: 'https://shdy2.com',
    tabs: [
        {
            name: '電影',
            ext: {
                id: 1,
            },
        },
        {
            name: '電視劇',
            ext: {
                id: 2,
            },
        },
        {
            name: '動漫',
            ext: {
                id: 4,
            },
        },
    ],
}

async function getConfig() {
    return jsonify(appConfig)
}

function toHref(href) {
    if (!href) return href
    if (/^https?:\/\//.test(href)) return href
    return `${appConfig.site}${href.startsWith('/') ? '' : '/'}${href}`
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { id, page = 1 } = ext
    if (id == null) return jsonify({ list: cards })
    const url = `${appConfig.site}/list/${id}-${page}.html`

    const { data } = await $fetch.get(url, {
        headers: headers,
    })
    if (!data) return jsonify({ list: cards })

    const $ = cheerio.load(data)
    $('ul.v_list div.v_img').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const title = $(element).find('a').attr('title')
        const cover = $(element).find('img').attr('data-original') || $(element).find('img').attr('src')
        const subTitle = $(element).find('.v_note').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: toHref(href),
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let list = []
    let url = ext.url
    if (!url) return jsonify({ list })

    const { data } = await $fetch.get(url, {
        headers: headers,
    })
    if (!data) return jsonify({ list })

    const $ = cheerio.load(data)

    let play_from = []
    $('ul.from_list li').each((_, e) => {
        play_from.push($(e).text().trim())
    })

    $('#play_link li').each((i, e) => {
        const from = play_from[i] || play_from[0] || '線路'
        const eps = $(e).find('a')
        let temp = []
        eps.each((_, e) => {
            const name = $(e).text()
            const href = $(e).attr('href')
            temp.push({
                name: `${name}`,
                pan: '',
                ext: {
                    url: toHref(href),
                },
            })
        })
        const num = (s) => {
            const m = String(s).match(/\d+/)
            return m ? parseInt(m[0], 10) : 0
        }
        temp.sort((a, b) => num(a.name) - num(b.name))
        list.push({
            title: from,
            tracks: temp,
        })
    })

    return jsonify({
        list: list,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    try {
        const url = ext.url
        if (!url) return jsonify({ urls: [] })

        const { data } = await $fetch.get(url, {
            headers: headers,
        })
        if (!data) return jsonify({ urls: [] })

        const $ = cheerio.load(data)
        let iframeSrc = $('iframe').attr('src')
        if (!iframeSrc) return jsonify({ urls: [] })
        iframeSrc = toHref(iframeSrc)

        const cipher = (iframeSrc.match(/[?&]url=([0-9A-Fa-f]+)/) || [])[1]
        if (!cipher) return jsonify({ urls: [] })

        const apiOrigin = (iframeSrc.match(/^(https?:\/\/[^\/]+)/) || [])[1]
        if (!apiOrigin) return jsonify({ urls: [] })

        const pResp = await $fetch.get(iframeSrc, {
            headers: headers,
        })
        if (!pResp || !pResp.data) return jsonify({ urls: [] })

        const $p = cheerio.load(pResp.data)
        const script = $p('script')
            .map((_, e) => $(e).text())
            .get()
            .join('\n')
        const bm = script.match(/__HHJX_BOOTSTRAP__\s*=\s*(\{[^;]*\})/)
        if (!bm) return jsonify({ urls: [] })
        let boot = {}
        try {
            boot = JSON.parse(bm[1])
        } catch (e) {
            boot = {}
        }

        const bootUrl = boot.url || cipher
        const bootT = boot.t
        const bootKey = boot.key
        if (!bootKey || bootT == null) return jsonify({ urls: [] })

        const parseBody = JSON.stringify({
            url: bootUrl,
            t: bootT,
            key: bootKey,
            client_fallback: false,
        })

        const presp = await $fetch.post(apiOrigin + '/api/parse', parseBody, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': headers['User-Agent'],
                Referer: iframeSrc,
            },
        })
        let res = {}
        try {
            res = JSON.parse(presp.data)
        } catch (e) {
            res = {}
        }

        let playUrl = res.url
        if (!playUrl) return jsonify({ urls: [] })
        if (playUrl.startsWith('http://')) playUrl = playUrl.replace('http://', 'https://')

        return jsonify({
            urls: [playUrl],
            headers: [{ 'User-Agent': headers['User-Agent'], Referer: iframeSrc }],
        })
    } catch (e) {}

    return jsonify({ urls: [] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []
    try {
        const keyword = (ext.text != null ? ext.text : ext.wd) || ''
        if (!keyword) return jsonify({ list: cards })

        const text = encodeURIComponent(keyword)
        const url = `${appConfig.site}/s----------.html?wd=${text}`

        const { data } = await $fetch.get(url, {
            headers: headers,
        })
        if (!data) return jsonify({ list: cards })

        const $ = cheerio.load(data)
        $('ul.v_list div.v_img').each((_, element) => {
            const href = $(element).find('a').attr('href')
            const title = $(element).find('a').attr('title')
            const cover = $(element).find('img').attr('data-original') || $(element).find('img').attr('src')
            const subTitle = $(element).find('.v_note').text()
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: subTitle,
                ext: {
                    url: toHref(href),
                },
            })
        })
    } catch (e) {}

    return jsonify({ list: cards })
}

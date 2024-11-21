const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA =
    'Mozilla/5.0 (Linux; Android 11; M2007J3SC Build/RKQ1.200826.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045714 Mobile Safari/537.36'

let appConfig = {
    ver: 1,
    title: 'hdmoli',
    site: 'https://hdmoli.pro',
    tabs: [
        {
            name: '电影',
            ext: {
                id: 1,
            },
        },
        {
            name: '剧集',
            ext: {
                id: 2,
            },
        },
        {
            name: '动画',
            ext: {
                id: 41,
            },
        },
    ],
}

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, id } = ext

    let url = `${appConfig.site}/mlist/index${id}-${page}.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    let videolist = $('.myui-vodlist > li')
    videolist.each((_, element) => {
        const a = $(element).find('.myui-vodlist__thumb')
        const href = a.attr('href')
        const title = a.attr('title')
        const cover = a.attr('data-original')
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: '',
            ext: {
                href: href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let groups = []
    let href = ext.href
    let url = appConfig.site + href

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    const playlist = $('ul.myui-content__list')
    playlist.each((index, e) => {
        const eps = $(e).find('li')
        let group = {
            title: `線路${index + 1}`,
            tracks: [],
        }
        eps.each((_, e) => {
            const name = $(e).find('a').text()
            const href = $(e).find('a').attr('href')
            group.tracks.push({
                name: name,
                pan: '',
                ext: {
                    url: href,
                },
            })
        })
        groups.push(group)
    })

    const panlist = $('.stui-vodlist__text.downlist p')
    const pangroup = {
        title: '',
        tracks: [],
    }
    panlist.each((_, e) => {
        const name = $(e).find('b').text().replace('：', '')
        const link = $(e).find('a').attr('href')
        pangroup.tracks.push({
            name: name,
            pan: link,
        })
    })
    groups.push(pangroup)

    return jsonify({
        list: groups,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = appConfig.site + ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    const encUrl = $('script:contains(var now=)').text().split('var now="')[1].split('";')[0].split('|')[0]
    if (encUrl.endsWith('.mp4')) {
        return jsonify({
            urls: ['https://v.damoli.pro/v/' + encUrl],
            headers: [
                {
                    'User-Agent': UA,
                    Referer: 'https://hdmoli.pro/',
                },
            ],
        })
    }

    let parseUrl = appConfig.site + '/api/webvideo_ty.php?url=' + encUrl + '&type=json'
    if (encUrl.length === 32) {
        parseUrl = appConfig.site + '/api/webvideo.php?url=' + encUrl + '&type=json'
    }
    const parseRes = await $fetch.get(parseUrl, {
        headers: {
            'User-Agent': UA,
        },
    })
    const encData = argsify(parseRes.data).url
    const realUrl = decryptUrl(encData)

    return jsonify({
        urls: [realUrl],
    })
}

function decryptUrl(encData) {
    const b64Data = base64Decode(encData)
    let url = ''
    for (let i = 0; i < b64Data.length; i++) {
        let idx = i % 8
        url += String.fromCharCode(b64Data.charCodeAt(i) ^ 'ItLdg666'.charCodeAt(idx))
    }
    return base64Decode(url)
}

function base64Decode(text) {
    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(text))
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/search.php?page=${page}&searchword=${text}&searchtype=`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)

    $('.myui-vodlist__thumb').each((_, element) => {
        const a = $(element)
        const href = a.attr('href')
        const title = a.attr('title')
        const cover = a.attr('data-original')
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: '',
            ext: {
                href: href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

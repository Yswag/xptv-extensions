const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: 'xhamster',
    site: 'https://zh.xhamster.com',
    tabs: [
        {
            name: 'newest',
            ext: {
                href: '/newest',
            },
            ui: 1,
        },
        {
            name: 'weekly best',
            ext: {
                href: '/best/weekly',
            },
            ui: 1,
        },
        {
            name: '4k',
            ext: {
                href: '/4k',
            },
            ui: 1,
        },
    ],
}

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, href } = ext

    let url = appConfig.site + href
    if (page > 1) {
        url = url + `/${page}`
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.thumb-list__item').each((_, element) => {
        const href = $(element).find('a.video-thumb__image-container').attr('href')
        const title = $(element).find('.thumb-image-container__image').attr('alt')
        const cover = $(element).find('.thumb-image-container__image').attr('src')
        const subTitle = $(element).find('.video-thumb-views').text().trim() || ''
        const duration = $(element).find('.thumb-image-container__duration').text().trim() || ''
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            vod_duration: duration,
            vod_pubdate: '',
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
    const script = $('#initials-script').text()
    let window = {}
    eval(script)
    const videos = window.initials.xplayerSettings.sources.standard.h264
    videos.forEach((e) => {
        tracks.push({
            name: e.label,
            pan: '',
            ext: {
                url: e.url,
                referer: url,
            },
        })
    })

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
    const headers = {
        'User-Agent': UA,
        Referer: ext.referer + '/',
    }

    return jsonify({ urls: [url], headers: [headers] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/search/${text}?page=${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.thumb-list__item').each((_, element) => {
        const href = $(element).find('a.video-thumb__image-container').attr('href')
        const title = $(element).find('.thumb-image-container__image').attr('alt')
        const cover = $(element).find('.thumb-image-container__image').attr('src')
        const subTitle = $(element).find('.video-thumb-views').text().trim() || ''
        const duration = $(element).find('.thumb-image-container__duration').text().trim() || ''
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            vod_duration: duration,
            vod_pubdate: '',
            ext: {
                url: href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

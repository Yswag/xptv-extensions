const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: 'avtoday',
    site: 'https://avtoday.io',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    let list = []
    let ignore = []
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    const { data } = await $fetch.get(appConfig.site + '/catalog', {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)

    let allClass = $('.swiper-wrapper > .swiper-slide')
    allClass.each((_, e) => {
        const name = $(e).find('.btn-categories__title').text()
        const info = $(e).find('.btn-categories__info').text().split(' ')[0]
        const href = $(e).find('a.btn-categories').attr('href')
        const isIgnore = isIgnoreClassName(name)
        if (isIgnore) return

        list.push({
            name: `${name} (${info})`,
            ext: {
                url: href,
            },
            ui: 1,
        })
    })

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, url } = ext

    if (page > 1) {
        url = url + `?page=${page}`
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.thumbnail').each((_, element) => {
        const href = $(element).find('.video-title a').attr('href')
        const title = $(element).find('.video-title a').text()
        const cover = $(element).find('.video-cover').attr('src').replace('.', appConfig.site)
        const subTitle = $(element).find('.video-tag').text().trim() || ''
        const duration = $(element).find('.video-duration').text().trim() || ''
        const pubdate = $(element).find('.video-date').text().trim() || ''
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            vod_duration: duration,
            vod_pubdate: pubdate,
            ext: {
                url: appConfig.site + '/' + href,
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
    const playerUrl = $('.video-frame').attr('src').replace('.', appConfig.site)

    if (playerUrl) {
        const playerRes = await $fetch.get(playerUrl, {
            headers: {
                'User-Agent': UA,
                Referer: url,
            },
        })

        const m3u8Url = playerRes.data.match(/var m3u8_url = '(.*?)';/)[1]
        tracks.push({
            name: '播放',
            pan: '',
            ext: {
                url: m3u8Url,
            },
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
    const url = ext.url
    const headers = {
        'User-Agent': UA,
        Referer: appConfig.site + '/',
    }

    return jsonify({ urls: [url], headers: [headers] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/search?s=${text}&page=${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.thumbnail').each((_, element) => {
        const href = $(element).find('.video-title a').attr('href')
        const title = $(element).find('.video-title a').text()
        const cover = $(element).find('.video-cover').attr('src').replace('.', appConfig.site)
        const subTitle = $(element).find('.video-tag').text().trim() || ''
        const duration = $(element).find('.video-duration').text().trim() || ''
        const pubdate = $(element).find('.video-date').text().trim() || ''
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            vod_duration: duration,
            vod_pubdate: pubdate,
            ext: {
                url: appConfig.site + '/' + href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

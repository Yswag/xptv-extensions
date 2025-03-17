const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'

let appConfig = {
    ver: 20250317,
    title: 'kbjfan',
    site: 'https://www.kbjfan.com',
    tabs: [
        {
            name: 'Korean BJ Dance',
            ext: {
                typeurl: 'koreanbjdance',
            },
            ui: 1,
        },
        {
            name: 'Korean BJ Nude',
            ext: {
                typeurl: 'koreanbjnude',
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
    let { page = 1, typeurl } = ext
    let url = `${appConfig.site}/${typeurl}`

    if (page > 1) {
        url += `/page/${page}`
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.posts-item').each((_, element) => {
        const href = $(element).find('.item-heading a').attr('href')
        const title = $(element).find('.item-heading a').text()
        const cover = $(element).find('.item-thumbnail img').attr('data-src')
        const pubdate = $(element).find('.meta-author span').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_pubdate: pubdate,
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
    let playlist = $('.dplayer-featured a')

    if (playlist.length) {
        playlist.each((_, element) => {
            let name = $(element).text().trim()
            let url = $(element).attr('video-url')

            tracks.push({
                name: name,
                pan: '',
                ext: {
                    url: url,
                },
            })
        })
    } else {
        let playUrl = $('#posts-pay .new-dplayer').attr('video-url')

        tracks.push({
            name: '播放',
            pan: '',
            ext: {
                url: playUrl,
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

    return jsonify({ urls: [url] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/?s=${text}`

    if (page > 1) {
        url = `${appConfig.site}/page/${page}/?s=${text}`
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.posts-item').each((_, element) => {
        const href = $(element).find('.item-heading a').attr('href')
        const title = $(element).find('.item-heading a').text()
        const cover = $(element).find('.item-thumbnail img').attr('data-src')
        const pubdate = $(element).find('.meta-author span').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_pubdate: pubdate,
            ext: {
                url: href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: 'anfuns',
    site: 'https://www.anfuns.org',
    tabs: [
        {
            name: '最近更新',
            ext: {
                id: 0,
            },
        },
        {
            name: '新旧番剧',
            ext: {
                id: 1,
            },
        },
        {
            name: '蓝光无修',
            ext: {
                id: 2,
            },
        },
        {
            name: '动漫剧场',
            ext: {
                id: 3,
            },
        },
        {
            name: '欧美动漫',
            ext: {
                id: 4,
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
    let { id, page = 1 } = ext

    let url = `${appConfig.site}/type/${id}-${page}.html`
    if (id === 0) url = `${appConfig.site}/map.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.hl-list-item').each((_, element) => {
        const vodUrl = $(element).find('.hl-item-thumb').attr('href') || $(element).find('.hl-item-wrap').attr('href')
        const vodPic = $(element).find('.hl-item-thumb').attr('data-original')
        const vodName = $(element).find('.hl-item-title').text()
        const vodDiJiJi = $(element).find('.remarks').text() || $(element).find('.hl-item-content .hl-text-subs').text().replace('/', '')
        cards.push({
            vod_id: vodUrl,
            vod_name: vodName,
            vod_pic: vodPic,
            vod_remarks: vodDiJiJi.trim(),
            ext: {
                url: `${appConfig.site}${vodUrl}`,
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

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    let from = []
    $('.hl-plays-from a').each((i, e) => {
        let name = $(e).text().trim()
        from.push(name)
    })

    $('ul.hl-plays-list').each((i, e) => {
        const play_from = from[i]
        let videos = $(e).find('li a')
        let tracks = []
        videos.each((i, e) => {
            const name = $(e).text()
            const href = $(e).attr('href')
            tracks.push({
                name: name,
                pan: '',
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        })
        list.push({
            title: play_from,
            tracks,
        })
    })

    return jsonify({
        list: list,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    const config = JSON.parse($('script:contains(player_)').html().replace('var player_aaaa=', ''))
    const artPlayer = appConfig.site + '/vapi/AIRA/art.php?url=' + config.url
    const { data: artRes } = await $fetch.get(artPlayer, {
        headers: {
            'User-Agent': UA,
            Referer: url,
        },
    })

    if (artRes) {
        const $2 = cheerio.load(artRes)
        const playUrl = $2('script:contains(var Config)')
            .html()
            .match(/url: '(.*)'/)[1]
        return jsonify({ urls: [playUrl] })
    }

    return jsonify({ urls: [] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/search/page/${page}/wd/${text}.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('li.hl-list-item').each((_, element) => {
        const vodUrl = $(element).find('a.hl-item-thumb').attr('href')
        const vodPic = $(element).find('a.hl-item-thumb').attr('data-original')
        const vodName = $(element).find('a.hl-item-thumb').attr('title')
        const vodDiJiJi = $(element).find('span.remarks').text()
        cards.push({
            vod_id: vodUrl,
            vod_name: vodName,
            vod_pic: vodPic,
            vod_remarks: vodDiJiJi.trim(),
            ext: {
                url: `${appConfig.site}${vodUrl}`,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

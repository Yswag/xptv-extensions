// 來自群友:夢
const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'

let appConfig = {
    ver: 1,
    title: 'HOHOJ',
    site: 'https://hohoj.tv',
    tabs: [
        {
            name: '全部',
            ext: {
                type: 'all',
            },
            ui: 1,
        },
        {
            name: '欧美',
            ext: {
                type: 'europe',
            },
            ui: 1,
        },
        {
            name: '中字',
            ext: {
                type: 'chinese',
            },
            ui: 1,
        },
        {
            name: '无码',
            ext: {
                type: 'uncensored',
            },
            ui: 1,
        },
        {
            name: '有码',
            ext: {
                type: 'censored',
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
    let { type, page = 1 } = ext
    let curl = `${appConfig.site}/search?type=${type}&p=${page}&order=popular`

    const { data } = await $fetch.get(curl, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.video-item.col-lg-3.col-md-3.col-sm-6.col-6.mt-4').each((_, element) => {
        const videoid = $(element)
            .find('a')
            .attr('href')
            .match(/id=(\d+)/)[1]
        const title = $(element).find('.video-item-title.mt-1').text()
        const cover = $(element).find('img').attr('src')
        const remarks = $(element).find('.video-item-badge').text()
        cards.push({
            vod_id: videoid,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: remarks,
            ext: {
                id: videoid,
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
    let url = `${appConfig.site}/embed?id=${ext.id}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    $('video#my-video').each((_, element) => {
        const videourl = $(element).attr('src')
        tracks.push({
            name: '播放',
            ext: {
                url: videourl,
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
    const playUrl = ext.url

    return jsonify({ urls: [playUrl] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []
    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/search?text=${text}&p=${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.video-item.col-lg-3.col-md-3.col-sm-6.col-6.mt-4').each((_, element) => {
        const videoid = $(element)
            .find('a')
            .attr('href')
            .match(/id=(\d+)/)[1]
        const title = $(element).find('.video-item-title.mt-1').text()
        const cover = $(element).find('img').attr('src')
        const remarks = $(element).find('.video-item-badge').text()
        cards.push({
            vod_id: videoid,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: remarks,
            ext: {
                id: videoid,
            },
        })
    })
    return jsonify({
        list: cards,
    })
}

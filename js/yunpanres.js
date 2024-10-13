const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const appConfig = {
    ver: 1,
    title: '云盘资源网',
    site: 'https://res.yunpan.win',
    tabs: [
        {
            name: '阿里',
            ext: {
                id: 1,
            },
        },
        {
            name: '夸克',
            ext: {
                id: 2,
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

    const url = appConfig.site + `/?PageIndex=${page}&PageSize=50&Keyword=&YunPanSourceType=${id}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    const videos = $('.col')
    videos.each((_, e) => {
        const action = $(e).find('.card-link').eq(1).attr('onclick')
        const panUrl = action.match(/open\(\'(.*)\'\)/)[1]

        const title = $(e).find('h5.card-title').text()
        const panType = $(e).find('h5.card-title span').text()
        const name = title.replace(panType, '')

        const cover = $(e).find('img').attr('src')
        cards.push({
            vod_id: panUrl,
            vod_name: name,
            vod_pic: `${appConfig.site}${cover}`,
            vod_remarks: '',
            ext: {
                name,
                url: panUrl,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let { url, name } = ext

    return jsonify({
        list: [
            {
                title: '默认分组',
                tracks: [
                    {
                        name,
                        pan: url,
                    },
                ],
            },
        ],
    })
}

async function getPlayinfo(ext) {
    return jsonify({ urls: [] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/?PageIndex=${page}&PageSize=50&Keyword=${text}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    const videos = $('.col')
    videos.each((_, e) => {
        const action = $(e).find('.card-link').eq(1).attr('onclick')
        const panUrl = action.match(/open\(\'(.*)\'\)/)[1]

        const title = $(e).find('h5.card-title').text()
        const panType = $(e).find('h5.card-title span').text()
        const name = title.replace(panType, '')

        const cover = $(e).find('img').attr('src')
        cards.push({
            vod_id: panUrl,
            vod_name: name,
            vod_pic: `${appConfig.site}${cover}`,
            vod_remarks: panType,
            ext: {
                name,
                url: panUrl,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

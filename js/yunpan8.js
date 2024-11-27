const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const appConfig = {
    ver: 1,
    title: '云盘吧',
    site: 'https://yunpan8.cc',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    let url = appConfig.site + '/tags'
    let tabs = []
    let ignore = ['求助', '公告']
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)
    const script = $('#flarum-json-payload').text()
    const json = argsify(script)
    json.apiDocument.data.forEach((e) => {
        const name = e.attributes.name
        if (isIgnoreClassName(name)) {
            return
        }
        const id = e.attributes.slug
        tabs.push({
            name,
            ext: {
                id,
            },
        })
    })

    return tabs
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, id } = ext

    const offset = 20 * (page - 1)
    const url = `${appConfig.site}/api/discussions?include=user%2ClastPostedUser%2Ctags%2Ctags.parent%2CfirstPost&filter%5Btag%5D=${id}&sort&page%5Boffset%5D=${offset}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const json = argsify(data)
    const videos = json.data
    videos.forEach((e) => {
        const title = e.attributes.title
        const id = e.attributes.slug
        const createdAt = e.attributes.createdAt.split('+')[0].replace('T', ' ')

        cards.push({
            vod_id: id,
            vod_name: title,
            vod_pic: '',
            vod_pubdate: createdAt,
            ext: {
                id,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let id = ext.id
    let tracks = []

    const url = `${appConfig.site}/d/${id}`
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)
    const html = $('noscript#flarum-content').text()
    const $2 = cheerio.load(html)
    const urls = $2('a')
    urls.each((_, e) => {
        const panShareUrl = $(e).attr('href')
        const name = $(e).prev('strong').text().replace('：', '')
        tracks.push({
            name,
            pan: panShareUrl,
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
    return jsonify({ urls: [] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    // 搜尋好像壞了
    // let url = `${appConfig.site}/?PageIndex=${page}&PageSize=50&Keyword=${text}`

    // const { data } = await $fetch.get(url, {
    //     headers: {
    //         'User-Agent': UA,
    //     },
    // })

    // const $ = cheerio.load(data)

    // const videos = $('.col')
    // videos.each((_, e) => {
    //     const action = $(e).find('.card-link').eq(1).attr('onclick')
    //     const panUrl = action.match(/open\(\'(.*)\'\)/)[1]

    //     const title = $(e).find('h5.card-title').text()
    //     const panType = $(e).find('h5.card-title span').text()
    //     const name = title.replace(panType, '')

    //     const cover = $(e).find('img').attr('src')
    //     cards.push({
    //         vod_id: panUrl,
    //         vod_name: name,
    //         vod_pic: `${appConfig.site}${cover}`,
    //         vod_remarks: panType,
    //         ext: {
    //             name,
    //             url: panUrl,
    //         },
    //     })
    // })

    return jsonify({
        list: cards,
    })
}

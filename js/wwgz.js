const cheerio = createCheerio()

const UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1'

let appConfig = {
    ver: 20260224,
    title: '农民影视',
    site: 'https://vip.wwgz.cn:5200',
    tabs: [
        {
            name: '电影',
            ext: {
                id: '1',
            },
        },
        {
            name: '连续剧',
            ext: {
                id: '2',
            },
        },
        {
            name: '综艺',
            ext: {
                id: '3',
            },
        },
        {
            name: '动漫',
            ext: {
                id: '4',
            },
        },
        {
            name: '短剧',
            ext: {
                id: '26',
            },
        },
    ],
}

async function getConfig() {
    let config = appConfig
    return jsonify(config)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, id } = ext

    let url = `${appConfig.site}/vod-list-id-${id}-pg-${page}-order--by-time-class-0-year-0-letter--area--lang-.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.globalPicList > ul li').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const title = $(element).find('a').attr('title')
        const cover = $(element).find('img').attr('src')
        const subTitle = $(element).find('.sDes').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || '',
            ext: {
                url: appConfig.site + href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let lists = []
    const url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    // 從第一集取出 track list
    const href = $('.numList').first().find('li').first().find('a').attr('href')
    const firstEpUrl = appConfig.site + href

    const { data: epData } = await $fetch.get(firstEpUrl, {
        headers: {
            'User-Agent': UA,
        },
    })

    const mac_from = epData?.match(/mac_from\s*=\s*'([^']*)'/)[1]
    const mac_url = epData?.match(/mac_url\s*=\s*'([^']+)'/)[1]

    const from = mac_from.split('$$$')
    const urls = mac_url.split('$$$')

    for (let i = 0; i < from.length; i++) {
        let temp = {
            title: from[i],
            tracks: [],
        }
        let eps = urls[i].split('#')
        for (let j = 0; j < eps.length; j++) {
            let ep = eps[j].split('$')
            temp.tracks.push({
                name: from.length == 1 ? `${from[i]}-${ep[0]}` : ep[0],
                pan: '',
                ext: {
                    url: ep[1],
                },
            })
        }
        lists.push(temp)
    }

    return jsonify({
        list: lists,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = `https://api.nmvod.me:520/player/?url=${ext.url}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            Referer: appConfig.site + '/',
            'sec-fetch-site': 'cross-site',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-dest': 'iframe',
        },
    })

    const match = data.match(/var\s+config\s*=\s*(\{[\s\S]*?\})/)
    const configString = match?.[1]
    const playUrl = configString.match(/url":\s*"(.+)"/)?.[1]

    return jsonify({ urls: [playUrl], headers: [{ 'User-Agent': UA }] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/index.php?m=vod-search`
    if (page > 1) return jsonify({ list: [] })
    let body = `wd=${text}`

    const { data } = await $fetch.post(url, body, {
        headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    const $ = cheerio.load(data)

    $('#search_main ul li').each((_, element) => {
        const href = $(element).find('.pic a').attr('href')
        const title = $(element).find('.sTit').text()
        const cover = $(element).find('img').attr('data-src')
        const subTitle = $(element).find('.sStyle').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || '',
            ext: {
                url: appConfig.site + href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

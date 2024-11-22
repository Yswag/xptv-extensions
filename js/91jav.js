// 來自群友:夢
const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'

let appConfig = {
    ver: 1,
    title: '91Jav',
    // 91jav.fun
    site: 'https://041.bndmpsjx.com',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    let list = []
    let ignore = ['首页']
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }
    let classurl = `${appConfig.site}/index/getMvStyle/order/count`

    const { data } = await $fetch.get(classurl, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)

    let allClass = $('.pb-3.pb-e-lg-40 .col-6.col-sm-4.col-lg-3')
    allClass.each((_, e) => {
        const name = $(e).find('h4').text()
        const href = $(e).find('a').attr('href')
        const isIgnore = isIgnoreClassName(name)
        if (isIgnore) return

        list.push({
            name,
            ext: {
                typeurl: href,
            },
            ui: 1,
        })
    })

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, typeurl } = ext
    let url = `${appConfig.site}${typeurl}`

    if (page > 1) {
        url = `${appConfig.site}${typeurl}/sort/update/page/${page}`
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.pb-3.pb-e-lg-40 .col-6.col-sm-4.col-lg-3').each((_, element) => {
        const href = $(element).find('.title a').attr('href')
        const title = $(element).find('.title a').text()
        // const cover = $(element).find('.zximg').attr('z-image-loader-url')
        const subTitle = $(element).find('.label').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: '',
            vod_duration: subTitle,
            ext: {
                url: `${appConfig.site}${href}`,
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

    let playUrl = data.match(/var hlsUrl = "(.*?)";/)[1]

    tracks.push({
        name: '播放',
        pan: '',
        ext: {
            url: playUrl,
        },
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

    return jsonify({ urls: [url] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/search/index/keyword/${text}`

    if (page > 1) {
        url = `${appConfig.site}/search/index/keyword/${text}/page/${page}`
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.pb-3.pb-e-lg-40 .col-6.col-sm-4.col-lg-3').each((_, element) => {
        const href = $(element).find('.title a').attr('href')
        const title = $(element).find('.title a').text()
        const cover = appConfig.site + $(element).find('img').attr('src')
        const subTitle = $(element).find('.label').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: '',
            vod_duration: subTitle,
            ext: {
                url: `${appConfig.site}${href}`,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

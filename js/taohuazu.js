const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'

let appConfig = {
    ver: 1,
    title: '桃花族',
    // 40thz.com
    site: 'http://7340hsck.cc',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    let list = []

    try {
        const { data } = await $fetch.get(appConfig.site, {
            headers: {
                'User-Agent': UA,
            },
        })
        const $ = cheerio.load(data)

        let allClass = $('.stui-pannel__menu li')
        allClass.each((_, e) => {
            const text = $(e).find('a').text()
            const span = $(e).find('a span').text()
            const href = $(e).find('a').attr('href')

            list.push({
                name: text.replace(span, ''),
                ext: {
                    typeurl: href,
                },
                ui: 1,
            })
        })
    } catch (error) {
        $print(error)
    }

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, typeurl } = ext
    let url = `${appConfig.site}${typeurl}`.replace('.html', `-${page}.html`)

    try {
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)

        $('.stui-vodlist li').each((_, element) => {
            const href = $(element).find('.stui-vodlist__thumb').attr('href')
            const title = $(element).find('.stui-vodlist__thumb').attr('title')
            const cover = $(element).find('.stui-vodlist__thumb').attr('data-original')
            const duration = $(element).find('.pic-text').text()
            if (!href.startsWith('/vodplay')) return
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_duration: duration,
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        })
    } catch (error) {
        $print(error)
    }

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let url = ext.url

    try {
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)
        const script = $('script:contains(player_aaaa)').text()
        const json = argsify(script.replace('var player_aaaa=', ''))
        const playUrl = json.url

        tracks.push({
            name: '播放',
            pan: '',
            ext: {
                url: playUrl,
            },
        })
    } catch (error) {
        $print(error)
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
    let url = `${appConfig.site}/vodsearch/${text}----------${page}---.html`

    try {
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)

        $('.stui-vodlist li').each((_, element) => {
            const href = $(element).find('.stui-vodlist__thumb').attr('href')
            const title = $(element).find('.stui-vodlist__thumb').attr('title')
            const cover = $(element).find('.stui-vodlist__thumb').attr('data-original')
            const duration = $(element).find('.pic-text').text()
            if (!href.startsWith('/vodplay')) return
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_duration: duration,
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        })
    } catch (error) {
        $print(error)
    }

    return jsonify({
        list: cards,
    })
}

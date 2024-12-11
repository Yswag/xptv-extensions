const cheerio = createCheerio()

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'

let appConfig = {
    ver: 1,
    title: '花都',
    // abc.hdys.top
    site: 'https://hd.huaduys.org',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    $utils.toastError('搜索請間隔10秒')
    let list = []
    let ignore = ['首页', 'APP', 'PornDude']
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    try {
        const { data } = await $fetch.get(appConfig.site, {
            headers: {
                'User-Agent': UA,
            },
        })
        const $ = cheerio.load(data)

        let allClass = $('.stui-header__menu li')
        allClass.each((_, e) => {
            const text = $(e).find('a').text()
            const href = $(e).find('a').attr('href')
            const isIgnore = isIgnoreClassName(text)
            if (isIgnore) return

            list.push({
                name: text.trim(),
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
    const id = typeurl.match(/vodtype\/(\d+)\.html/)[1]
    let url = `${appConfig.site}/vodshow/${id}--------${page}---.html`

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
            const cover = $(element).find('.stui-vodlist__thumb img').attr('data-original')
            const duration = $(element).find('.pic-tag-b').text()
            const remark = $(element).find('.pic-tag-t').text()
            const pubdate = $(element).find('.stui-vodlist__detail span.text').text()
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: remark,
                vod_duration: duration,
                vod_pubdate: pubdate,
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
        const btn = $('.stui-pannel-box h5 a.btn')

        tracks.push({
            name: btn.text(),
            pan: '',
            ext: {
                url: `${appConfig.site}${btn.attr('href')}`,
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

        return jsonify({ urls: [playUrl] })
    } catch (error) {
        $print(error)
    }
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
            const cover = $(element).find('.stui-vodlist__thumb img').attr('data-original')
            const duration = $(element).find('.pic-tag-b').text()
            const remark = $(element).find('.pic-tag-t').text()
            const pubdate = $(element).find('.stui-vodlist__detail span.text').text()
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: remark,
                vod_duration: duration,
                vod_pubdate: pubdate,
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

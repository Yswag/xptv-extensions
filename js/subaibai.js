const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'

let appConfig = {
    ver: 1,
    title: '素白白',
    site: 'https://www.subaibaiys.com',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    let list = []
    let ignore = ['首页', '公告留言']
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    const { data } = await $fetch.get(appConfig.site, {
        headers: {
            'User-Agent': UA,
        },
    })

    let allClass = $html.elements(data, 'ul.navlist a')
    allClass.forEach((e) => {
        const name = $html.text(e, 'a')
        const href = $html.attr(e, 'a', 'href')
        const isIgnore = isIgnoreClassName(name)
        if (isIgnore) return

        list.push({
            name,
            ext: {
                url: href,
            },
        })
    })

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, url } = ext

    if (page > 1) {
        url += `/page/${page}`
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    let elem = $html.elements(data, '.bt_img.mi_ne_kd.mrb li')
    elem.forEach((element) => {
        const href = $html.attr(element, 'a', 'href')
        const title = $html.attr(element, 'img.thumb', 'alt')
        const cover = $html.attr(element, 'img.thumb', 'data-original')
        const subTitle = $html.text(element, '.jidi span')
        const hdinfo = $html.text(element, '.hdinfo.qb')
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || hdinfo,
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

    let playlist = $html.elements(data, '.paly_list_btn a')
    playlist.forEach((e) => {
        const name = $html.text(e, 'a')
        const href = $html.attr(e, 'a', 'href')
        tracks.push({
            name: name,
            pan: '',
            ext: {
                url: href,
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
    const url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    let iframe = $('iframe').filter((i, iframe) => $(iframe).attr('src').includes('Cloud'))
    if (0 < iframe.length) {
        console.log('method 1')

        const iframeHtml = (
            await $fetch.get($(iframe[0]).attr('src'), {
                headers: {
                    Referer: url,
                    'User-Agent': UA,
                },
            })
        ).data
        let code = iframeHtml
                .match(/var url = '(.*?)'/)[1]
                .split('')
                .reverse()
                .join(''),
            temp = ''
        for (let i = 0; i < code.length; i += 2) temp += String.fromCharCode(parseInt(code[i] + code[i + 1], 16))
        const playUrl = temp.substring(0, (temp.length - 7) / 2) + temp.substring((temp.length - 7) / 2 + 7)

        return { urls: [playUrl] }
    } else {
        console.log('method 2')

        let playUrl = 'error'

        const script = $('script')
        const js = script.filter((i, script) => $(script).text().includes('window.wp_nonce')).text() ?? ''
        const group = js.match(/(var.*)eval\((\w*\(\w*\))\)/)
        const md5 = CryptoJS
        const result = eval(group[1] + group[2])
        playUrl = result.match(/url:.*?['"](.*?)['"]/)[1]

        return jsonify({ urls: [playUrl] })
    }
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/page/${page}?s=${text}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.search_list li').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const title = $(element).find('img.thumb').attr('alt')
        const cover = $(element).find('img.thumb').attr('data-original')
        const subTitle = $(element).find('.jidi span').text()
        const hdinfo = $(element).find('.hdinfo .qb').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || hdinfo,
            ext: {
                url: href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

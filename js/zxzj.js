// tv demo test
// const { $html, argsify, jsonify, $fetch, $print, $cache } = require('../test/libs.js')

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'

const appConfig = {
    ver: 1,
    title: '在线之家',
    site: 'https://www.zxzja.com',
    tabs: [
        {
            name: '首页',
            ext: {
                id: 0,
                url: 'https://www.zxzja.com/',
            },
        },
        {
            name: '电影',
            ext: {
                id: 1,
                url: 'https://www.zxzja.com/list/1.html',
            },
        },
    ],
}

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    var cards = []
    let id = ext.id
    let page = ext.page || 1

    $print(`args: ${id} ${page}`)

    var url = 'https://www.zxzja.com/'
    if (id == 0 && page > 1) {
        return jsonify({
            list: cards,
        })
    }

    if (id > 0) {
        url = `https://www.zxzja.com/list/${id}.html`
        if (page > 1) {
            url = `https://www.zxzja.com/list/${id}-${page}.html`
        }
    }

    // 发送请求
    const { data } = await $fetch.get(url, {
        headers: {
            Referer: 'https://www.zxzja.com/',
            'User-Agent': UA,
        },
    })

    // 加载 HTML
    const elems = $html.elements(data, 'a.lazyload')
    elems.forEach((element) => {
        const href = $html.attr(element, 'a', 'href')
        const title = $html.attr(element, 'a', 'title')
        const cover = $html.attr(element, 'a', 'data-original')
        const subTitle = $html.text(element, '.text-right')

        if (href.startsWith('/detail/')) {
            cards.push({
                vod_id: href.replace(/.*?\/detail\/(.*).html/g, '$1'),
                vod_name: title,
                vod_pic: cover,
                vod_remarks: subTitle,
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        }
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    var tracks = []
    let url = ext.url

    // 发送请求
    const { data } = await $fetch.get(url, {
        headers: {
            Referer: 'https://www.zxzja.com/',
            'User-Agent': UA,
        },
    })

    // 加载 HTML
    const elems = $html.elements(data, '.stui-content__playlist > li > a')

    // 解析数据，例如提取标题
    elems.forEach((element) => {
        const href = $html.attr(element, 'a', 'href')
        const name = $html.text(element, 'a')
        if (href && name && name !== '合集') {
            tracks.push({
                name,
                pan: '',
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        }
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
    var plays = []
    let url = ext.url

    // 发送请求
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const html = data.match(/r player_.*?=(.*?)</)[1]
    const json = JSON.parse(html)

    const playurl = json.url
    const from = json.from
    if (json.encrypt == '1') {
        playurl = decodeURIComponent(url)
    } else if (json.encrypt == '2') {
        playurl = decodeURIComponent(Buffer.from(url, 'base64').toString('utf-8'))
    }
    $print(`playurl: ${playurl}`)
    if (playurl.indexOf('m3u8') >= 0 || playurl.indexOf('mp4') >= 0) {
        return jsonify({ urls: [playurl] })
    } else if (from.indexOf('line3') >= 0 || from.indexOf('line5') >= 0) {
        const { data } = await $fetch.get(playurl, {
            headers: {
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                Referer: 'https://www.zxzja.com/',
                'Sec-Ch-Ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"macOS"',
                'Sec-Fetch-Dest': 'iframe',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-site',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': UA,
            },
        })
        let resultv2 = data.match(/var result_v2 = {(.*?)};/)[1]
        let code = JSON.parse('{' + resultv2 + '}')
            .data.split('')
            .reverse()
        let temp = ''
        for (let i = 0x0; i < code.length; i = i + 0x2) {
            temp += String.fromCharCode(parseInt(code[i] + code[i + 0x1], 0x10))
        }
        const purl = temp.substring(0x0, (temp.length - 0x7) / 0x2) + temp.substring((temp.length - 0x7) / 0x2 + 0x7)
        $print('***在线之家purl =====>' + purl) // js_debug.log
        return jsonify({ urls: [purl] })
    }
    return jsonify({ urls: [] })
}

async function search(ext) {
    ext = argsify(ext)
    var cards = []

    let text = ext.text // 搜索文本
    let page = ext.page || 1

    return jsonify({
        list: cards,
    })
}

// module.exports = { getConfig, getCards, getTracks, getPlayinfo, search }

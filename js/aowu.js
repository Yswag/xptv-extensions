const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 20240413,
    title: 'aowu',
    site: 'https://www.aowu.tv',
    tabs: [
        {
            name: '新番',
            ext: {
                type: 32,
            },
        },
        {
            name: '番剧',
            ext: {
                type: 20,
            },
        },
        {
            name: '剧场',
            ext: {
                type: 33,
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
    let { type, page = 1 } = ext

    const url = 'https://www.aowu.tv/index.php/api/vod'
    const time = Math.round(new Date() / 1000)
    const key = md5('DS' + time + 'DCC147D11943AF75')
    const body = {
        type: type,
        class: '',
        area: '',
        lang: '',
        version: '',
        state: '',
        letter: '',
        page: page,
        time: time,
        key: key,
    }

    const { data } = await $fetch.post(url, body, {
        headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    const cardList = argsify(data).list
    cardList.forEach((e) => {
        let name = e.vod_name
        let pic = e.vod_pic
        let remarks = e.vod_remarks
        let id = e.vod_id
        cards.push({
            vod_id: id,
            vod_name: name,
            vod_pic: pic,
            vod_remarks: remarks,
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
    let list = []
    let id = ext.id
    let url = appConfig.site + `/play/${id}-1-1.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    let from = []
    $('.player-info .swiper-wrapper a').each((i, e) => {
        let name = $(e).text().trim()
        from.push(name)
    })

    $('.player-list-box .anthology-list-box').each((i, e) => {
        const play_from = from[i]
        let videos = $(e).find('li a')
        let tracks = []
        videos.each((i, e) => {
            const name = $(e).find('span').text()
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
    let purl = config.url
    if (config.encrypt == 2) purl = unescape(base64Decode(purl))
    const artPlayer = appConfig.site + `/player/?url=${purl}`
    const { data: artRes } = await $fetch.get(artPlayer, {
        headers: {
            'User-Agent': UA,
            Referer: url,
        },
    })

    if (artRes) {
        const $2 = cheerio.load(artRes)
        const playUrl = $2('script:contains(new Artplayer)')
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

function md5(text) {
    return CryptoJS.MD5(text).toString()
}

function base64Decode(text) {
    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(text))
}

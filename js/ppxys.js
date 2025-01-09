const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '皮皮蝦',
    site: 'http://ppxys.vip',
    tabs: [
        {
            name: '劇集',
            ext: {
                id: 1,
            },
        },
        {
            name: '電影',
            ext: {
                id: 2,
            },
        },
        {
            name: '動漫番劇',
            ext: {
                id: 3,
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
    let { id, page = 1 } = ext

    let url = `${appConfig.site}/s/${id}/page/${page}.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.main .module-items > a').each((_, element) => {
        const vodUrl = $(element).attr('href')
        const vodPic = $(element).find('.module-item-pic img').attr('data-original')
        const vodName = $(element).attr('title')
        const vodDiJiJi = $(element).find('.module-item-note').text()
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

async function getTracks(ext) {
    ext = argsify(ext)
    let list = []
    let url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    let tracks = []
    list = [
        {
            title: '默认分组',
            tracks,
        },
    ]

    $('.module-play-list-link').each((i, e) => {
        const name = $(e).find('span').text().trim()
        const href = $(e).attr('href')
        tracks.push({
            name: name,
            pan: '',
            ext: {
                url: `${appConfig.site}${href}`,
            },
        })
    })

    return jsonify({
        list: list,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = ext.url
    let parse = 'http://java.shijie.chat/player?url='

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    const player = $('script:contains(player_aaaa)').text().replace('var player_aaaa=', '')
    const json = JSON.parse(player)
    const playerUrl = json.url

    const parseRes = await $fetch.get(parse + unescape(base64Decode(playerUrl)), {
        headers: {
            'User-Agent': UA,
        },
    })
    let encryptedData = parseRes.data.split('Video: "')[1].split('",')[0]
    let palyUrl = argsify(aesDecode(encryptedData)).url

    return jsonify({ urls: [palyUrl] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/vodsearch.html?wd=${text}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.main .module-card-item').each((_, element) => {
        const vodUrl = $(element).find('.module-card-item-poster').attr('href')
        const vodPic = $(element).find('.module-item-pic img').attr('data-original')
        const vodName = $(element).find('.module-card-item-title').text().trim()
        const vodDiJiJi = $(element).find('.module-item-note').text()
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

function aesDecode(str) {
    let key = CryptoJS.enc.Utf8.parse('ASD010QNC636LJY9')
    let iv = CryptoJS.enc.Utf8.parse('C636LJY9ASD010QN')

    let decrypted = CryptoJS.AES.decrypt(str, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    })

    return decrypted.toString(CryptoJS.enc.Utf8)
}

function base64Decode(str) {
    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(str))
}

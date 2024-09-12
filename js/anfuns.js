const cheerio = require('cheerio')
const axios = require('axios')

// 測試時忽略證書驗證
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: 'anfuns',
    site: 'https://www.anfuns.org',
    tabs: [
        {
            name: '最近更新',
            ext: {
                id: 0,
            },
        },
        {
            name: '新旧番剧',
            ext: {
                id: 1,
            },
        },
        {
            name: '蓝光无修',
            ext: {
                id: 2,
            },
        },
        {
            name: '动漫剧场',
            ext: {
                id: 3,
            },
        },
        {
            name: '欧美动漫',
            ext: {
                id: 4,
            },
        },
    ],
}

function getConfig() {
    return appConfig
}

async function getCards(ext) {
    let cards = []
    let { id, page = 1 } = ext

    let url = `${appConfig.site}/type/${id}-${page}.html`
    if (id === 0) url = `${appConfig.site}/map.html`

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.hl-list-item').each((_, element) => {
        const vodUrl = $(element).find('.hl-item-thumb').attr('href') || $(element).find('.hl-item-wrap').attr('href')
        const vodPic = $(element).find('.hl-item-thumb').attr('data-original')
        const vodName = $(element).find('.hl-item-title').text()
        const vodDiJiJi = $(element).find('.remarks').text() || $(element).find('.hl-item-content .hl-text-subs').text().replace('/', '')
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

    return {
        list: cards,
    }
}

async function getTracks(ext) {
    let list = []
    let url = ext.url

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    let from = []
    $('.hl-plays-from a').each((i, e) => {
        let name = $(e).text().trim()
        from.push(name)
    })

    $('ul.hl-plays-list').each((i, e) => {
        const play_from = from[i]
        let videos = $(e).find('li a')
        let tracks = []
        videos.each((i, e) => {
            const name = $(e).text()
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

    return {
        list: list,
    }
}

async function getPlayinfo(ext) {
    const url = ext.url

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    const config = JSON.parse($('script:contains(player_)').html().replace('var player_aaaa=', ''))
    const artPlayer = appConfig.site + '/vapi/AIRA/art.php?url=' + config.url
    const { data: artRes } = await axios.get(artPlayer, {
        headers: {
            'User-Agent': UA,
            Referer: url,
        },
    })

    if (artRes) {
        const $ = cheerio.load(artRes)
        const playUrl = $('script:contains(var Config)')
            .html()
            .match(/url: '(.*)'/)[1]
        return { urls: [playUrl] }
    }

    return { urls: [] }
}

async function search(ext) {
    let cards = []

    let text = ext.text
    let page = ext.page || 1
    let url = `${appConfig.site}/search/page/${page}/wd/${text}.html`

    const { data } = await axios.get(url, {
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

    return {
        list: cards,
    }
}

module.exports = { getConfig, getCards, getTracks, getPlayinfo, search }

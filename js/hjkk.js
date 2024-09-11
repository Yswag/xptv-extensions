const cheerio = require('cheerio')
const axios = require('axios')

// 測試時忽略證書驗證
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '韓劇看看',
    site: 'https://www.hanjukankan.com',
    tabs: [
        {
            name: '韓劇',
            ext: {
                id: 1,
                url: 'https://www.hanjukankan.com/xvs@id@xatxbtxctxdtxetxftxgtxht@page@atbtct.html',
            },
        },
        {
            name: '韓影',
            ext: {
                id: 2,
                url: 'https://www.hanjukankan.com/xvs@id@xatxbtxctxdtxetxftxgtxht@page@atbtct.html',
            },
        },
        {
            name: '韓綜',
            ext: {
                id: 3,
                url: 'https://www.hanjukankan.com/xvs@id@xatxbtxctxdtxetxftxgtxht@page@atbtct.html',
            },
        },
    ],
}

function getConfig() {
    return appConfig
}

async function getCards(ext) {
    let cards = []
    let { id, page = 1, url } = ext

    url = url.replace('@id@', id).replace('@page@', page)

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.module-poster-item').each((_, element) => {
        const href = $(element).attr('href')
        const title = $(element).attr('title')
        const cover = $(element).find('.module-item-pic img').attr('data-original')
        const subTitle = $(element).find('.module-item-note').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: `${appConfig.site}${href}`,
            },
        })
    })

    return {
        list: cards,
    }
}

async function getTracks(ext) {
    let tracks = []
    let url = ext.url

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('#panel1 .module-play-list-link').each((_, e) => {
        const name = $(e).find('span').text()
        const href = $(e).attr('href')
        tracks.push({
            name: `${name}`,
            pan: '',
            ext: {
                url: `${appConfig.site}${href}`,
            },
        })
    })

    return {
        list: [
            {
                title: '默认分组',
                tracks,
            },
        ],
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
    let script = $('.player-box-main script').eq(0).text().replace('var player_aaaa=', '')
    let json = JSON.parse(script)
    let playUrl = json.url

    return { urls: [playUrl] }
}

async function search(ext) {
    let cards = []

    let text = ext.text
    let page = ext.page || 1
    let url = `${appConfig.site}/xvse${text}abcdefghig${page}klm.html`

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.module-card-item').each((_, element) => {
        const href = $(element).find('.module-card-item-poster').attr('href')
        const title = $(element).find('.module-card-item-title strong').text()
        const cover = $(element).find('.module-item-pic img').attr('data-original')
        const subTitle = $(element).find('.module-item-note').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: `${appConfig.site}${href}`,
            },
        })
    })

    return {
        list: cards,
    }
}

module.exports = { getConfig, getCards, getTracks, getPlayinfo, search }

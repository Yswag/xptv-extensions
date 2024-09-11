const cheerio = require('cheerio')
const axios = require('axios')

// 測試時忽略證書驗證
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '兩個BT',
    site: 'https://www.bttwo.me',
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

// async function getTabs() {
//     let url = appConfig.site
//     let tabs = []

//     const { data } = await axios.get(url, {
//         headers: {
//             'User-Agent': UA,
//         },
//     })

//     const $ = cheerio.load(data)

//     $('.sidebar .navbar-items li[role=group]').each((i, e) => {
//         const name = $(e).find('a').attr('title')
//         const href = $(e).find('a').attr('href')
//         tabs.push({
//             name,
//             ext: {
//                 id: i,
//                 url: `${appConfig.site}${href}`,
//             },
//         })
//     })

//     return tabs
// }

async function getCards(ext) {
    let cards = []
    let { id, page = 1, url } = ext

    url = url.replace('@id@', id).replace('@page@', page)

    // 发送请求
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    // 加载 HTML
    const $ = cheerio.load(data)

    // 解析数据，例如提取标题
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

    // 发送请求
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    // 加载 HTML
    const $ = cheerio.load(data)

    // 單集名稱重複會導致直接播放緩存的url，暫時加上劇名等修
    let show = $('.module-info-heading > h1').text()
    $('#panel1 .module-play-list-link').each((_, e) => {
        const name = $(e).find('span').text()
        const href = $(e).attr('href')
        tracks.push({
            name: `${show}-${name}`,
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

    // 发送请求
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

    let text = ext.text // 搜索文本
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

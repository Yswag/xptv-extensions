const cheerio = require('cheerio')
const axios = require('axios')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '麻豆社',
    site: 'https://madou.club',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return config
}

async function getTabs() {
    let list = []
    let ignore = ['首页', '其他', '热门标签', '筛选']
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    const { data } = await axios.get(appConfig.site, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)

    let allClass = $('.sitenav a')
    allClass.each((_, e) => {
        const name = $(e).text()
        const href = $(e).attr('href')
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
    let cards = []
    let { page = 1, url } = ext

    if (page > 1) {
        url = url + '/page/' + page
    }

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.excerpts-wrapper article').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const title = $(element).find('h2').text()
        const cover = $(element).find('img').attr('data-src')
        const subTitle = $(element).find('.post-view').text().trim()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: href,
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

    let w = $('.article-content iframe').attr('src')
    let dash = w.match(/^(https?:\/\/[^\/]+)/)[1]
    let dashResp = (await axios.get(w, { headers: { 'User-Agent': UA } })).data
    let $2 = cheerio.load(dashResp)
    let html2 = $2('body script').eq(5).text()
    let token = html2.match(/var token = "(.+)";/)[1]
    let m3u8 = html2.match(/var m3u8 = '(.+)';/)[1]

    let playUrl = dash + m3u8 + '?token=' + token
    tracks.push({
        name: '播放',
        pan: '',
        ext: {
            url: playUrl,
        },
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

    return { urls: [url] }
}

async function search(ext) {
    let cards = []

    let text = ext.text
    let page = ext.page || 1
    let url = appConfig.site + `/page/${page}?s=${text}`

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.excerpts-wrapper article').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const title = $(element).find('h2').text()
        const cover = $(element).find('img').attr('data-src')
        const subTitle = $(element).find('.post-view').text().trim()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: href,
            },
        })
    })

    return {
        list: cards,
    }
}

module.exports = { getConfig, getCards, getTracks, getPlayinfo, search }

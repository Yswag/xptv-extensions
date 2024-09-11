const cheerio = require('cheerio')
const fs = require('fs')
const os = require('os')
const axios = require('axios')

// 測試時忽略證書驗證
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

let cachesPath = `${os.homedir()}/Documents/caches`

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'

let appConfig = {
    ver: 1,
    title: '4k-av',
    site: 'https://4k-av.com',
    tabs: [
        {
            name: '首頁',
            ext: {
                id: 0,
                url: 'https://4k-av.com',
            },
        },
        {
            name: '電影',
            ext: {
                id: 1,
                url: 'https://4k-av.com/movie',
            },
        },
        {
            name: '電視劇',
            ext: {
                id: 2,
                url: 'https://4k-av.com/tv',
            },
        },
    ],
}

function getConfig() {
    return appConfig
}

async function getCards(ext) {
    // 頁數寫入cache
    let jsonPath = `${cachesPath}/4kav-lastPage.json`
    if (!fs.existsSync(jsonPath)) {
        const lastPage = {
            0: 1,
            1: 1,
            2: 1,
        }
        const jsonData = JSON.stringify(lastPage, null, 2)

        fs.writeFileSync(jsonPath, jsonData)
    }
    let lastPage = JSON.parse(fs.readFileSync(jsonPath))

    let cards = []
    let { id, page = 1, url } = ext

    if (page > 1) {
        url += `/page-${lastPage[id] - page + 1}.html`
    }

    // 发送请求
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    // 加载 HTML
    const $ = cheerio.load(data)

    // 解析数据，例如提取标题
    $('#MainContent_newestlist .virow').each((_, element) => {
        let item = $(element).find('.NTMitem')
        item.each((_, element) => {
            const href = $(element).find('.title a').attr('href')
            const title = $(element).find('.title h2').text()
            const cover = $(element).find('.poster img').attr('src')
            const subTitle = $(element).find('label[title=分辨率]').text().split('/')[0]
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
    })

    // get lastpage
    if (page == 1) {
        const pageNumber = $('#MainContent_header_nav .page-number').text()
        const num = pageNumber.split('/')[1]
        lastPage[id] = num
        const jsonData = JSON.stringify(lastPage, null, 2)
        fs.writeFileSync(jsonPath, jsonData)
    }

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

    // 檢查是不是多集
    let isTV = $('#rtlist li').length > 0
    if (isTV) {
        let playlist = $('#rtlist li')
        playlist.each((_, element) => {
            let name = $(element).find('span').text()
            let url = $(element).find('img').attr('src').replace('screenshot.jpg', '')
            tracks.push({
                name: name,
                pan: '',
                ext: {
                    url,
                },
            })
        })
    } else {
        tracks.push({
            name: '播放',
            pan: '',
            ext: {
                url,
            },
        })
    }

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
    var plays = []
    let url = ext.url.replace('www.', '')

    // 发送请求
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    let playUrl = $('#MainContent_videowindow video source').attr('src')
    // console.log(playUrl)

    return { urls: [playUrl] }
}

async function search(ext) {
    let cards = []

    let text = ext.text // 搜索文本
    // 應該不需要翻頁吧
    // let page = ext.page || 1
    let url = appConfig.site + `/s?q=${text}`

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('#MainContent_newestlist .virow').each((_, element) => {
        let item = $(element).find('.NTMitem')
        item.each((_, element) => {
            const href = $(element).find('.title a').attr('href')
            const title = $(element).find('.title h2').text()
            const cover = $(element).find('.poster img').attr('src')
            const subTitle = $(element).find('label[title=分辨率]').text().split('/')[0]
            cards.push({
                vod_id: href,
                vod_name: title.split('/')[0].trim(),
                vod_pic: cover,
                vod_remarks: subTitle,
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        })
    })

    return {
        list: cards,
    }
}

module.exports = { getConfig, getCards, getTracks, getPlayinfo, search }

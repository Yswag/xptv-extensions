// tv

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

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    // 頁數寫入cache
    var lastPage = {
        0: 1,
        1: 1,
        2: 1,
    }
    let val = $cache.get('av')
    if (val) {
        lastPage = JSON.parse(val)
    }

    let cards = []
    let { id, page = 1, url } = ext

    if (page > 1) {
        url += `/page-${lastPage[id] - page + 1}.html`
    }

    $print(`url: ${url}`)

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const elems = $html.elements(data, '#MainContent_newestlist .virow .NTMitem')
    elems.forEach((element) => {
        const href = $html.attr(element, '.title a', 'href')
        const title = $html.text(element, '.title h2')
        const cover = $html.attr(element, '.poster img', 'src')
        const subTitle = $html.text(element, 'label[title=分辨率]').split('/')[0]
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

    // get lastpage
    if (page == 1) {
        const pageNumber = $html.text(data, '#MainContent_header_nav .page-number')
        const num = pageNumber.split('/')[1]
        lastPage[id] = num
        const jsonData = JSON.stringify(lastPage, null, 2)
        $cache.set('av', jsonData)
    }

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

    // 檢查是不是多集
    let playlist = $html.elements(data, '#rtlist li')
    if (playlist.length > 0) {
        playlist.forEach((element) => {
            let name = $html.text(element, 'span')
            let url = $html.attr(element, 'img', 'src').replace('screenshot.jpg', '')
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
    let url = ext.url.replace('www.', '')

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    let playUrl = $html.attr(data, '#MainContent_videowindow video source', 'src')

    return jsonify({ urls: [playUrl] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let url = appConfig.site + `/s?q=${text}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const elems = $html.elements(data, '#MainContent_newestlist .virow .NTMitem')
    elems.forEach((element) => {
        const href = $html.attr(element, '.title a', 'href')
        const title = $html.text(element, '.title h2')
        const cover = $html.attr(element, '.poster img', 'src')
        const subTitle = $html.text(element, 'label[title=分辨率]').split('/')[0]
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

    return jsonify({
        list: cards,
    })
}

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

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { id, page = 1, url } = ext

    url = url.replace('@id@', id).replace('@page@', page)

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const elems = $html.elements(data, '.module-poster-item')
    elems.forEach((element) => {
        const href = $html.attr(element, 'a', 'href')
        const title = $html.attr(element, 'a', 'title')
        const cover = $html.attr(element, '.module-item-pic img', 'data-original')
        const subTitle = $html.text(element, '.module-item-note')
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

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const elems = $html.elements(data, '#panel1 .module-play-list-link')
    elems.forEach((e) => {
        const name = $html.text(e, 'span')
        const href = $html.attr(e, 'a', 'href')
        tracks.push({
            name: name,
            pan: '',
            ext: {
                url: `${appConfig.site}${href}`,
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

    const html = data.match(/r player_.*?=(.*?)</)[1]
    const json = JSON.parse(html)
    const playUrl = json.url

    return jsonify({ urls: [playUrl] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/xvse${text}abcdefghig${page}klm.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const elems = $html.elements(data, '.module-card-item')
    elems.forEach((element) => {
        const href = $html.attr(element, '.module-card-item-poster', 'href')
        const title = $html.text(element, '.module-card-item-title strong')
        const cover = $html.attr(element, '.module-item-pic img', 'data-original')
        const subTitle = $html.text(element, '.module-item-note')
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

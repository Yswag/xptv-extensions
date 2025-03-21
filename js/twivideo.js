const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
const config = argsify($config_str)
const cheerio = createCheerio()

let appConfig = {
    ver: 20250321,
    title: 'twivideo',
    site: 'https://twivideo.net/',
    tabs: [
        {
            name: '新着DL',
            ext: {
                type: '0',
                order: 'post_date',
                ty: 'p4',
            },
        },
        {
            name: 'ランキング (24時間)',
            ext: {
                type: 'ranking',
                order: '24',
                ty: 'p6',
            },
        },
        {
            name: 'ランキング (3日間)',
            ext: {
                type: 'ranking',
                order: '72',
                ty: 'p6',
            },
        },
        {
            name: 'ランキング (1週間)',
            ext: {
                type: 'ranking',
                order: '168',
                ty: 'p6',
            },
        },
        {
            name: '急上昇',
            ext: {
                type: 'trending',
                order: 'r_count',
                ty: 'p7',
            },
        },
        {
            name: '高評価',
            ext: {
                type: 'likeranking',
                order: '24',
                ty: 'p6',
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
    let { type, order, ty, page = 1 } = ext

    try {
        const url = `${appConfig.site}/templates/view_lists.php`

        let offset = (page - 1) * 50
        const { data } = await $fetch.post(
            url,
            {
                offset: offset,
                limit: 50,
                tag: 'null',
                type: type,
                order: order,
                le: 1000,
                ty: ty,
                offset_int: offset,
            },
            {
                headers: {
                    'User-Agent': UA,
                    Referer: appConfig.site + '/',
                },
            }
        )

        const $ = cheerio.load(data)

        let list = $('div.art_li')

        list.each((_, e) => {
            let img = $(e).find('.item_image img').attr('src')
            let url = $(e).find('.item_link').attr('href')
            cards.push({
                vod_id: url,
                vod_name: $(e).find('.item_link').attr('data-id'),
                vod_pic: img,
                // vod_duration: e.uname,
                ext: {
                    id: url,
                },
            })
        })

        $print(jsonify(cards))

        return jsonify({
            list: cards,
        })
    } catch (error) {
        $print(error)
    }
}

async function getTracks(ext) {
    ext = argsify(ext)

    let id = ext.id
    let tracks = [
        {
            name: '播放',
            pan: '',
            ext: {
                id,
            },
        },
    ]

    return jsonify({
        list: [
            {
                title: '默认分组',
                tracks: tracks,
            },
        ],
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let { id } = ext

    return jsonify({ urls: [id], headers: [{ 'User-Agent': UA }] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `${appConfig.site}/templates/ajax_twitteroauth_v2.php`

    const { data } = await $fetch.post(
        url,
        {
            url: text,
        },
        {
            headers: {
                'User-Agent': UA,
                Referer: appConfig.site + '/',
            },
        }
    )

    const $ = cheerio.load(data)

    cards.push({
        vod_id: $(e).find('.item_link').attr('href'),
        vod_name: $(e).find('.item_link').attr('data-id'),
        vod_pic: $('img').attr('src'),
        ext: {
            id: $(e).find('.item_link').attr('href'),
        },
    })

    return jsonify({
        list: cards,
    })
}

const cheerio = createCheerio();
const CryptoJS = createCryptoJS();

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let appConfig = {
    ver: 20260224,
    title: 'hkdoll',
    site: 'https://hongkongdollvideo.com',
};

async function getConfig() {
    let config = appConfig;
    config.tabs = await getTabs();
    return jsonify(config)
}

async function getTabs() {
    let list = [];
    let ignore = ['亚洲成人视频'];
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    const { data } = await $fetch.get(appConfig.site, {
        headers: {
            'User-Agent': UA,
        },
    });
    const $ = cheerio.load(data);

    let allClass = $('.scrollbar a');
    allClass.each((_, e) => {
        const name = $(e).text();
        const href = $(e).attr('href');
        const isIgnore = isIgnoreClassName(name);
        if (isIgnore) return

        list.push({
            name,
            ext: {
                url: encodeURI(href),
            },
        });
    });

    return list
}

async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    let { page = 1, url } = ext;

    if (page > 1) {
        url = url + page + '.html';
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    });

    const $ = cheerio.load(data);

    $('.video-item').each((_, element) => {
        const href = $(element).find('.thumb a').attr('href');
        const title = $(element).find('.thumb a').attr('title');
        const cover = $(element).find('.thumb img').attr('data-src');
        const subTitle = $(element).find('.duratio').text().trim();
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: href,
            },
        });
    });

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext);
    let tracks = [];
    let url = ext.url;

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    });

    try {
        const $ = cheerio.load(data);
        const param = $('script:contains(__PAGE__PARAMS__)').text().split('var __PAGE__PARAMS__="')[1].split('"')[0];

        let pageLoader = decode(param);
        let embedUrl = pageLoader.player.embedUrl;
        let playUrl = getPlayUrl(embedUrl);

        tracks.push({
            name: '播放',
            pan: '',
            ext: {
                url: playUrl,
            },
        });
    } catch (error) {
        $print(error);
    }

    function decode(_0x558b38) {
        let key = _0x558b38.slice(-32);
        let encrypedConf = _0x558b38.substring(0, _0x558b38.length - 32);
        let pageConfig = JSON.parse(xorDec(encrypedConf, key));

        return pageConfig
    }
    function xorDec(_0x3b697f, _0x37f8e7) {
        let _0x2bec78 = '';
        const _0x1f8156 = _0x37f8e7.length;
        for (let _0x4b08c8 = 0; _0x4b08c8 < _0x3b697f.length; _0x4b08c8 += 2) {
            const _0x312f0e = _0x3b697f.substr(_0x4b08c8, 2),
                _0x33eb88 = String.fromCharCode(parseInt(_0x312f0e, 16)),
                _0x323ef5 = _0x37f8e7[(_0x4b08c8 / 2) % _0x1f8156];
            _0x2bec78 += String.fromCharCode(_0x33eb88.charCodeAt(0) ^ _0x323ef5.charCodeAt(0));
        }
        return _0x2bec78
    }

    function getPlayUrl(embedUrl) {
        let _0x1e8df = embedUrl.split('?token=')[1];
        let _0x1df1c5 = _0x1e8df.slice(-10);
        let _0x2c272d = md5(_0x1df1c5).slice(8, 24).split('').reverse().join('');
        let _0x32366e = _0x1e8df.slice(0, -10);

        var _0x4951c4 = {};
        let _0x4049bd = _0x535536(_0x32366e, _0x2c272d);
        _0x4951c4 = JSON.parse(_0x4049bd);
        return _0x4951c4.stream
    }
    function md5(_0x1e8df) {
        return CryptoJS.MD5(_0x1e8df).toString()
    }
    function _0x535536(_0x12d383, _0x391fc7) {
        let _0x8ccc83 = '';
        let _0x451061 = _0x391fc7.length;
        for (let _0x373381 = 0; _0x373381 < _0x12d383.length; _0x373381 += 2) {
            let _0x2de3e5 = (_0x373381 / 2) % _0x451061;
            let _0x386dd5 = parseInt(_0x12d383[_0x373381] + _0x12d383[_0x373381 + 1], 16);
            _0x8ccc83 += String.fromCharCode(_0x386dd5 ^ _0x391fc7.charCodeAt(_0x2de3e5));
        }
        return _0x8ccc83
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
    ext = argsify(ext);
    const url = ext.url;
    const headers = {
        'User-Agent': UA,
        Referer: appConfig.site + '/',
    };

    return jsonify({ urls: [url], headers: [headers] })
}

async function search(ext) {
    ext = argsify(ext);
    let cards = [];

    let text = encodeURIComponent(ext.text);
    let page = ext.page || 1;
    let url = `${appConfig.site}/search/${text}/${page}.html`;

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    });

    const $ = cheerio.load(data);

    $('.video-item').each((_, element) => {
        const href = $(element).find('.thumb a').attr('href');
        const title = $(element).find('.thumb a').attr('title');
        const cover = $(element).find('.thumb img').attr('data-src');
        const subTitle = $(element).find('.duratio').text().trim();
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: href,
            },
        });
    });

    return jsonify({
        list: cards,
    })
}


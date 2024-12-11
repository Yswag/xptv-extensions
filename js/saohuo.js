const CryptoJS = createCryptoJS()
const cheerio = createCheerio()

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
}

let appConfig = {
  ver: 1,
  title: '燒火電影',
  site: 'https://saohuo.tv',
  tabs: [
    {
      name: '電影',
      ext: {
        id: 1,
      },
    },
    {
      name: '電視劇',
      ext: {
        id: 2,
      },
    },
    {
      name: '動漫',
      ext: {
        id: 4,
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
  const url = `${appConfig.site}/list/${id}-${page}.html`

  const { data } = await $fetch.get(url, {
    headers: headers,
  })

  let elems = $html.elements(data, 'ul.v_list div.v_img')
  elems.forEach((element) => {
    const href = $html.attr(element, 'a', 'href')
    const title = $html.attr(element, 'a', 'title')
    const cover = $html.attr(element, 'img', 'data-original')
    const subTitle = $html.text(element, '.v_note')
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
  let list = []
  let url = ext.url

  const { data } = await $fetch.get(url, {
    headers: headers,
  })

  const $ = cheerio.load(data)

  let play_from = []
  $('ul.from_list li').each((_, e) => {
    play_from.push($(e).text().trim())
  })

  $('#play_link li').each((i, e) => {
    const from = play_from[i]
    const eps = $(e).find('a')
    let temp = []
    eps.each((_, e) => {
      const name = $(e).text()
      const href = $(e).attr('href')
      temp.push({
        name: `${name}`,
        pan: '',
        ext: {
          url: `${appConfig.site}${href}`,
        },
      })
    })
    temp.sort((a, b) => {
      return a.name.split('-')[1] - b.name.split('-')[1]
    })
    list.push({
      title: from,
      tracks: temp,
    })
  })

  return jsonify({
    list: list,
  })
}

async function getPlayinfo(ext) {
  ext = argsify(ext)
  const url = ext.url

  const { data } = await $fetch.get(url, {
    headers: headers,
  })

  if (data) {
    const $ = cheerio.load(data)
    const iframeUrl = $('iframe').attr('src')
    const apiUrl = iframeUrl.match(/^(https?:\/\/[^\/]+)/)[1] + '/api.php'

    const resp = await $fetch.get(iframeUrl, {
      headers: headers,
    })
    if (resp.data) {
      const $ = cheerio.load(resp.data)
      const script = $('body script').text()
      const url = script.match(/var url = "(.*)"/)[1]
      const t = script.match(/var t = "(.*)"/)[1]
      const key = script.match(/var key = "(.*)"/)[1]
      const params = {
        url: url,
        t: t,
        key: key,
        act: 0,
        play: 1,
      }

      const presp = await $fetch.post(apiUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': headers['User-Agent'],
          Referer: iframeUrl,
        },
      })

      const result = JSON.parse(presp.data)

      let playUrl = /http/.test(result.url)
        ? result.url
        : iframeUrl.match(/^(https?:\/\/[^\/]+)/)[1] + result.url
      return jsonify({ urls: [playUrl] })
    }
  }
}

async function search(ext) {
  ext = argsify(ext)
  let cards = []
  const ocrApi = 'https://api.nn.ci/ocr/b64/json'
  let cookie = 'PHPSESSID=' + generatePHPSESSID()

  let text = encodeURIComponent(ext.text)
  let page = ext.page || 1
  if (page > 1) {
    return jsonify({
      list: cards,
    })
  }

  let validate = appConfig.site + '/include/vdimgck.php'
  let url =
    appConfig.site +
    '/search.php?scheckAC=check&page=&searchtype=&order=&tid=&area=&year=&letter=&yuyan=&state=&money=&ver=&jq='

  let img = await $fetch.download(validate, {
    headers: {
      'User-Agent': headers['User-Agent'],
      cookie: cookie,
    },
  })

  function binaryStringToBase64(binaryString) {
    const byteArray = []
    for (let i = 0; i < binaryString.length; i += 8) {
      const byte = binaryString.slice(i, i + 8)
      byteArray.push(parseInt(byte, 2)) // convert 8 bits to a byte
    }

    const uint8Array = new Uint8Array(byteArray)
    const wordArray = CryptoJS.lib.WordArray.create(uint8Array)
    return CryptoJS.enc.Base64.stringify(wordArray)
  }

  let b64 = binaryStringToBase64(img.data)

  let ocrRes = await $fetch.post(ocrApi, b64, {
    headers: {
      'User-Agent': headers['User-Agent'],
      cookie: cookie,
    },
  })
  let vd = argsify(ocrRes.data).result

  let searchRes = await $fetch.post(
    url,
    `validate=${vd.toUpperCase()}&searchword=${text}`,
    {
      headers: {
        'user-agent': headers['User-Agent'],
        cookie: cookie,
        'content-type': 'application/x-www-form-urlencoded',
      },
    }
  )
  let html = searchRes.data

  const $ = cheerio.load(html)

  $('ul.v_list div.v_img').each((_, element) => {
    const href = $(element).find('a').attr('href')
    const title = $(element).find('a').attr('title')
    const cover = $(element).find('img').attr('data-original')
    const subTitle = $(element).find('.v_note').text()
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

function generatePHPSESSID() {
  const characters =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const length = 26
  let sessionId = ''

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    sessionId += characters[randomIndex]
  }

  return sessionId
}
